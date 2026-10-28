// server/models/Driver.js
const db = require('../database');

class Driver {
  static create({ firstName, lastName, licenseNumber, licenseExpiry, phone, email, status = 'active', ownerUserId }) {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO drivers (firstName, lastName, licenseNumber, licenseExpiry, phone, email, status, owner_user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [firstName, lastName, licenseNumber, licenseExpiry, phone, email, status, ownerUserId],
        function(err) {
          if (err) return reject(err);
          resolve({
            id: this.lastID,
            firstName,
            lastName,
            licenseNumber,
            licenseExpiry,
            phone,
            email,
            status
          });
        }
      );
    });
  }

  static findById(id, ownerUserId) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM drivers WHERE id = ? AND owner_user_id = ?',
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
      let sql = 'SELECT * FROM drivers';
      const params = [];
      const conditions = ['owner_user_id = ?'];
      params.push(ownerUserId);

      if (filters.status) {
        conditions.push('status = ?');
        params.push(filters.status);
      }

      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }

      sql += ' ORDER BY id DESC';

      db.all(sql, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }

  static update(id, data, ownerUserId) {
    return new Promise((resolve, reject) => {
      const fields = [];
      const values = [];

      if (data.firstName !== undefined) {
        fields.push('firstName = ?');
        values.push(data.firstName);
      }
      if (data.lastName !== undefined) {
        fields.push('lastName = ?');
        values.push(data.lastName);
      }
      if (data.licenseNumber !== undefined) {
        fields.push('licenseNumber = ?');
        values.push(data.licenseNumber);
      }
      if (data.licenseExpiry !== undefined) {
        fields.push('licenseExpiry = ?');
        values.push(data.licenseExpiry);
      }
      if (data.phone !== undefined) {
        fields.push('phone = ?');
        values.push(data.phone);
      }
      if (data.email !== undefined) {
        fields.push('email = ?');
        values.push(data.email);
      }
      if (data.status !== undefined) {
        fields.push('status = ?');
        values.push(data.status);
      }

      if (fields.length === 0) {
        return resolve({ id });
      }

      db.run(
        `UPDATE drivers SET ${fields.join(', ')} WHERE id = ? AND owner_user_id = ?`,
        [...values, id, ownerUserId],
        function(err) {
          if (err) return reject(err);
          resolve({ id, ...data });
        }
      );
    });
  }

  static delete(id, ownerUserId) {
    return new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM drivers WHERE id = ? AND owner_user_id = ?',
        [id, ownerUserId],
        function(err) {
        if (err) return reject(err);
        resolve({ deleted: this.changes > 0 });
      });
    });
  }
}

module.exports = Driver;