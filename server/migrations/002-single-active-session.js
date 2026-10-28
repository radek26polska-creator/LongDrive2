const run = (db, sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function(error) {
    if (error) return reject(error);
    resolve(this);
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
      ['002-single-active-session'],
      (error, row) => error ? reject(error) : resolve(Boolean(row))
    );
  });
  if (applied) return;

  await run(db, 'BEGIN IMMEDIATE TRANSACTION');
  try {
    await run(db, `
      CREATE TABLE IF NOT EXISTS user_sessions (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        session_id TEXT UNIQUE NOT NULL,
        expires_at INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await run(
      db,
      'INSERT INTO schema_migrations (version) VALUES (?)',
      ['002-single-active-session']
    );
    await run(db, 'COMMIT');
  } catch (error) {
    await run(db, 'ROLLBACK').catch((rollbackError) => {
      console.error('Nie udało się wycofać migracji sesji użytkowników:', rollbackError);
    });
    throw error;
  }
};

module.exports = { migrate };
