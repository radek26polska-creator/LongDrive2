const db = require('../database');

class UserSession {
  static create(userId, sessionId, expiresAt) {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO user_sessions (user_id, session_id, expires_at)
         VALUES (?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET
           session_id = excluded.session_id,
           expires_at = excluded.expires_at,
           created_at = CURRENT_TIMESTAMP
         WHERE user_sessions.expires_at <= ?`,
        [userId, sessionId, expiresAt, Math.floor(Date.now() / 1000)],
        function(error) {
          if (error) return reject(error);
          resolve(this.changes > 0);
        }
      );
    });
  }

  static isActive(userId, sessionId, now = Math.floor(Date.now() / 1000)) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT 1 FROM user_sessions
         WHERE user_id = ? AND session_id = ? AND expires_at > ?`,
        [userId, sessionId, now],
        (error, row) => {
          if (error) return reject(error);
          resolve(Boolean(row));
        }
      );
    });
  }

  static revoke(userId, sessionId) {
    return new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM user_sessions WHERE user_id = ? AND session_id = ?',
        [userId, sessionId],
        function(error) {
          if (error) return reject(error);
          resolve(this.changes > 0);
        }
      );
    });
  }
}

module.exports = UserSession;
