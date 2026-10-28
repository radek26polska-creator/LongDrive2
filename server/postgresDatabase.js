const { AsyncLocalStorage } = require('node:async_hooks');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false },
  max: 10,
});
const transactionContext = new AsyncLocalStorage();

const camelCaseColumns = new Map([
  'vehicleId', 'driverId', 'tripId', 'invoiceNumber', 'fullTank',
  'registrationNumber', 'fuelLevel', 'tankSize', 'fuelConsumption', 'vehicleType',
  'fuelType', 'engineCapacity', 'bodyType', 'createdAt', 'updatedAt', 'firstName',
  'lastName', 'licenseNumber', 'licenseExpiry', 'startTime', 'endTime',
  'startOdometer', 'endOdometer', 'startLocation', 'endLocation', 'startFuel',
  'endFuel', 'fuelUsed', 'fuelAdded', 'fuelCost', 'fuelReceiptNumber', 'fuelStation',
  'orderedBy', 'cardNumber', 'fuelUsedNorm', 'fuelUsedActual', 'fuelSavings',
  'fuelOveruse', 'workHours', 'workMinutes', 'vehicleMakeSnapshot',
  'vehicleModelSnapshot', 'vehicleRegistrationSnapshot', 'vehicleBodyTypeSnapshot',
  'vehicleFuelConsumptionSnapshot', 'vehicleTankSizeSnapshot', 'driverNameSnapshot',
  'driverName', 'liveFuelConsumption', 'driverResultsSignature', 'resultsCalculatedBy',
  'resultsControlSignature',
  'arrivalSignature', 'driverTechSignature', 'fuelIssuedBy', 'tripNumberPrefix',
  'tripNumberNext', 'zipCode', 'cardPrefix', 'cardCounter', 'issuedBy',
].map((name) => [name.toLowerCase(), name]));

