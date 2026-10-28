const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { after, test } = require('node:test');
const sqlite3 = require('sqlite3').verbose();
const { migrate } = require('../migrations/003-owner-scoped-identifiers');

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'longdrive-owner-identifiers-'));
const databasePath = path.join(directory, 'test.db');
const database = new sqlite3.Database(databasePath);

const run = (sql, params = []) => new Promise((resolve, reject) => {
  database.run(sql, params, function(error) {
    if (error) reject(error);
    else resolve(this);
  });
});

const get = (sql, params = []) => new Promise((resolve, reject) => {
  database.get(sql, params, (error, row) => error ? reject(error) : resolve(row));
});

const all = (sql) => new Promise((resolve, reject) => {
  database.all(sql, (error, rows) => error ? reject(error) : resolve(rows));
});

test('migration preserves existing fleet data and scopes unique identifiers to each account', async () => {
  await run('PRAGMA foreign_keys = ON');
  await run('CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT NOT NULL)');
  await run(`
    CREATE TABLE vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      make TEXT NOT NULL,
      model TEXT NOT NULL,
      registrationNumber TEXT UNIQUE NOT NULL,
      year INTEGER,
      mileage INTEGER DEFAULT 0,
      fuelLevel REAL DEFAULT 0,
      tankSize REAL DEFAULT 50,
      fuelConsumption REAL DEFAULT 7.5,
      status TEXT DEFAULT 'available',
      vehicleType TEXT,
      fuelType TEXT,
      engineCapacity INTEGER,
      bodyType TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      owner_user_id INTEGER REFERENCES users(id)
    )
  `);
  await run(`
    CREATE TABLE drivers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      firstName TEXT NOT NULL,
      lastName TEXT NOT NULL,
      licenseNumber TEXT UNIQUE,
      licenseExpiry TEXT,
      phone TEXT,
      email TEXT,
      status TEXT DEFAULT 'active',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      owner_user_id INTEGER REFERENCES users(id)
    )
  `);
  await run(`
    CREATE TABLE trips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicleId INTEGER REFERENCES vehicles(id),
      driverId INTEGER REFERENCES drivers(id),
      owner_user_id INTEGER REFERENCES users(id)
    )
  `);
  await run('CREATE TABLE schema_migrations (version TEXT PRIMARY KEY)');
  await run("INSERT INTO schema_migrations (version) VALUES ('001-user-ownership'), ('002-single-active-session')");
  await run("INSERT INTO users (id, email) VALUES (1, 'a@example.test'), (2, 'b@example.test')");
  await run(`
    INSERT INTO vehicles (id, make, model, registrationNumber, owner_user_id)
    VALUES (10, 'Make', 'Model', 'SAME-PLATE', 1)
  `);
  await run(`
    INSERT INTO drivers (id, firstName, lastName, licenseNumber, owner_user_id)
    VALUES (20, 'Driver', 'One', 'SAME-LICENSE', 1)
  `);
  await run('INSERT INTO trips (id, vehicleId, driverId, owner_user_id) VALUES (30, 10, 20, 1)');

  await migrate(database);

  assert.deepEqual(await get(
    `SELECT v.id, v.registrationNumber, v.owner_user_id, t.driverId
     FROM vehicles v JOIN trips t ON t.vehicleId = v.id WHERE v.id = 10`
  ), { id: 10, registrationNumber: 'SAME-PLATE', owner_user_id: 1, driverId: 20 });

  const secondOwnerVehicle = await run(`
    INSERT INTO vehicles (make, model, registrationNumber, owner_user_id)
    VALUES ('Other', 'Model', 'SAME-PLATE', 2)
  `);
  const secondOwnerDriver = await run(`
    INSERT INTO drivers (firstName, lastName, licenseNumber, owner_user_id)
    VALUES ('Other', 'Driver', 'SAME-LICENSE', 2)
  `);
  assert.ok(secondOwnerVehicle.lastID > 10);
  assert.ok(secondOwnerDriver.lastID > 20);
  await assert.rejects(
    run(`INSERT INTO vehicles (make, model, registrationNumber, owner_user_id)
         VALUES ('Duplicate', 'Model', 'SAME-PLATE', 1)`),
    /UNIQUE constraint failed/
  );
  await assert.rejects(
    run(`INSERT INTO drivers (firstName, lastName, licenseNumber, owner_user_id)
         VALUES ('Duplicate', 'Driver', 'SAME-LICENSE', 1)`),
    /UNIQUE constraint failed/
  );
  assert.deepEqual(await all('PRAGMA foreign_key_check'), []);
  assert.equal((await get(
    'SELECT version FROM schema_migrations WHERE version = ?',
    ['003-owner-scoped-identifiers']
  )).version, '003-owner-scoped-identifiers');
});

after(() => new Promise((resolve, reject) => {
  database.close((error) => {
    if (error) reject(error);
    else {
      fs.rmSync(directory, { recursive: true, force: true });
      resolve();
    }
  });
}));
