const db = require('../database');

class Vehicle {
  static create({
    make,
    model,
    registrationNumber,
    year,
    mileage,
    fuelLevel,
    tankSize,
    fuelConsumption,
    status = 'active',
    vehicleType,
    fuelType,
    engineCapacity,
    bodyType,
    ownerUserId
  }) {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO vehicles (
          make, model, registrationNumber, year, mileage,
          fuelLevel, tankSize, fuelConsumption, status,
          vehicleType, fuelType, engineCapacity, bodyType, owner_user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          make, model, registrationNumber,
          year || null,
          mileage || 0,
          fuelLevel || 0,
          tankSize || 50,
          fuelConsumption ?? 7.5,
          status,
          vehicleType || null,
          fuelType || null,
          engineCapacity || null,
          bodyType || null,
          ownerUserId
        ],
        function(err) {
          if (err) return reject(err);
          resolve({
            id: this.lastID,
            make,
            model,
            registrationNumber,
            year,
            mileage,
            fuelLevel,
            tankSize,
            fuelConsumption,
            status,
            vehicleType,
            fuelType,
            engineCapacity,
            bodyType
          });
        }
      );
    });
  }

  static findById(id, ownerUserId) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM vehicles WHERE id = ? AND owner_user_id = ?',
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
      let sql = 'SELECT * FROM vehicles';
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

      const allowedFields = [
        'make', 'model', 'registrationNumber', 'year',
        'mileage', 'fuelLevel', 'tankSize', 'fuelConsumption',
        'status', 'vehicleType', 'fuelType', 'engineCapacity', 'bodyType'
      ];

      allowedFields.forEach(field => {
        if (data[field] !== undefined) {
          fields.push(`${field} = ?`);
          values.push(data[field]);
        }
      });

      if (fields.length === 0) {
        return resolve({ id });
      }

      fields.push('updatedAt = CURRENT_TIMESTAMP');
      db.run(
        `UPDATE vehicles SET ${fields.join(', ')} WHERE id = ? AND owner_user_id = ?`,
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
        'DELETE FROM vehicles WHERE id = ? AND owner_user_id = ?',
        [id, ownerUserId],
        function(err) {
        if (err) return reject(err);
        resolve({ deleted: this.changes > 0 });
      });
    });
  }
}

module.exports = Vehicle;