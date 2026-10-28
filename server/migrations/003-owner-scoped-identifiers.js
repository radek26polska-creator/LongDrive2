const run = (db, sql) => new Promise((resolve, reject) => {
  db.run(sql, (error) => error ? reject(error) : resolve());
});

const get = (db, sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (error, row) => error ? reject(error) : resolve(row));
});

const migrate = async (db) => {
  const alreadyApplied = await get(
    db,
    'SELECT version FROM schema_migrations WHERE version = ?',
    ['003-owner-scoped-identifiers']
  );
  if (alreadyApplied) return;

  await run(db, 'PRAGMA foreign_keys = OFF');
  await run(db, 'BEGIN IMMEDIATE TRANSACTION');
  try {
    await run(db, `
      CREATE TABLE vehicles_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        make TEXT NOT NULL,
        model TEXT NOT NULL,
        registrationNumber TEXT NOT NULL,
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
    await run(db, `
      INSERT INTO vehicles_new (
        id, make, model, registrationNumber, year, mileage, fuelLevel,
        tankSize, fuelConsumption, status, vehicleType, fuelType,
        engineCapacity, bodyType, createdAt, updatedAt, owner_user_id
      )
      SELECT
        id, make, model, registrationNumber, year, mileage, fuelLevel,
        tankSize, fuelConsumption, status, vehicleType, fuelType,
        engineCapacity, bodyType, createdAt, updatedAt, owner_user_id
      FROM vehicles
    `);
    await run(db, 'DROP TABLE vehicles');
    await run(db, 'ALTER TABLE vehicles_new RENAME TO vehicles');
    await run(
      db,
      'CREATE UNIQUE INDEX vehicles_owner_registration_unique ON vehicles(owner_user_id, registrationNumber)'
    );
    await run(db, 'CREATE INDEX idx_vehicles_owner_user_id ON vehicles(owner_user_id)');

    await run(db, `
      CREATE TABLE drivers_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        firstName TEXT NOT NULL,
        lastName TEXT NOT NULL,
        licenseNumber TEXT,
        licenseExpiry TEXT,
        phone TEXT,
        email TEXT,
        status TEXT DEFAULT 'active',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        owner_user_id INTEGER REFERENCES users(id)
      )
    `);
    await run(db, `
      INSERT INTO drivers_new (
        id, firstName, lastName, licenseNumber, licenseExpiry, phone,
        email, status, createdAt, owner_user_id
      )
      SELECT
        id, firstName, lastName, licenseNumber, licenseExpiry, phone,
        email, status, createdAt, owner_user_id
      FROM drivers
    `);
    await run(db, 'DROP TABLE drivers');
    await run(db, 'ALTER TABLE drivers_new RENAME TO drivers');
    await run(
      db,
      'CREATE UNIQUE INDEX drivers_owner_license_unique ON drivers(owner_user_id, licenseNumber)'
    );
    await run(db, 'CREATE INDEX idx_drivers_owner_user_id ON drivers(owner_user_id)');

    await run(
      db,
      "INSERT INTO schema_migrations (version) VALUES ('003-owner-scoped-identifiers')"
    );
    const violations = await new Promise((resolve, reject) => {
      db.all('PRAGMA foreign_key_check', (error, rows) => {
        if (error) reject(error);
        else resolve(rows);
      });
    });
    if (violations.length) {
      throw new Error('Owner identifier migration produced foreign-key violations.');
    }
    await run(db, 'COMMIT');
  } catch (error) {
    await run(db, 'ROLLBACK').catch((rollbackError) => {
      console.error('Nie udało się wycofać migracji unikalności danych użytkownika:', rollbackError);
    });
    throw error;
  } finally {
    await run(db, 'PRAGMA foreign_keys = ON');
  }
};

module.exports = { migrate };
