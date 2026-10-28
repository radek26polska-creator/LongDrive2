// server/models/Service.js
const db = require('../database');

class Service {
  static create({ vehicleId, date, description, cost, odometer, invoiceNumber, ownerUserId }) {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO services (vehicleId, date, description, cost, odometer, invoiceNumber, owner_user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [vehicleId, date, description, cost, odometer, invoiceNumber || null, ownerUserId],
        function(err) {
          if (err) return reject(err);
          resolve({
            id: this.lastID,
            vehicleId,
            date,
            description,
            cost,
            odometer,
            invoiceNumber: invoiceNumber || null
          });
        }
      );
    });
  }

  static findById(id, ownerUserId) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM services WHERE id = ? AND owner_user_id = ?',
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
      let sql = 'SELECT * FROM services';
      const params = [];
      const conditions = ['owner_user_id = ?'];
      params.push(ownerUserId);

      if (filters.vehicleId) {
        conditions.push('vehicleId = ?');
        params.push(filters.vehicleId);
      }

      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }

      sql += ' ORDER BY date DESC';

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

      if (data.vehicleId !== undefined) {
        fields.push('vehicleId = ?');
        values.push(data.vehicleId);
      }
      if (data.date !== undefined) {
        fields.push('date = ?');
        values.push(data.date);
      }
      if (data.description !== undefined) {
        fields.push('description = ?');
        values.push(data.description);
      }
      if (data.cost !== undefined) {
        fields.push('cost = ?');
        values.push(data.cost);
      }
      if (data.odometer !== undefined) {
        fields.push('odometer = ?');
        values.push(data.odometer);
      }
      if (data.invoiceNumber !== undefined) {
        fields.push('invoiceNumber = ?');
        values.push(data.invoiceNumber);
      }

      if (fields.length === 0) {
        return resolve({ id });
      }

      db.run(
        `UPDATE services SET ${fields.join(', ')} WHERE id = ? AND owner_user_id = ?`,
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
        'DELETE FROM services WHERE id = ? AND owner_user_id = ?',
        [id, ownerUserId],
        function(err) {
        if (err) return reject(err);
        resolve({ deleted: this.changes > 0 });
      });
    });
  }
}

module.exports = Service;