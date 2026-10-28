const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { after, before, beforeEach, test } = require('node:test');

const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'longdrive-trip-chain-'));
process.env.DATABASE_PATH = path.join(testDirectory, 'test.db');
process.env.NODE_ENV = 'production';
process.env.LONGDRIVE_ALLOW_SQLITE_TESTS = 'true';

const db = require('../database');
const Trip = require('../models/Trip');
const tripController = require('../controllers/tripController');
const OWNER_ID = 1;

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

const createVehicle = async (fuelConsumption = 10) => {
  const result = await run(
    `INSERT INTO vehicles (make, model, registrationNumber, mileage, fuelLevel, fuelConsumption, owner_user_id)
     VALUES ('Test', 'Vehicle', ?, 1000, 30, ?, ?)`,
    [`TEST-${Date.now()}-${Math.random()}`, fuelConsumption, OWNER_ID]
  );
  return result.lastID;
};

const createTrip = async (vehicleId, data) => {
  const result = await run(
    `INSERT INTO trips (
      vehicleId, driverId, startTime, endTime, startOdometer, endOdometer,
      startFuel, endFuel, fuelAdded, fuelUsedActual, fuelUsedNorm,
      fuelSavings, fuelOveruse, distance, status, notes, owner_user_id
    ) VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
    [
      vehicleId,
      data.startTime,
      data.endTime || data.startTime,
      data.startOdometer,
      data.endOdometer,
      data.startFuel ?? 20,
      data.endFuel ?? 18,
      data.fuelAdded ?? 0,
      data.fuelUsedActual ?? 2,
      data.fuelUsedNorm ?? 3,
      data.fuelSavings ?? null,
      data.fuelOveruse ?? null,
      data.distance ?? data.endOdometer - data.startOdometer,
      data.status || 'completed',
      data.notes ?? 'zachowaj tę uwagę',
      OWNER_ID,
    ]
  );
  return result.lastID;
};

const completeTripThroughController = async (tripId, body) => {
  const response = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
  };
  await tripController.update({
    params: { id: String(tripId) },
    body,
    user: { id: OWNER_ID },
  }, response);
  return response;
};

before(async () => {
  await db.ready;
});

beforeEach(async () => {
  await run(
    `INSERT OR IGNORE INTO users (id, name, email, password_hash, role)
     VALUES (?, 'Test User', 'test@example.com', 'not-used', 'user')`,
    [OWNER_ID]
  );
  await run('DELETE FROM refuelings');
  await run('DELETE FROM trips');
  await run('DELETE FROM vehicles');
  await run('DELETE FROM drivers');
  await run(
    `INSERT INTO drivers (id, firstName, lastName, status, owner_user_id)
     VALUES (1, 'Test', 'Driver', 'active', ?)`,
    [OWNER_ID]
  );
  await run('DROP TRIGGER IF EXISTS fail_trip_chain_update');
});

after(async () => {
  await new Promise((resolve, reject) => {
    db.close((error) => error ? reject(error) : resolve());
  });
  fs.rmSync(testDirectory, { recursive: true, force: true });
});

test('synchronization preserves continuity and recalculates only dependent values', async () => {
  const vehicleId = await createVehicle(10);
  const firstId = await createTrip(vehicleId, {
    startTime: '2026-01-01T08:00:00.000Z',
    startOdometer: 80,
    endOdometer: 95,
  });
  const secondId = await createTrip(vehicleId, {
    startTime: '2026-01-02T08:00:00.000Z',
    startOdometer: 100,
    endOdometer: 130,
    startFuel: 20,
    endFuel: 18,
    fuelAdded: 1,
    fuelUsedActual: 3,
    distance: 30,
    fuelUsedNorm: 3,
  });
  const thirdId = await createTrip(vehicleId, {
    startTime: '2026-01-03T08:00:00.000Z',
    startOdometer: 130,
    endOdometer: 150,
    distance: 20,
    fuelUsedNorm: 2,
  });

  const result = await Trip.synchronizeFollowing(firstId, 100, 95, OWNER_ID);
  const second = await get('SELECT * FROM trips WHERE id = ?', [secondId]);
  const third = await get('SELECT * FROM trips WHERE id = ?', [thirdId]);

  assert.equal(result.updatedCount, 2);
  assert.equal(second.startOdometer, 95);
  assert.equal(second.endOdometer, 130);
  assert.equal(second.distance, 35);
  assert.equal(second.fuelUsedNorm, 3.5);
  assert.equal(second.fuelUsedActual, 3);
  assert.equal(second.fuelSavings, 0.5);
  assert.equal(second.fuelOveruse, null);
  assert.equal(second.startFuel, 20);
  assert.equal(second.endFuel, 18);
  assert.equal(second.fuelAdded, 1);
  assert.equal(second.notes, 'zachowaj tę uwagę');
  assert.equal(third.startOdometer, second.endOdometer);
  assert.equal(third.distance, 20);
  assert.equal(third.fuelUsedNorm, 2);
});

test('conflicting odometer readings abort without overwriting following trips', async () => {
  const vehicleId = await createVehicle(10);
  const firstId = await createTrip(vehicleId, {
    startTime: '2026-01-01T08:00:00.000Z',
    startOdometer: 80,
    endOdometer: 95,
  });
  const secondId = await createTrip(vehicleId, {
    startTime: '2026-01-02T08:00:00.000Z',
    startOdometer: 101,
    endOdometer: 130,
  });
  const before = await get('SELECT * FROM trips WHERE id = ?', [secondId]);

  await assert.rejects(
    Trip.synchronizeFollowing(firstId, 100, 95, OWNER_ID),
    { code: 'TRIP_CHAIN_CONFLICT' }
  );
  const afterTrip = await get('SELECT * FROM trips WHERE id = ?', [secondId]);
  assert.deepEqual(afterTrip, before);
});

test('a correction that would create a negative following distance is rejected', async () => {
  const vehicleId = await createVehicle(10);
  const firstId = await createTrip(vehicleId, {
    startTime: '2026-01-01T08:00:00.000Z',
    startOdometer: 80,
    endOdometer: 120,
  });
  const secondId = await createTrip(vehicleId, {
    startTime: '2026-01-02T08:00:00.000Z',
    startOdometer: 120,
    endOdometer: 110,
  });
  await run('UPDATE trips SET endOdometer = 125 WHERE id = ?', [firstId]);
  const before = await get('SELECT * FROM trips WHERE id = ?', [secondId]);

  await assert.rejects(
    Trip.synchronizeFollowing(firstId, 120, 125, OWNER_ID),
    { code: 'TRIP_CHAIN_CONFLICT' }
  );
  assert.deepEqual(await get('SELECT * FROM trips WHERE id = ?', [secondId]), before);
});

test('inconsistent downstream fuel readings abort synchronization without changing the trip', async () => {
  const vehicleId = await createVehicle(10);
  const firstId = await createTrip(vehicleId, {
    startTime: '2026-01-01T08:00:00.000Z',
    startOdometer: 80,
    endOdometer: 95,
  });
  const secondId = await createTrip(vehicleId, {
    startTime: '2026-01-02T08:00:00.000Z',
    startOdometer: 100,
    endOdometer: 130,
    fuelUsedActual: -1,
  });
  const before = await get('SELECT * FROM trips WHERE id = ?', [secondId]);

  await assert.rejects(
    Trip.synchronizeFollowing(firstId, 100, 95, OWNER_ID),
    { code: 'TRIP_CHAIN_CONFLICT' }
  );
  assert.deepEqual(await get('SELECT * FROM trips WHERE id = ?', [secondId]), before);
});

test('an update failure rolls back every following-trip change', async () => {
  const vehicleId = await createVehicle(10);
  const firstId = await createTrip(vehicleId, {
    startTime: '2026-01-01T08:00:00.000Z',
    startOdometer: 80,
    endOdometer: 95,
  });
  const secondId = await createTrip(vehicleId, {
    startTime: '2026-01-02T08:00:00.000Z',
    startOdometer: 100,
    endOdometer: 130,
  });
  const thirdId = await createTrip(vehicleId, {
    startTime: '2026-01-03T08:00:00.000Z',
    startOdometer: 130,
    endOdometer: 150,
  });
  const beforeSecond = await get('SELECT * FROM trips WHERE id = ?', [secondId]);
  const beforeThird = await get('SELECT * FROM trips WHERE id = ?', [thirdId]);
  await run(
    `CREATE TRIGGER fail_trip_chain_update BEFORE UPDATE ON trips
     WHEN OLD.id = ${thirdId}
     BEGIN SELECT RAISE(ABORT, 'test database failure'); END`
  );

  await assert.rejects(Trip.synchronizeFollowing(firstId, 100, 95, OWNER_ID));
  assert.deepEqual(await get('SELECT * FROM trips WHERE id = ?', [secondId]), beforeSecond);
  assert.deepEqual(await get('SELECT * FROM trips WHERE id = ?', [thirdId]), beforeThird);
});

test('deleting a completed trip reconnects following odometer readings and removes its refueling', async () => {
  const vehicleId = await createVehicle(10);
  await createTrip(vehicleId, {
    startTime: '2026-01-01T08:00:00.000Z',
    startOdometer: 80,
    endOdometer: 100,
  });
  const deletedId = await createTrip(vehicleId, {
    startTime: '2026-01-02T08:00:00.000Z',
    startOdometer: 100,
    endOdometer: 120,
  });
  const secondId = await createTrip(vehicleId, {
    startTime: '2026-01-03T08:00:00.000Z',
    startOdometer: 120,
    endOdometer: 150,
    distance: 30,
    fuelUsedNorm: 3,
  });
  const thirdId = await createTrip(vehicleId, {
    startTime: '2026-01-04T08:00:00.000Z',
    startOdometer: 150,
    endOdometer: 170,
    distance: 20,
    fuelUsedNorm: 2,
  });
  await run(
    `INSERT INTO refuelings (vehicleId, date, liters, cost, mileage, tripId, owner_user_id)
     VALUES (?, '2026-01-02', 5, 10, 120, ?, ?)`,
    [vehicleId, deletedId, OWNER_ID]
  );

  const result = await Trip.delete(deletedId, OWNER_ID);
  const second = await get('SELECT * FROM trips WHERE id = ?', [secondId]);
  const third = await get('SELECT * FROM trips WHERE id = ?', [thirdId]);
  const refueling = await get('SELECT id FROM refuelings WHERE tripId = ?', [deletedId]);

  assert.equal(result.deleted, true);
  assert.equal(await get('SELECT id FROM trips WHERE id = ?', [deletedId]), undefined);
  assert.equal(second.startOdometer, 100);
  assert.equal(second.endOdometer, 150);
  assert.equal(second.distance, 50);
  assert.equal(second.fuelUsedNorm, 5);
  assert.equal(second.fuelUsedActual, 2);
  assert.equal(third.startOdometer, 150);
  assert.equal(third.distance, 20);
  assert.equal(third.fuelUsedNorm, 2);
  assert.equal(refueling, undefined);
});

test('a conflicting chain prevents deletion without removing the trip or changing following data', async () => {
  const vehicleId = await createVehicle(10);
  await createTrip(vehicleId, {
    startTime: '2026-01-01T08:00:00.000Z',
    startOdometer: 80,
    endOdometer: 100,
  });
  const deletedId = await createTrip(vehicleId, {
    startTime: '2026-01-02T08:00:00.000Z',
    startOdometer: 100,
    endOdometer: 120,
  });
  const followingId = await createTrip(vehicleId, {
    startTime: '2026-01-03T08:00:00.000Z',
    startOdometer: 121,
    endOdometer: 150,
  });
  const before = await get('SELECT * FROM trips WHERE id = ?', [followingId]);

  await assert.rejects(Trip.delete(deletedId, OWNER_ID), { code: 'TRIP_CHAIN_CONFLICT' });

  assert.ok(await get('SELECT id FROM trips WHERE id = ?', [deletedId]));
  assert.deepEqual(await get('SELECT * FROM trips WHERE id = ?', [followingId]), before);
});

test('ordinary completed-trip edits and in-progress trip completion still persist', async () => {
  const vehicleId = await createVehicle(10);
  const completedId = await createTrip(vehicleId, {
    startTime: '2026-01-01T08:00:00.000Z',
    startOdometer: 80,
    endOdometer: 100,
  });

  await Trip.update(completedId, {
    startOdometer: 81,
    endOdometer: 101,
    purpose: 'zwykła edycja',
  }, OWNER_ID);
  const edited = await get('SELECT * FROM trips WHERE id = ?', [completedId]);
  assert.equal(edited.startOdometer, 81);
  assert.equal(edited.endOdometer, 101);
  assert.equal(edited.purpose, 'zwykła edycja');

  const activeId = await createTrip(vehicleId, {
    startTime: '2026-01-04T08:00:00.000Z',
    startOdometer: 101,
    endOdometer: 101,
    status: 'in_progress',
  });
  await Trip.complete(activeId, {
    endTime: '2026-01-04T09:00:00.000Z',
    endOdometer: 111,
    endFuel: 17,
    status: 'completed',
    distance: 10,
    fuelUsed: 3,
    fuelUsedNorm: 1,
    fuelUsedActual: 3,
  }, vehicleId, null, OWNER_ID);

  const completedActive = await get('SELECT * FROM trips WHERE id = ?', [activeId]);
  const vehicle = await get('SELECT mileage, fuelLevel, status FROM vehicles WHERE id = ?', [vehicleId]);
  assert.equal(completedActive.status, 'completed');
  assert.equal(completedActive.endOdometer, 111);
  assert.equal(vehicle.mileage, 111);
  assert.equal(vehicle.fuelLevel, 17);
});

test('norm-based trip completion stores the calculated end fuel level and preserves norm overuse', async () => {
  const vehicleId = await createVehicle(10);
  const tripId = await createTrip(vehicleId, {
    startTime: '2026-01-01T08:00:00.000Z',
    startOdometer: 100,
    endOdometer: 100,
    startFuel: 0,
    endFuel: 0,
    fuelUsedActual: 0,
    fuelUsedNorm: 0,
    status: 'in_progress',
  });

  await Trip.complete(tripId, {
    endTime: '2026-01-01T09:00:00.000Z',
    endOdometer: 110,
    endFuel: 0,
    fuelAdded: 0,
    status: 'completed',
    distance: 10,
    fuelUsed: 0,
    fuelUsedNorm: 1,
    fuelUsedActual: 0,
    fuelSavings: null,
    fuelOveruse: 1,
  }, vehicleId, null, OWNER_ID);

  const completedTrip = await get('SELECT * FROM trips WHERE id = ?', [tripId]);
  const vehicle = await get('SELECT mileage, fuelLevel FROM vehicles WHERE id = ?', [vehicleId]);

  assert.equal(completedTrip.endFuel, 0);
  assert.equal(completedTrip.fuelUsedNorm, 1);
  assert.equal(completedTrip.fuelUsedActual, 0);
  assert.equal(completedTrip.fuelOveruse, 1);
  assert.equal(vehicle.mileage, 110);
  assert.equal(vehicle.fuelLevel, 0);
});

test('controller norm completion persists matching fuel, mileage, vehicle state, and card metrics', async () => {
  const { calculateTripMetrics } = await import('../../src/lib/tripCalculations.js');
  const vehicleId = await createVehicle(10);
  await run('UPDATE vehicles SET mileage = 100, fuelLevel = 40, tankSize = 60 WHERE id = ?', [vehicleId]);
  const tripId = await createTrip(vehicleId, {
    startTime: '2026-01-01T08:00:00.000Z',
    startOdometer: 100,
    endOdometer: 100,
    startFuel: 40,
    endFuel: 40,
    fuelAdded: 0,
    fuelUsedActual: 0,
    status: 'in_progress',
  });

  const response = await completeTripThroughController(tripId, {
    status: 'completed',
    endOdometer: 200,
    endFuel: 30,
    fuelAdded: 0,
    endTime: '2026-01-01T09:00:00.000Z',
  });
  const savedTrip = await get('SELECT * FROM trips WHERE id = ?', [tripId]);
  const savedVehicle = await get('SELECT mileage, fuelLevel, status FROM vehicles WHERE id = ?', [vehicleId]);
  const cardMetrics = calculateTripMetrics({
    startOdometer: savedTrip.startOdometer,
    endOdometer: savedTrip.endOdometer,
    startFuel: savedTrip.startFuel,
    endFuel: savedTrip.endFuel,
    fuelAdded: savedTrip.fuelAdded,
    vehicle: { fuelConsumption: 10, tankSize: 60 },
  });

  assert.equal(response.statusCode, 200);
  assert.equal(savedTrip.distance, 100);
  assert.equal(savedTrip.fuelUsedNorm, 10);
  assert.equal(savedTrip.fuelUsedActual, 10);
  assert.equal(savedTrip.endFuel, 30);
  assert.equal(savedVehicle.mileage, 200);
  assert.equal(savedVehicle.fuelLevel, 30);
  assert.equal(savedVehicle.status, 'available');
  assert.equal(cardMetrics.distance, savedTrip.distance);
  assert.equal(cardMetrics.fuelUsedNorm, savedTrip.fuelUsedNorm);
  assert.equal(cardMetrics.fuelUsedActual, savedTrip.fuelUsedActual);
  assert.equal(cardMetrics.endFuel, savedTrip.endFuel);
});

test('controller manual fuel completion persists the entered level, actual usage, overuse, and refueling', async () => {
  const { calculateTripMetrics } = await import('../../src/lib/tripCalculations.js');
  const vehicleId = await createVehicle(10);
  await run('UPDATE vehicles SET mileage = 100, fuelLevel = 40, tankSize = 60 WHERE id = ?', [vehicleId]);
  const tripId = await createTrip(vehicleId, {
    startTime: '2026-01-01T08:00:00.000Z',
    startOdometer: 100,
    endOdometer: 100,
    startFuel: 40,
    endFuel: 40,
    status: 'in_progress',
  });

  const response = await completeTripThroughController(tripId, {
    status: 'completed',
    endOdometer: 200,
    endFuel: 27,
    fuelAdded: 2,
    fuelCost: 10,
    fuelReceiptNumber: 'TEST-1',
    fuelStation: 'Test',
    endTime: '2026-01-01T09:00:00.000Z',
  });
  const savedTrip = await get('SELECT * FROM trips WHERE id = ?', [tripId]);
  const savedVehicle = await get('SELECT mileage, fuelLevel FROM vehicles WHERE id = ?', [vehicleId]);
  const refueling = await get('SELECT liters, mileage, tripId FROM refuelings WHERE tripId = ?', [tripId]);
  const cardMetrics = calculateTripMetrics({
    startOdometer: savedTrip.startOdometer,
    endOdometer: savedTrip.endOdometer,
    startFuel: savedTrip.startFuel,
    endFuel: savedTrip.endFuel,
    fuelAdded: savedTrip.fuelAdded,
    vehicle: { fuelConsumption: 10, tankSize: 60 },
  });

  assert.equal(response.statusCode, 200);
  assert.equal(savedTrip.distance, 100);
  assert.equal(savedTrip.fuelUsedNorm, 10);
  assert.equal(savedTrip.fuelUsedActual, 15);
  assert.equal(savedTrip.fuelOveruse, 5);
  assert.equal(savedTrip.endFuel, 27);
  assert.equal(savedVehicle.mileage, 200);
  assert.equal(savedVehicle.fuelLevel, 27);
  assert.equal(refueling.liters, 2);
  assert.equal(refueling.mileage, 200);
  assert.equal(cardMetrics.distance, savedTrip.distance);
  assert.equal(cardMetrics.fuelUsedNorm, savedTrip.fuelUsedNorm);
  assert.equal(cardMetrics.fuelUsedActual, savedTrip.fuelUsedActual);
  assert.equal(cardMetrics.fuelOveruse, savedTrip.fuelOveruse);
});
