// server/models/KeyLog.js
const db = require('../database');

class KeyLog {
  static create({ vehicleId, driverId, action, timestamp, notes, issuedBy, ownerUserId }) {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO key_logs (vehicleId, driverId, action, timestamp, notes, issuedBy, owner_user_id)
         VALUES (?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP), ?, ?, ?)`,
        [vehicleId, driverId, action, timestamp || null, notes || null, issuedBy || null, ownerUserId],
        function(err) {
          if (err) return reject(err);
          resolve({
            id: this.lastID,
            vehicleId,
            driverId,
            action,
            timestamp: timestamp || new Date().toISOString(),
            notes: notes || null,
            issuedBy: issuedBy || null
          });
        }
      );
    });
  }

  static findById(id, ownerUserId) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM key_logs WHERE id = ? AND owner_user_id = ?',
        [id, ownerUserId],
        (err, row) => {
        if (err) return reject(err);
        resolve(row);
        }
      );
    });
  }

  static findAll(filters = {}, ownerUserId) {
    return new Promise((resolve, reject) => {
      let sql = 'SELECT * FROM key_logs';
      const params = [];
      const conditions = ['owner_user_id = ?'];
      params.push(ownerUserId);

      if (filters.vehicleId) {
        conditions.push('vehicleId = ?');
        params.push(filters.vehicleId);
      }
      if (filters.driverId) {
        conditions.push('driverId = ?');
        params.push(filters.driverId);
      }
      if (filters.action) {
        conditions.push('action = ?');
        params.push(filters.action);
      }

      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }

      sql += ' ORDER BY timestamp DESC';

      db.all(sql, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }

  // Specjalna metoda: znajdź aktywne wydania kluczyków (issued bez returned)
  static findActiveIssues(ownerUserId) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT kl1.* FROM key_logs kl1
         LEFT JOIN key_logs kl2 ON kl1.vehicleId = kl2.vehicleId 
           AND kl2.action = 'returned' AND kl2.timestamp > kl1.timestamp
           AND kl2.owner_user_id = ?
         WHERE kl1.action = 'issued' AND kl2.id IS NULL
           AND kl1.owner_user_id = ?
         ORDER BY kl1.timestamp DESC`,
        [ownerUserId, ownerUserId],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows);
        }
      );
    });
  }

  static update(id, data, ownerUserId) {
    return new Promise((resolve, reject) => {
      const fields = [];
      const values = [];
      const allowedFields = ['vehicleId', 'driverId', 'action', 'timestamp', 'notes', 'issuedBy'];

      allowedFields.forEach((field) => {
        if (data[field] !== undefined) {
          fields.push(`${field} = ?`);
          values.push(data[field]);
        }
      });

      if (fields.length === 0) {
        return resolve(null);
      }

      db.run(
        `UPDATE key_logs SET ${fields.join(', ')} WHERE id = ? AND owner_user_id = ?`,
        [...values, id, ownerUserId],
        function(err) {
          if (err) return reject(err);
          if (this.changes === 0) return resolve(null);
          KeyLog.findById(id, ownerUserId).then(resolve, reject);
        }
      );
    });
  }

  static delete(id, ownerUserId) {
    return new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM key_logs WHERE id = ? AND owner_user_id = ?',
        [id, ownerUserId],
        function(err) {
        if (err) return reject(err);
        resolve({ deleted: this.changes > 0 });
      });
    });
  }
}

module.exports = KeyLog;