const schema = [
  `CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    phone TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS runtime_security (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    bootstrap_consumed INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS vehicles (
    id SERIAL PRIMARY KEY,
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    registrationnumber TEXT NOT NULL,
    year INTEGER,
    mileage INTEGER DEFAULT 0,
    fuellevel REAL DEFAULT 0,
    tanksize REAL DEFAULT 50,
    fuelconsumption REAL DEFAULT 7.5,
    status TEXT DEFAULT 'available',
    vehicletype TEXT,
    fueltype TEXT,
    enginecapacity INTEGER,
    bodytype TEXT,
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    owner_user_id INTEGER REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS drivers (
    id SERIAL PRIMARY KEY,
    firstname TEXT NOT NULL,
    lastname TEXT NOT NULL,
    licensenumber TEXT,
    licenseexpiry TEXT,
    phone TEXT,
    email TEXT,
    status TEXT DEFAULT 'active',
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    owner_user_id INTEGER REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS trips (
    id SERIAL PRIMARY KEY,
    vehicleid INTEGER REFERENCES vehicles(id),
    driverid INTEGER REFERENCES drivers(id),
    starttime TIMESTAMP,
    endtime TIMESTAMP,
    startodometer INTEGER DEFAULT 0,
    endodometer INTEGER DEFAULT 0,
    startlocation TEXT,
    endlocation TEXT,
    purpose TEXT,
    status TEXT DEFAULT 'planned',
    startfuel REAL DEFAULT 0,
    endfuel REAL DEFAULT 0,
    fuelused REAL DEFAULT 0,
    distance INTEGER DEFAULT 0,
    fueladded REAL DEFAULT 0,
    fuelcost REAL DEFAULT 0,
    fuelreceiptnumber TEXT,
    fuelstation TEXT,
    notes TEXT,
    orderedby TEXT,
    cardnumber TEXT,
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fuelusednorm REAL,
    fuelusedactual REAL,
    fuelsavings REAL,
    fueloveruse REAL,
    workhours INTEGER,
    workminutes INTEGER,
    vehiclemakesnapshot TEXT,
    vehiclemodelsnapshot TEXT,
    vehicleregistrationsnapshot TEXT,
    vehiclebodytypesnapshot TEXT,
    vehiclefuelconsumptionsnapshot REAL,
    vehicletanksizesnapshot REAL,
    drivernamesnapshot TEXT,
    driverresultssignature TEXT,
    resultscalculatedby TEXT,
    resultscontrolsignature TEXT,
    arrivalsignature TEXT,
    drivertechsignature TEXT,
    fuelissuedby TEXT,
    owner_user_id INTEGER REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS trip_locations (
    id SERIAL PRIMARY KEY,
    tripid INTEGER REFERENCES trips(id) ON DELETE CASCADE,
    lat REAL,
    lng REAL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    owner_user_id INTEGER REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS services (
    id SERIAL PRIMARY KEY,
    vehicleid INTEGER REFERENCES vehicles(id),
    date DATE,
    description TEXT,
    cost REAL,
    odometer INTEGER,
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    invoicenumber TEXT,
    owner_user_id INTEGER REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS refuelings (
    id SERIAL PRIMARY KEY,
    vehicleid INTEGER REFERENCES vehicles(id),
    date DATE,
    liters REAL,
    cost REAL,
    mileage INTEGER,
    invoicenumber TEXT,
    notes TEXT,
    fulltank SMALLINT DEFAULT 0,
    tripid INTEGER REFERENCES trips(id) ON DELETE CASCADE,
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    owner_user_id INTEGER REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS key_logs (
    id SERIAL PRIMARY KEY,
    vehicleid INTEGER REFERENCES vehicles(id),
    driverid INTEGER REFERENCES drivers(id),
    action TEXT CHECK(action IN ('issued', 'returned')),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    issuedby TEXT,
    owner_user_id INTEGER REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS company_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    name TEXT,
    address TEXT,
    zipcode TEXT,
    city TEXT,
    nip TEXT,
    regon TEXT,
    tripnumberprefix TEXT,
    tripnumbernext INTEGER DEFAULT 1,
    phone TEXT,
    email TEXT,
    website TEXT,
    logo TEXT,
    cardprefix TEXT DEFAULT 'KD',
    cardcounter INTEGER DEFAULT 1,
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS user_appearance_settings (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    settings_json TEXT NOT NULL DEFAULT '{}',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS user_company_settings (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    name TEXT,
    address TEXT,
    zipcode TEXT,
    city TEXT,
    nip TEXT,
    regon TEXT,
    tripnumberprefix TEXT DEFAULT 'TRIP-',
    tripnumbernext INTEGER DEFAULT 1,
    phone TEXT,
    email TEXT,
    website TEXT,
    logo TEXT,
    cardprefix TEXT DEFAULT 'KD',
    cardcounter INTEGER DEFAULT 1,
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS user_sessions (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    session_id TEXT UNIQUE NOT NULL,
    expires_at BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
];
const serialIdTables = new Set([
  'users', 'vehicles', 'drivers', 'trips', 'trip_locations', 'services',
  'refuelings', 'key_logs',
]);

const withMappedRows = (rows) => rows.map((row) => Object.fromEntries(
  Object.entries(row).map(([key, value]) => [camelCaseColumns.get(key) || key, value])
));

const prepareSql = (sql) => {
  let query = sql.trim();
  query = query.replace(/^BEGIN\s+IMMEDIATE(?:\s+TRANSACTION)?$/i, 'BEGIN');
  query = query.replace(/\s+COLLATE\s+NOCASE\b/gi, '');
  const ignoreConflict = /^INSERT\s+OR\s+IGNORE\s+INTO\s+/i.test(query);
  if (ignoreConflict) query = query.replace(/^INSERT\s+OR\s+IGNORE\s+INTO\s+/i, 'INSERT INTO ');
  query = query.replace(/\bdatetime\(([^)]+)\)/gi, '$1');
  query = query.replace(/\?/g, (_, offset) => {
    const preceding = query.slice(0, offset);
    const count = (preceding.match(/\?/g) || []).length + 1;
    return `$${count}`;
  });
  if (ignoreConflict && !/\bON\s+CONFLICT\b/i.test(query)) query += ' ON CONFLICT DO NOTHING';
  return query;
};

const query = async (sql, params = []) => {
  const context = transactionContext.getStore();
  const begin = /^\s*BEGIN(?:\s+IMMEDIATE)?(?:\s+TRANSACTION)?\s*$/i.test(sql);
  const finish = /^\s*(COMMIT|ROLLBACK)\s*$/i.exec(sql);

  if (begin) {
    if (!context) throw new Error('Database transaction requires a request context.');
    if (context.client) throw new Error('Nested database transactions are not supported.');
    context.client = await pool.connect();
    try {
      return await context.client.query('BEGIN');
    } catch (error) {
      context.client.release();
      context.client = null;
      throw error;
    }
  }

  if (context?.client) {
    const client = context.client;
    try {
      const result = await client.query(prepareSql(sql), params);
      if (finish) {
        context.client = null;
        client.release();
      }
      return result;
    } catch (error) {
      if (finish) {
        context.client = null;
        client.release(error);
      }
      throw error;
    }
  }

  return pool.query(prepareSql(sql), params);
};

const run = (sql, params = [], callback) => {
  if (typeof params === 'function') {
    callback = params;
    params = [];
  }

  let statement = sql;
  const insert = /^\s*INSERT(?:\s+OR\s+IGNORE)?\s+INTO\s+([a-z0-9_]+)/i.exec(sql);
  if (insert && serialIdTables.has(insert[1].toLowerCase()) && !/\bRETURNING\b/i.test(sql)) {
    statement = `${sql.trim().replace(/;$/, '')} RETURNING id`;
  }
  query(statement, params).then((result) => {
    if (callback) {
      const insertedId = result.rows?.[0]?.id;
      callback.call({ lastID: insertedId, changes: result.rowCount }, null);
    }
  }).catch((error) => {
    if (callback) callback.call({ lastID: undefined, changes: 0 }, error);
    else console.error('Błąd zapytania PostgreSQL:', error);
  });
  return db;
};

const get = (sql, params = [], callback) => {
  if (typeof params === 'function') {
    callback = params;
    params = [];
  }

  query(sql, params).then((result) => callback(null, withMappedRows(result.rows)[0]))
    .catch((error) => callback(error));
  return db;
};

const all = (sql, params = [], callback) => {
  if (typeof params === 'function') {
    callback = params;
    params = [];
  }

  const tableInfo = /^\s*PRAGMA\s+table_info\(([^)]+)\)\s*$/i.exec(sql);
  if (tableInfo) {
    const table = tableInfo[1].replace(/["'`]/g, '').toLowerCase();
    pool.query(
      `SELECT column_name AS name
       FROM information_schema.columns
       WHERE table_schema = current_schema() AND table_name = $1
       ORDER BY ordinal_position`,
      [table]
    ).then((result) => callback(null, result.rows)).catch((error) => callback(error));
    return db;
  }
  query(sql, params).then((result) => callback(null, withMappedRows(result.rows)))
    .catch((error) => callback(error));
  return db;
};

