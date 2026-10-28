if (process.env.DATABASE_URL) {
  module.exports = require('./postgresDatabase');
} else {
if (process.env.NODE_ENV === 'production' &&
    process.env.LONGDRIVE_ALLOW_SQLITE_TESTS !== 'true') {
  throw new Error('DATABASE_URL is required for the LongDrive production deployment.');
}

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

const dbPath = path.resolve(process.env.DATABASE_PATH || path.join(__dirname, 'longdrive.db'));
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new sqlite3.Database(dbPath);
const initializationTasks = [];

const getAsync = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (error, row) => {
    if (error) reject(error);
    else resolve(row);
  });
});

const runAsync = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function(error) {
    if (error) reject(error);
    else resolve(this);
  });
});

const allAsync = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (error, rows) => {
    if (error) reject(error);
    else resolve(rows);
  });
});

// Włączanie wsparcia dla kluczy obcych
db.run('PRAGMA foreign_keys = ON');

// Inicjalizacja tabel
db.serialize(() => {
  // Tabela użytkowników
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      phone TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  if (process.env.LONGDRIVE_RUNTIME === 'windows') {
    db.run(`
      CREATE TABLE IF NOT EXISTS runtime_security (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        bootstrap_consumed INTEGER NOT NULL DEFAULT 0
      )
    `);
    initializationTasks.push(runAsync(
      'INSERT OR IGNORE INTO runtime_security (id, bootstrap_consumed) VALUES (1, 0)'
    ));
  }

  // Tabela pojazdów
  db.run(`
    CREATE TABLE IF NOT EXISTS vehicles (
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
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabela kierowców
  db.run(`
    CREATE TABLE IF NOT EXISTS drivers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      firstName TEXT NOT NULL,
      lastName TEXT NOT NULL,
      licenseNumber TEXT,
      licenseExpiry TEXT,
      phone TEXT,
      email TEXT,
      status TEXT DEFAULT 'active',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabela tras - z WSZYSTKIMI potrzebnymi kolumnami
  db.run(`
    CREATE TABLE IF NOT EXISTS trips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicleId INTEGER,
      driverId INTEGER,
      startTime DATETIME,
      endTime DATETIME,
      startOdometer INTEGER DEFAULT 0,
      endOdometer INTEGER DEFAULT 0,
      startLocation TEXT,
      endLocation TEXT,
      purpose TEXT,
      status TEXT DEFAULT 'planned',
      startFuel REAL DEFAULT 0,
      endFuel REAL DEFAULT 0,
      fuelUsed REAL DEFAULT 0,
      distance INTEGER DEFAULT 0,
      fuelAdded REAL DEFAULT 0,
      fuelCost REAL DEFAULT 0,
      fuelReceiptNumber TEXT,
      fuelStation TEXT,
      notes TEXT,
      orderedBy TEXT,
      cardNumber TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vehicleId) REFERENCES vehicles(id),
      FOREIGN KEY (driverId) REFERENCES drivers(id)
    )
  `);

  const tripMigrations = [
    ['fuelUsedNorm', 'REAL'],
    ['fuelUsedActual', 'REAL'],
    ['fuelSavings', 'REAL'],
    ['fuelOveruse', 'REAL'],
    ['workHours', 'INTEGER'],
    ['workMinutes', 'INTEGER'],
    ['vehicleMakeSnapshot', 'TEXT'],
    ['vehicleModelSnapshot', 'TEXT'],
    ['vehicleRegistrationSnapshot', 'TEXT'],
    ['vehicleBodyTypeSnapshot', 'TEXT'],
    ['vehicleFuelConsumptionSnapshot', 'REAL'],
    ['vehicleTankSizeSnapshot', 'REAL'],
    ['driverNameSnapshot', 'TEXT'],
    ['driverResultsSignature', 'TEXT'],
    ['resultsCalculatedBy', 'TEXT'],
    ['resultsControlSignature', 'TEXT'],
    ['arrivalSignature', 'TEXT'],
    ['driverTechSignature', 'TEXT'],
    ['fuelIssuedBy', 'TEXT'],
  ];

  initializationTasks.push(allAsync('PRAGMA table_info(trips)').then((columns = []) => {
    const existing = new Set(columns.map((column) => column.name));
    return Promise.all(tripMigrations
      .filter(([name]) => !existing.has(name))
      .map(([name, type]) => runAsync(`ALTER TABLE trips ADD COLUMN ${name} ${type}`)));
  }));

  // Tabela lokalizacji w trakcie trasy
  db.run(`
    CREATE TABLE IF NOT EXISTS trip_locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tripId INTEGER,
      lat REAL,
      lng REAL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tripId) REFERENCES trips(id) ON DELETE CASCADE
    )
  `);

  // Tabela serwisów
  db.run(`
    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicleId INTEGER,
      date DATE,
      description TEXT,
      cost REAL,
      odometer INTEGER,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vehicleId) REFERENCES vehicles(id)
    )
  `);

  // Tabela tankowań
  db.run(`
    CREATE TABLE IF NOT EXISTS refuelings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicleId INTEGER,
      date DATE,
      liters REAL,
      cost REAL,
      mileage INTEGER,
      invoiceNumber TEXT,
      notes TEXT,
      fullTank BOOLEAN DEFAULT 0,
      tripId INTEGER,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vehicleId) REFERENCES vehicles(id),
      FOREIGN KEY (tripId) REFERENCES trips(id) ON DELETE CASCADE
    )
  `);

  // Tabela logów kluczyków
  db.run(`
    CREATE TABLE IF NOT EXISTS key_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicleId INTEGER,
      driverId INTEGER,
      action TEXT CHECK(action IN ('issued', 'returned')),
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      notes TEXT,
      issuedBy TEXT,
      FOREIGN KEY (vehicleId) REFERENCES vehicles(id),
      FOREIGN KEY (driverId) REFERENCES drivers(id)
    )
  `);

  // Tabela ustawień firmy - Z PEŁNYMI KOLUMNAMI
  db.run(`
    CREATE TABLE IF NOT EXISTS company_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      name TEXT,
      address TEXT,
      zipCode TEXT,
      city TEXT,
      nip TEXT,
      regon TEXT,
      tripNumberPrefix TEXT,
      tripNumberNext INTEGER DEFAULT 1,
      phone TEXT,
      email TEXT,
      website TEXT,
      logo TEXT,
      cardPrefix TEXT DEFAULT 'KD',
      cardCounter INTEGER DEFAULT 1,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const columnMigrations = [
    ['users', 'phone', 'TEXT'],
    ['drivers', 'licenseExpiry', 'TEXT'],
    ['services', 'invoiceNumber', 'TEXT'],
    ['key_logs', 'notes', 'TEXT'],
    ['key_logs', 'issuedBy', 'TEXT'],
  ];

  columnMigrations.forEach(([table, name, type]) => {
    initializationTasks.push(allAsync(`PRAGMA table_info(${table})`).then((columns = []) => {
      if (columns.some((column) => column.name === name)) return undefined;
      return runAsync(`ALTER TABLE ${table} ADD COLUMN ${name} ${type}`);
    }));
  });

  // Wstaw domyślne ustawienia, jeśli nie istnieją
  initializationTasks.push(getAsync('SELECT * FROM company_settings WHERE id = 1').then((row) => {
    if (!row) {
      return runAsync(
        `INSERT INTO company_settings (id, name, tripNumberPrefix, tripNumberNext, cardPrefix, cardCounter)
         VALUES (1, 'Moja Firma', 'TRIP-', 1, 'KD', 1)`
      ).then(() => {
      console.log('✅ Domyślne ustawienia firmy utworzone');
      });
    }
    return undefined;
  }));

  if (process.env.LONGDRIVE_RUNTIME !== 'windows' && process.env.NODE_ENV !== 'production') {
    initializationTasks.push(getAsync('SELECT * FROM users WHERE email = ?', ['admin@longdrive.pl'])
      .then((row) => {
        if (row) return undefined;
        return new Promise((resolve, reject) => {
          bcrypt.hash('admin123', 10, (error, hash) => {
            if (error) {
              reject(error);
              return;
            }
            runAsync(
              'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
              ['Administrator', 'admin@longdrive.pl', hash, 'admin']
            ).then(resolve, reject);
          });
        }).then(() => {
          console.log('✅ Developerskie konto administratora utworzone');
        });
      }));
  }
});

db.ready = Promise.all(initializationTasks).then(async () => {
  await require('./migrations/001-user-ownership').migrate(db);
  await require('./migrations/002-single-active-session').migrate(db);
  await require('./migrations/003-owner-scoped-identifiers').migrate(db);

  if (process.env.LONGDRIVE_RUNTIME === 'windows') {
    const users = await getAsync('SELECT COUNT(*) AS count FROM users');
    const securityState = await getAsync(
      'SELECT bootstrap_consumed FROM runtime_security WHERE id = 1'
    );
    if (users.count > 0 && securityState.bootstrap_consumed !== 1) {
      await runAsync('UPDATE runtime_security SET bootstrap_consumed = 1 WHERE id = 1');
    }
    if (users.count > 0 || securityState.bootstrap_consumed === 1) {
      delete process.env.LONGDRIVE_BOOTSTRAP_TOKEN;
    }
  }
  console.log(`✅ Baza danych SQLite zainicjalizowana: ${dbPath}`);
});

module.exports = db;
}