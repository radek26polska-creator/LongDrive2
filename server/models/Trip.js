const db = require('../database');
const { planFollowingTripUpdates } = require('../utils/tripChainSync');

const run = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function(error) {
    if (error) return reject(error);
    resolve(this);
  });
});

const get = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (error, row) => {
    if (error) return reject(error);
    resolve(row);
  });
});

const all = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (error, rows) => {
    if (error) return reject(error);
    resolve(rows);
  });
});

class Trip {
  static create(data) {
    return new Promise((resolve, reject) => {
      const {
        vehicleId, driverId, startTime, endTime,
        startOdometer, endOdometer, startLocation, endLocation,
        purpose, status = 'planned',
        startFuel, endFuel, fuelUsed, distance,
        fuelAdded, fuelCost, fuelReceiptNumber, fuelStation, notes, orderedBy,
        cardNumber, fuelUsedNorm, fuelUsedActual, fuelSavings, fuelOveruse,
        workHours, workMinutes, vehicleMakeSnapshot, vehicleModelSnapshot,
        vehicleRegistrationSnapshot, vehicleBodyTypeSnapshot,
        vehicleFuelConsumptionSnapshot, vehicleTankSizeSnapshot,
        driverNameSnapshot, driverResultsSignature, resultsCalculatedBy,
        resultsControlSignature, arrivalSignature, driverTechSignature,
        fuelIssuedBy, ownerUserId
      } = data;

      const insertColumns = [
        'vehicleId', 'driverId', 'startTime', 'endTime',
        'startOdometer', 'endOdometer', 'startLocation', 'endLocation',
        'purpose', 'status', 'startFuel', 'endFuel', 'fuelUsed', 'distance',
        'fuelAdded', 'fuelCost', 'fuelReceiptNumber', 'fuelStation', 'notes', 'orderedBy',
        'cardNumber', 'fuelUsedActual', 'fuelOveruse', 'workHours', 'workMinutes',
        'vehicleMakeSnapshot', 'vehicleTankSizeSnapshot', 'fuelSavings',
        'vehicleFuelConsumptionSnapshot', 'fuelUsedNorm', 'driverNameSnapshot',
        'vehicleModelSnapshot', 'vehicleRegistrationSnapshot', 'vehicleBodyTypeSnapshot',
        'driverResultsSignature', 'resultsCalculatedBy', 'resultsControlSignature',
        'arrivalSignature', 'driverTechSignature', 'fuelIssuedBy', 'owner_user_id'
      ];

      const insertValues = [
        vehicleId, driverId, startTime, endTime,
        startOdometer, endOdometer, startLocation, endLocation,
        purpose, status, startFuel || 0, endFuel || 0, fuelUsed || 0, distance || 0,
        fuelAdded || 0, fuelCost || 0, fuelReceiptNumber || null, fuelStation || null,
        notes || null, orderedBy || null,
        cardNumber || null,
        fuelUsedActual ?? null, fuelOveruse ?? null, workHours ?? null, workMinutes ?? null,
        vehicleMakeSnapshot ?? null, vehicleTankSizeSnapshot ?? null, fuelSavings ?? null,
        vehicleFuelConsumptionSnapshot ?? null, fuelUsedNorm ?? null, driverNameSnapshot ?? null,
        vehicleModelSnapshot ?? null, vehicleRegistrationSnapshot ?? null, vehicleBodyTypeSnapshot ?? null,
        driverResultsSignature ?? null, resultsCalculatedBy ?? null, resultsControlSignature ?? null,
        arrivalSignature ?? null, driverTechSignature ?? null, fuelIssuedBy ?? null,
        ownerUserId
      ];

      db.run(
        `INSERT INTO trips (${insertColumns.join(', ')}) VALUES (${insertColumns.map(() => '?').join(', ')})`,
        insertValues,
        function(err) {
          if (err) {
            console.error('❌ Błąd INSERT trips:', err);
            return reject(err);
          }
          resolve({
            id: this.lastID,
            vehicleId, driverId, startTime, endTime,
            startOdometer, endOdometer, startLocation, endLocation,
            purpose, status, startFuel, endFuel, fuelUsed, distance,
            fuelAdded, fuelCost, fuelReceiptNumber, fuelStation, notes, orderedBy,
            cardNumber, fuelUsedNorm, fuelUsedActual, fuelSavings, fuelOveruse,
            workHours, workMinutes, vehicleMakeSnapshot, vehicleModelSnapshot,
            vehicleRegistrationSnapshot, vehicleBodyTypeSnapshot,
            vehicleFuelConsumptionSnapshot, vehicleTankSizeSnapshot,
            driverNameSnapshot, driverResultsSignature, resultsCalculatedBy,
            resultsControlSignature, arrivalSignature, driverTechSignature,
            fuelIssuedBy
          });        }
      );
    });
  }

