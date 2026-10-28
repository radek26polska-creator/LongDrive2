// server/models/Refueling.js
const db = require('../database');

class Refueling {
  static create({ vehicleId, date, liters, cost, mileage, invoiceNumber, notes, fullTank, tripId, ownerUserId }) {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO refuelings (vehicleId, date, liters, cost, mileage, invoiceNumber, notes, fullTank, tripId, owner_user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [vehicleId, date, liters, cost, mileage, invoiceNumber || null, notes || null, fullTank ? 1 : 0, tripId || null, ownerUserId],
        function(err) {
          if (err) return reject(err);
          resolve({ id: this.lastID, vehicleId, date, liters, cost, mileage, invoiceNumber, notes, fullTank, tripId });
        }
      );
    });
  }

  static findById(id, ownerUserId) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM refuelings WHERE id = ? AND owner_user_id = ?',
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
      let sql = 'SELECT * FROM refuelings';
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

      if (data.vehicleId !== undefined) { fields.push('vehicleId = ?'); values.push(data.vehicleId); }
      if (data.date !== undefined) { fields.push('date = ?'); values.push(data.date); }
      if (data.liters !== undefined) { fields.push('liters = ?'); values.push(data.liters); }
      if (data.cost !== undefined) { fields.push('cost = ?'); values.push(data.cost); }
      if (data.mileage !== undefined) { fields.push('mileage = ?'); values.push(data.mileage); }
      if (data.invoiceNumber !== undefined) { fields.push('invoiceNumber = ?'); values.push(data.invoiceNumber); }
      if (data.notes !== undefined) { fields.push('notes = ?'); values.push(data.notes); }
      if (data.fullTank !== undefined) { fields.push('fullTank = ?'); values.push(data.fullTank ? 1 : 0); }
      if (data.tripId !== undefined) { fields.push('tripId = ?'); values.push(data.tripId); }

      if (fields.length === 0) return resolve({ id });

      db.run(
        `UPDATE refuelings SET ${fields.join(', ')} WHERE id = ? AND owner_user_id = ?`,
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
        'DELETE FROM refuelings WHERE id = ? AND owner_user_id = ?',
        [id, ownerUserId],
        function(err) {
        if (err) return reject(err);
        resolve({ deleted: this.changes > 0 });
      });
    });
  }
}

module.exports = Refueling;