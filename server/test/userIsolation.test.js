const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { after, before, test } = require('node:test');
const jwt = require('jsonwebtoken');

const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'longdrive-user-isolation-'));
process.env.DATABASE_PATH = path.join(testDirectory, 'test.db');
process.env.NODE_ENV = 'production';
process.env.JWT_SECRET = 'test-secret-longdrive-user-isolation';
process.env.LONGDRIVE_ALLOWED_ORIGINS = 'http://127.0.0.1';
process.env.PORT = '0';

const { getAllowedOrigins, startServer } = require('../server');
let runtime;
let db;
let tokenA;
let tokenB;
let vehicleA;
let vehicleB;
let driverA;

const request = async (token, route, method = 'GET', body) => {
  const response = await fetch(`${runtime.apiBaseUrl}${route}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json();
  return { status: response.status, data };
};

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

before(async () => {
  runtime = await startServer();
  db = require('../database');
  await run(
    `INSERT INTO users (id, name, email, password_hash, role)
     VALUES (1, 'Account A', 'a@example.test', 'unused', 'user'),
            (2, 'Account B', 'b@example.test', 'unused', 'user')`
  );
  tokenA = jwt.sign({ id: 1, role: 'user' }, process.env.JWT_SECRET);
  tokenB = jwt.sign({ id: 2, role: 'user' }, process.env.JWT_SECRET);
});

after(async () => {
  if (runtime) await runtime.close();
  fs.rmSync(testDirectory, { recursive: true, force: true });
});

test('tenant records and linked resources are isolated by authenticated owner', async () => {
  const legacyVehicle = await run(
    `INSERT INTO vehicles (make, model, registrationNumber, owner_user_id)
     VALUES ('Legacy', 'Unassigned', 'LEGACY-UNASSIGNED', NULL)`
  );
  const createA = await request(tokenA, '/vehicles', 'POST', {
    make: 'A',
    model: 'Car',
    registrationNumber: 'A-TEST-1',
    owner_user_id: 2,
  });
  const createB = await request(tokenB, '/vehicles', 'POST', {
    make: 'B',
    model: 'Car',
    registrationNumber: 'B-TEST-1',
  });
  assert.equal(createA.status, 201);
  assert.equal(createB.status, 201);
  vehicleA = createA.data.id;
  vehicleB = createB.data.id;

  assert.equal((await request(tokenB, '/vehicles')).data.length, 1);
  assert.equal((await request(tokenA, '/vehicles')).data.length, 1);
  assert.equal(
    (await get('SELECT owner_user_id FROM vehicles WHERE id = ?', [legacyVehicle.lastID])).owner_user_id,
    null
  );
  assert.equal((await request(tokenB, `/vehicles/${vehicleA}`)).status, 404);
  assert.equal((await request(tokenB, `/vehicles/${vehicleA}`, 'PUT', { make: 'Changed' })).status, 404);
  assert.equal((await request(tokenB, `/vehicles/${vehicleA}`, 'DELETE')).status, 404);
  assert.equal((await get('SELECT owner_user_id FROM vehicles WHERE id = ?', [vehicleA])).owner_user_id, 1);

  const createdDriver = await request(tokenA, '/drivers', 'POST', {
    firstName: 'Driver',
    lastName: 'A',
    owner_user_id: 2,
  });
  assert.equal(createdDriver.status, 201);
  driverA = createdDriver.data.id;

  assert.equal((await request(tokenA, '/services', 'POST', {
    vehicleId: vehicleB,
    description: 'Foreign vehicle',
  })).status, 404);
  assert.equal((await request(tokenA, '/refuelings', 'POST', {
    vehicleId: vehicleA,
    tripId: 99999,
    liters: 10,
    cost: 20,
  })).status, 404);
  assert.equal((await request(tokenA, '/key-logs', 'POST', {
    vehicleId: vehicleB,
    driverId: driverA,
    action: 'issued',
  })).status, 404);

  const createdTrip = await request(tokenB, '/trips', 'POST', {
    vehicleId: vehicleB,
    driverId: (await request(tokenB, '/drivers', 'POST', {
      firstName: 'Driver',
      lastName: 'B',
    })).data.id,
  });
  assert.equal(createdTrip.status, 201);
  assert.equal((await request(tokenA, `/trips/${createdTrip.data.id}`)).status, 404);
  assert.equal((await request(tokenA, `/trips/${createdTrip.data.id}`, 'DELETE')).status, 404);
});

test('appearance and company settings are persisted independently for each account', async () => {
  assert.equal((await request(tokenA, '/user-settings/appearance')).data.appearance, null);
  assert.equal((await request(tokenB, '/user-settings/appearance')).data.appearance, null);

  assert.equal((await request(tokenA, '/user-settings/appearance', 'PUT', {
    appearance: { theme: 'blue', requireKeyForTrip: true },
  })).status, 200);
  assert.equal((await request(tokenB, '/user-settings/appearance', 'PUT', {
    appearance: { theme: 'rose' },
  })).status, 200);
  assert.deepEqual((await request(tokenA, '/user-settings/appearance')).data.appearance, {
    theme: 'blue',
    requireKeyForTrip: true,
  });
  assert.deepEqual((await request(tokenB, '/user-settings/appearance')).data.appearance, {
    theme: 'rose',
  });

  await request(tokenA, '/company-settings', 'PUT', { name: 'Firma A', cardPrefix: 'A' });
  await request(tokenB, '/company-settings', 'PUT', { name: 'Firma B', cardPrefix: 'B' });
  assert.equal((await request(tokenA, '/company-settings')).data.name, 'Firma A');
  assert.equal((await request(tokenB, '/company-settings')).data.name, 'Firma B');

  const tripA = await request(tokenA, '/trips', 'POST', {
    vehicleId: vehicleA,
    driverId: driverA,
  });
  const driverB = await request(tokenB, '/drivers', 'POST', {
    firstName: 'Driver',
    lastName: 'B',
  });
  const tripB = await request(tokenB, '/trips', 'POST', {
    vehicleId: vehicleB,
    driverId: driverB.data.id,
  });
  assert.equal(tripA.status, 201);
  assert.equal(tripB.status, 201);
  assert.equal(tripA.data.cardNumber, 'A-1');
  assert.equal(tripB.data.cardNumber, 'B-2');
});

test('ordinary registration cannot assign itself the administrator role', async () => {
  const result = await request('', '/auth/register', 'POST', {
    name: 'Ordinary user',
    email: 'ordinary@example.test',
    password: 'longdrive-test-password',
    role: 'admin',
  });
  assert.equal(result.status, 201);
  assert.equal(result.data.user.role, 'user');
});

test('production CORS accepts only configured origins and the trusted desktop scheme', () => {
  const originalRuntime = process.env.LONGDRIVE_RUNTIME;
  const originalOrigins = process.env.LONGDRIVE_ALLOWED_ORIGINS;
  try {
    process.env.LONGDRIVE_RUNTIME = 'windows';
    process.env.LONGDRIVE_ALLOWED_ORIGINS = 'longdrive://app';
    const isAllowed = getAllowedOrigins();
    assert.equal(isAllowed('longdrive://app'), true);
    assert.equal(isAllowed('https://untrusted.example'), false);
    process.env.LONGDRIVE_ALLOWED_ORIGINS = '*';
    assert.throws(() => getAllowedOrigins(), /wildcards are not allowed/);
  } finally {
    if (originalRuntime === undefined) delete process.env.LONGDRIVE_RUNTIME;
    else process.env.LONGDRIVE_RUNTIME = originalRuntime;
    if (originalOrigins === undefined) delete process.env.LONGDRIVE_ALLOWED_ORIGINS;
    else process.env.LONGDRIVE_ALLOWED_ORIGINS = originalOrigins;
  }
});