  static findById(id, ownerUserId) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT t.*,
                COALESCE(t.vehicleMakeSnapshot, v.make) AS make,
                COALESCE(t.vehicleModelSnapshot, v.model) AS model,
                COALESCE(t.vehicleRegistrationSnapshot, v.registrationNumber) AS registrationNumber,
                COALESCE(t.vehicleBodyTypeSnapshot, v.bodyType) AS bodyType,
                COALESCE(t.vehicleFuelConsumptionSnapshot, v.fuelConsumption) AS fuelConsumption,
                v.fuelType, v.engineCapacity, v.vehicleType,
                COALESCE(t.vehicleTankSizeSnapshot, v.tankSize) AS tankSize,
                COALESCE(t.driverNameSnapshot, TRIM(COALESCE(d.firstName, '') || ' ' || COALESCE(d.lastName, ''))) AS driverName,
                d.firstName, d.lastName
         FROM trips t
         LEFT JOIN vehicles v ON t.vehicleId = v.id AND v.owner_user_id = t.owner_user_id
         LEFT JOIN drivers d ON t.driverId = d.id AND d.owner_user_id = t.owner_user_id
         WHERE t.id = ? AND t.owner_user_id = ?`,
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
      let sql = `
        SELECT t.*,
               COALESCE(t.vehicleMakeSnapshot, v.make) AS make,
               COALESCE(t.vehicleModelSnapshot, v.model) AS model,
               COALESCE(t.vehicleRegistrationSnapshot, v.registrationNumber) AS registrationNumber,
               COALESCE(t.vehicleBodyTypeSnapshot, v.bodyType) AS bodyType,
               COALESCE(t.vehicleFuelConsumptionSnapshot, v.fuelConsumption) AS fuelConsumption,
               v.fuelType, v.engineCapacity, v.vehicleType,
               COALESCE(t.vehicleTankSizeSnapshot, v.tankSize) AS tankSize,
               COALESCE(t.driverNameSnapshot, TRIM(COALESCE(d.firstName, '') || ' ' || COALESCE(d.lastName, ''))) AS driverName,
               d.firstName, d.lastName
        FROM trips t
        LEFT JOIN vehicles v ON t.vehicleId = v.id AND v.owner_user_id = t.owner_user_id
        LEFT JOIN drivers d ON t.driverId = d.id AND d.owner_user_id = t.owner_user_id
      `;
      const params = [];
      const conditions = ['t.owner_user_id = ?'];
      params.push(ownerUserId);

      if (filters.status) {
        conditions.push('t.status = ?');
        params.push(filters.status);
      }
      if (filters.vehicleId) {
        conditions.push('t.vehicleId = ?');
        params.push(filters.vehicleId);
      }
      if (filters.driverId) {
        conditions.push('t.driverId = ?');
        params.push(filters.driverId);
      }

      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }

      sql += ' ORDER BY t.id DESC';

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
        'vehicleId', 'driverId', 'startTime', 'endTime',
        'startOdometer', 'endOdometer', 'startLocation', 'endLocation',
        'purpose', 'status', 'startFuel', 'endFuel', 'fuelUsed', 'distance',
        'fuelAdded', 'fuelCost', 'fuelReceiptNumber', 'fuelStation', 'notes', 'orderedBy',
        'cardNumber', 'fuelUsedNorm', 'fuelUsedActual', 'fuelSavings', 'fuelOveruse',
        'workHours', 'workMinutes', 'vehicleMakeSnapshot', 'vehicleModelSnapshot',
        'vehicleRegistrationSnapshot', 'vehicleBodyTypeSnapshot', 'vehicleFuelConsumptionSnapshot',
        'vehicleTankSizeSnapshot', 'driverNameSnapshot', 'driverResultsSignature',
        'resultsCalculatedBy', 'resultsControlSignature', 'arrivalSignature',
        'driverTechSignature', 'fuelIssuedBy'
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

      db.run(
        `UPDATE trips SET ${fields.join(', ')} WHERE id = ? AND owner_user_id = ?`,
        [...values, id, ownerUserId],
        function(err) {
          if (err) {
            console.error('❌ Błąd UPDATE trips:', err);
            return reject(err);
          }
          resolve({ id, ...data });
        }
      );
    });
  }

  static async synchronizeFollowing(id, expectedPreviousEndOdometer, expectedCorrectedEndOdometer, ownerUserId) {
    await run('BEGIN IMMEDIATE TRANSACTION');
    try {
      const anchorTrip = await get(
        `SELECT t.*, v.fuelConsumption AS liveFuelConsumption
         FROM trips t
         LEFT JOIN vehicles v ON t.vehicleId = v.id AND v.owner_user_id = t.owner_user_id
         WHERE t.id = ? AND t.owner_user_id = ?`,
        [id, ownerUserId]
      );
      if (!anchorTrip) {
        const error = new Error('Nie znaleziono poprawionej podróży.');
        error.code = 'TRIP_NOT_FOUND';
        throw error;
      }
      if (anchorTrip.status !== 'completed') {
        const error = new Error('Synchronizować można tylko zakończone podróże.');
        error.code = 'TRIP_CHAIN_CONFLICT';
        throw error;
      }
      if (Number(anchorTrip.endOdometer) !== Number(expectedCorrectedEndOdometer)) {
        const error = new Error('Dane poprawionej podróży zmieniły się od czasu zapisu. Odśwież kartę i spróbuj ponownie.');
        error.code = 'TRIP_CHAIN_CONFLICT';
        throw error;
      }
      if (!anchorTrip.startTime || Number.isNaN(Date.parse(anchorTrip.startTime))) {
        const error = new Error('Brakuje prawidłowej daty podróży, nie można ustalić kolejności kart.');
        error.code = 'TRIP_CHAIN_CONFLICT';
        throw error;
      }

      const vehicleTrips = await all(
        `SELECT t.*, v.fuelConsumption AS liveFuelConsumption
         FROM trips t
         LEFT JOIN vehicles v ON t.vehicleId = v.id AND v.owner_user_id = t.owner_user_id
         WHERE t.vehicleId = ? AND t.status = 'completed' AND t.owner_user_id = ?
         ORDER BY datetime(t.startTime) ASC, t.id ASC`,
        [anchorTrip.vehicleId, ownerUserId]
      );
      const anchorIndex = vehicleTrips.findIndex((trip) => Number(trip.id) === Number(id));
      if (anchorIndex < 0) {
        const error = new Error('Nie można ustalić kolejności podróży pojazdu.');
        error.code = 'TRIP_CHAIN_CONFLICT';
        throw error;
      }

      const followingTrips = vehicleTrips.slice(anchorIndex + 1);
      if (followingTrips.some((trip) => !trip.startTime || Number.isNaN(Date.parse(trip.startTime)))) {
        const error = new Error('Co najmniej jedna kolejna podróż nie ma prawidłowej daty; synchronizacja została przerwana.');
        error.code = 'TRIP_CHAIN_CONFLICT';
        throw error;
      }

      const updates = planFollowingTripUpdates({
        anchorTrip,
        followingTrips,
        expectedPreviousEndOdometer,
        vehicleFuelConsumption: anchorTrip.liveFuelConsumption,
      });

      for (const update of updates) {
        await run(
          `UPDATE trips
           SET startOdometer = ?, distance = ?, fuelUsedNorm = ?, fuelSavings = ?, fuelOveruse = ?
           WHERE id = ? AND owner_user_id = ?`,
          [
            update.startOdometer,
            update.distance,
            update.fuelUsedNorm,
            update.fuelSavings,
            update.fuelOveruse,
            update.id,
            ownerUserId,
          ]
        );
      }

      await run('COMMIT');
      return { updatedCount: updates.length, updatedTripIds: updates.map((trip) => trip.id) };
    } catch (error) {
      try {
        await run('ROLLBACK');
      } catch (rollbackError) {
        console.error('Błąd wycofywania synchronizacji podróży:', rollbackError);
      }
      throw error;
    }
  }

  static complete(id, data, vehicleId, refueling, ownerUserId) {
    return new Promise((resolve, reject) => {
      const fields = [];
      const values = [];
      const allowedFields = [
        'endTime', 'endOdometer', 'endFuel', 'fuelUsed', 'distance',
        'fuelAdded', 'fuelCost', 'fuelReceiptNumber', 'fuelStation', 'notes',
        'status', 'fuelUsedNorm', 'fuelUsedActual', 'fuelSavings', 'fuelOveruse',
        'workHours', 'workMinutes', 'driverResultsSignature', 'resultsCalculatedBy',
        'resultsControlSignature', 'arrivalSignature', 'driverTechSignature',
        'fuelIssuedBy'
      ];

      allowedFields.forEach((field) => {
        if (data[field] !== undefined) {
          fields.push(`${field} = ?`);
          values.push(data[field]);
        }
      });
      db.serialize(() => {
        db.run('BEGIN IMMEDIATE TRANSACTION', (beginError) => {
          if (beginError) return reject(beginError);
          const rollback = (error) => db.run('ROLLBACK', () => reject(error));

          db.run(
            `UPDATE trips SET ${fields.join(', ')} WHERE id = ? AND owner_user_id = ?`,
            [...values, id, ownerUserId],
            function(tripError) {
            if (tripError || this.changes === 0) {
              return rollback(tripError || new Error('Trasa nie została zaktualizowana'));
            }

            db.run(
              'UPDATE vehicles SET mileage = ?, fuelLevel = ?, status = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND owner_user_id = ?',
              [data.endOdometer, data.endFuel, 'available', vehicleId, ownerUserId],
              function(vehicleError) {
                if (vehicleError || this.changes === 0) {
                  return rollback(vehicleError || new Error('Pojazd nie został zaktualizowany'));
                }

                const finish = () => db.run('COMMIT', (commitError) => {
                  if (commitError) return reject(commitError);
                  resolve({ id, ...data });
                });

                if (!refueling || !(Number(refueling.liters) > 0)) return finish();

                db.get(
                  'SELECT id FROM refuelings WHERE tripId = ? AND owner_user_id = ? LIMIT 1',
                  [id, ownerUserId],
                  (lookupError, existing) => {
                  if (lookupError) return rollback(lookupError);
                  if (existing) return finish();
                  db.run(
                    `INSERT INTO refuelings (
                      vehicleId, date, liters, cost, mileage, invoiceNumber, notes, fullTank, tripId, owner_user_id
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                      vehicleId, refueling.date, refueling.liters, refueling.cost ?? 0,
                      data.endOdometer, refueling.invoiceNumber || null,
                      refueling.notes || null, refueling.fullTank ? 1 : 0, id, ownerUserId
                    ],
                    (insertError) => {
                      if (insertError) return rollback(insertError);
                      finish();
                    }
                  );
                });
              }
            );
          });
        });
      });
    });
  }

  static delete(id, ownerUserId) {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run('BEGIN IMMEDIATE TRANSACTION', (beginError) => {
          if (beginError) return reject(beginError);

          const rollback = (error) => db.run('ROLLBACK', () => reject(error));

          (async () => {
            try {
              const trip = await get(
                `SELECT t.*, v.fuelConsumption AS liveFuelConsumption
                 FROM trips t
                 LEFT JOIN vehicles v ON t.vehicleId = v.id AND v.owner_user_id = t.owner_user_id
                 WHERE t.id = ? AND t.owner_user_id = ?`,
                [id, ownerUserId]
              );
              if (!trip) {
                const error = new Error('Nie znaleziono podróży do usunięcia.');
                error.code = 'TRIP_NOT_FOUND';
                throw error;
              }

              if (trip.status === 'completed') {
                const vehicleTrips = await all(
                  `SELECT t.*, v.fuelConsumption AS liveFuelConsumption
                   FROM trips t
                   LEFT JOIN vehicles v ON t.vehicleId = v.id AND v.owner_user_id = t.owner_user_id
                   WHERE t.vehicleId = ? AND t.status = 'completed' AND t.owner_user_id = ?
                   ORDER BY datetime(t.startTime) ASC, t.id ASC`,
                  [trip.vehicleId, ownerUserId]
                );
                const tripIndex = vehicleTrips.findIndex((item) => Number(item.id) === Number(id));
                if (tripIndex < 0) {
                  const error = new Error('Nie można ustalić kolejności usuwanej podróży.');
                  error.code = 'TRIP_CHAIN_CONFLICT';
                  throw error;
                }
                const previousTrip = tripIndex > 0 ? vehicleTrips[tripIndex - 1] : null;
                const followingTrips = tripIndex >= 0 ? vehicleTrips.slice(tripIndex + 1) : [];

                if (previousTrip && followingTrips.length > 0) {
                  if (!Number.isFinite(Number(trip.endOdometer)) || !trip.startTime ||
                      Number.isNaN(Date.parse(trip.startTime))) {
                    const error = new Error(
                      'Nie można bezpiecznie usunąć podróży: brakuje jej prawidłowego przebiegu lub daty.'
                    );
                    error.code = 'TRIP_CHAIN_CONFLICT';
                    throw error;
                  }
                  if (Number(trip.startOdometer) !== Number(previousTrip.endOdometer)) {
                    const error = new Error(
                      'Nie można bezpiecznie usunąć podróży: jej przebieg początkowy nie zgadza się z przebiegiem końcowym poprzedniej karty.'
                    );
                    error.code = 'TRIP_CHAIN_CONFLICT';
                    throw error;
                  }

                  const updates = planFollowingTripUpdates({
                    anchorTrip: previousTrip,
                    followingTrips,
                    expectedPreviousEndOdometer: trip.endOdometer,
                    vehicleFuelConsumption: trip.liveFuelConsumption,
                  });

                  for (const update of updates) {
                    await run(
                      `UPDATE trips
                       SET startOdometer = ?, distance = ?, fuelUsedNorm = ?, fuelSavings = ?, fuelOveruse = ?
                       WHERE id = ? AND owner_user_id = ?`,
                      [
                        update.startOdometer,
                        update.distance,
                        update.fuelUsedNorm,
                        update.fuelSavings,
                        update.fuelOveruse,
                        update.id,
                        ownerUserId,
                      ]
                    );
                  }
                }
              }

              if (trip.status === 'in_progress') {
                await run(
                  `UPDATE vehicles
                   SET status = 'available',
                       mileage = COALESCE(?, mileage),
                       fuelLevel = COALESCE(?, fuelLevel),
                       updatedAt = CURRENT_TIMESTAMP
                   WHERE id = ? AND owner_user_id = ?`,
                  [trip.startOdometer, trip.startFuel, trip.vehicleId, ownerUserId]
                );
              }

              await run('DELETE FROM refuelings WHERE tripId = ? AND owner_user_id = ?', [id, ownerUserId]);
              await run('DELETE FROM trip_locations WHERE tripId = ? AND owner_user_id = ?', [id, ownerUserId]);
              const deletion = await run('DELETE FROM trips WHERE id = ? AND owner_user_id = ?', [id, ownerUserId]);
              if (deletion.changes === 0) {
                const error = new Error('Podróż nie została usunięta.');
                error.code = 'TRIP_NOT_FOUND';
                throw error;
              }

              await run('COMMIT');
              resolve({ deleted: true });
            } catch (error) {
              rollback(error);
            }
          })();
        });
      });
    });
  }
}

module.exports = Trip;