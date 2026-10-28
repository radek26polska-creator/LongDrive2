const db = require('../database');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const matchesBootstrapToken = (candidate, expected) => {
  if (typeof candidate !== 'string' || !/^[a-f\d]{64}$/i.test(candidate) ||
      typeof expected !== 'string' || !/^[a-f\d]{64}$/i.test(expected)) {
    return false;
  }

  const candidateHash = crypto.createHash('sha256').update(candidate, 'utf8').digest();
  const expectedHash = crypto.createHash('sha256').update(expected, 'utf8').digest();
  return crypto.timingSafeEqual(candidateHash, expectedHash);
};

class User {
  static getWindowsBootstrapStatus() {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT bootstrap_consumed,
                (SELECT COUNT(*) FROM users) AS user_count
         FROM runtime_security WHERE id = 1`,
        (error, row) => {
          if (error) return reject(error);
          if (!row) return reject(new Error('Bootstrap state is unavailable.'));
          resolve({ available: row.bootstrap_consumed === 0 && row.user_count === 0 });
        }
      );
    });
  }

  static createWindowsRuntimeUser({ name, email, password, bootstrapToken }) {
    return new Promise((resolve, reject) => {
      bcrypt.hash(password, 10, (hashError, hash) => {
        if (hashError) return reject(hashError);

        db.serialize(() => {
          db.run('BEGIN IMMEDIATE TRANSACTION', (beginError) => {
            if (beginError) return reject(beginError);

            db.get('SELECT COUNT(*) AS count FROM users', (countError, result) => {
              if (countError) {
                return db.run('ROLLBACK', () => reject(countError));
              }

              db.get('SELECT bootstrap_consumed FROM runtime_security WHERE id = 1', (stateError, state) => {
                if (stateError || !state) {
                  const error = stateError || new Error('Bootstrap state is unavailable.');
                  error.code = 'BOOTSTRAP_STATE_UNAVAILABLE';
                  return db.run('ROLLBACK', () => reject(error));
                }

                const bootstrapConsumed = state.bootstrap_consumed === 1 || result.count > 0;
                const canCreateAdmin = result.count === 0 && !bootstrapConsumed;
                if (canCreateAdmin && !process.env.LONGDRIVE_BOOTSTRAP_TOKEN) {
                  const error = new Error('Bootstrap administrator is not configured.');
                  error.code = 'BOOTSTRAP_NOT_CONFIGURED';
                  return db.run('ROLLBACK', () => reject(error));
                }
                if (canCreateAdmin && !matchesBootstrapToken(
                  bootstrapToken,
                  process.env.LONGDRIVE_BOOTSTRAP_TOKEN
                )) {
                  const error = new Error('A valid bootstrap token is required.');
                  error.code = bootstrapToken ? 'BOOTSTRAP_INVALID' : 'BOOTSTRAP_REQUIRED';
                  return db.run('ROLLBACK', () => reject(error));
                }
                if (bootstrapConsumed && bootstrapToken !== undefined) {
                  const error = new Error('The bootstrap token has already been used.');
                  error.code = 'BOOTSTRAP_TOKEN_USED';
                  return db.run('ROLLBACK', () => reject(error));
                }

                const role = canCreateAdmin ? 'admin' : 'user';
                db.run(
                  'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
                  [name, email, hash, role],
                  function(insertError) {
                    if (insertError) {
                      if (insertError.code === 'SQLITE_CONSTRAINT' ||
                          insertError.message.includes('UNIQUE constraint failed')) {
                        const duplicateError = new Error('A user with this email already exists.');
                        duplicateError.code = 'USER_ALREADY_EXISTS';
                        return db.run('ROLLBACK', () => reject(duplicateError));
                      }
                      return db.run('ROLLBACK', () => reject(insertError));
                    }

                    const id = this.lastID;
                    const commitUser = () => {
                      db.run('COMMIT', (commitError) => {
                        if (commitError) return reject(commitError);
                        if (canCreateAdmin) delete process.env.LONGDRIVE_BOOTSTRAP_TOKEN;
                        resolve({ id, name, email, role });
                      });
                    };

                    if (!bootstrapConsumed) {
                      db.run(
                        'UPDATE runtime_security SET bootstrap_consumed = 1 WHERE id = 1',
                        (updateError) => {
                          if (updateError) return db.run('ROLLBACK', () => reject(updateError));
                          commitUser();
                        }
                      );
                    } else {
                      commitUser();
                    }
                  });
                });
              });
            });
          });
        });
      });
  }

  static create({ name, email, password, role = 'user' }) {
    return new Promise((resolve, reject) => {
      const saltRounds = 10;
      bcrypt.hash(password, saltRounds, (err, hash) => {
        if (err) return reject(err);
        
        db.run(
          'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
          [name, email, hash, role],
          function(err) {
            if (err) return reject(err);
            resolve({ id: this.lastID, name, email, role });
          }
        );
      });
    });
  }

  static findByEmail(email) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE email = ? COLLATE NOCASE', [email], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  }

  static findById(id) {
    return new Promise((resolve, reject) => {
      db.get('SELECT id, name, email, phone, role, created_at FROM users WHERE id = ?', [id], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  }

  static findByIdWithPassword(id) {
    return new Promise((resolve, reject) => {
      db.get('SELECT id, password_hash FROM users WHERE id = ?', [id], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  }

  static updatePassword(id, passwordHash) {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET password_hash = ? WHERE id = ?',
        [passwordHash, id],
        function(err) {
          if (err) return reject(err);
          resolve({ id, updated: this.changes > 0 });
        }
      );
    });
  }

  // NOWA METODA
  static update(id, { name, email, phone, password_hash }) {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET name = ?, email = ?, phone = ?, password_hash = ? WHERE id = ?',
        [name, email, phone, password_hash, id],
        function(err) {
          if (err) return reject(err);
          resolve({ id, name, email, phone });
        }
      );
    });
  }
}

module.exports = User;