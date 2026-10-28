const OWNED_TABLES = [
  'vehicles',
  'drivers',
  'trips',
  'trip_locations',
  'services',
  'refuelings',
  'key_logs',
];

const run = (db, sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function(error) {
    if (error) return reject(error);
    resolve(this);
  });
});

const all = (db, sql) => new Promise((resolve, reject) => {
  db.all(sql, (error, rows) => {
    if (error) return reject(error);
    resolve(rows);
  });
});

const migrate = async (db) => {
  await run(db, `
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const applied = await new Promise((resolve, reject) => {
    db.get(
      'SELECT version FROM schema_migrations WHERE version = ?',
      ['001-user-ownership'],
      (error, row) => error ? reject(error) : resolve(Boolean(row))
    );
  });
  if (applied) return;

  await run(db, 'BEGIN IMMEDIATE TRANSACTION');
  try {
    for (const table of OWNED_TABLES) {
      const columns = await all(db, `PRAGMA table_info(${table})`);
      if (!columns.some((column) => column.name === 'owner_user_id')) {
        await run(
          db,
          `ALTER TABLE ${table} ADD COLUMN owner_user_id INTEGER REFERENCES users(id)`
        );
      }
      await run(
        db,
        `CREATE INDEX IF NOT EXISTS idx_${table}_owner_user_id ON ${table}(owner_user_id)`
      );
    }

    await run(db, `
      CREATE TABLE IF NOT EXISTS user_appearance_settings (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        settings_json TEXT NOT NULL DEFAULT '{}',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await run(db, `
      CREATE TABLE IF NOT EXISTS user_company_settings (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        name TEXT,
        address TEXT,
        zipCode TEXT,
        city TEXT,
        nip TEXT,
        regon TEXT,
        tripNumberPrefix TEXT DEFAULT 'TRIP-',
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
    await run(
      db,
      'INSERT INTO schema_migrations (version) VALUES (?)',
      ['001-user-ownership']
    );
    await run(db, 'COMMIT');
  } catch (error) {
    await run(db, 'ROLLBACK').catch((rollbackError) => {
      console.error('Nie udało się wycofać migracji właścicieli:', rollbackError);
    });
    throw error;
  }
};

module.exports = { migrate };