const db = {
  run,
  get,
  all,
  serialize(callback) {
    callback();
    return db;
  },
  withContext(callback) {
    return transactionContext.run({}, callback);
  },
  close(callback) {
    pool.end().then(() => callback?.(null)).catch((error) => callback?.(error));
  },
  ready: null,
};

db.ready = (async () => {
  for (const statement of schema) await pool.query(statement);
  for (const table of [
    'vehicles', 'drivers', 'trips', 'trip_locations', 'services',
    'refuelings', 'key_logs',
  ]) {
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_${table}_owner_user_id ON ${table}(owner_user_id)`);
  }
  await pool.query(
    'CREATE UNIQUE INDEX IF NOT EXISTS vehicles_owner_registration_unique ON vehicles(owner_user_id, registrationnumber)'
  );
  await pool.query(
    'CREATE UNIQUE INDEX IF NOT EXISTS drivers_owner_license_unique ON drivers(owner_user_id, licensenumber)'
  );
  await pool.query(
    `INSERT INTO schema_migrations (version) VALUES
      ('001-user-ownership'),
      ('002-single-active-session'),
      ('003-owner-scoped-identifiers')
     ON CONFLICT (version) DO NOTHING`
  );
  await pool.query(
    `INSERT INTO company_settings (id, name, tripnumberprefix, tripnumbernext, cardprefix, cardcounter)
     VALUES (1, 'Moja Firma', 'TRIP-', 1, 'KD', 1)
     ON CONFLICT (id) DO NOTHING`
  );
  console.log('✅ Baza danych PostgreSQL zainicjalizowana');
})();

module.exports = db;
