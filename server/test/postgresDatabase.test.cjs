const assert = require('node:assert/strict');
const Module = require('node:module');
const { after, before, test } = require('node:test');
const { DataType, newDb } = require('pg-mem');

const postgres = newDb();
postgres.public.registerFunction({
  name: 'trim',
  args: [DataType.text],
  returns: DataType.text,
  implementation: (value) => value.trim(),
});
const { Pool: MemoryPool } = postgres.adapters.createPg();
const originalLoad = Module._load;

process.env.DATABASE_URL = 'postgres://longdrive:test@localhost/longdrive';
process.env.NODE_ENV = 'production';
process.env.JWT_SECRET = 'test-secret-postgres-adapter';
process.env.LONGDRIVE_ALLOWED_ORIGINS = 'http://127.0.0.1';
process.env.PORT = '0';
process.env.PGSSLMODE = 'disable';

Module._load = function(request, parent, isMain) {
  if (request === 'pg') return { Pool: MemoryPool };
  return originalLoad.call(this, request, parent, isMain);
};

const { startServer } = require('../server');
let runtime;

before(async () => {
  runtime = await startServer();
});

after(async () => {
  if (runtime) await runtime.close();
  Module._load = originalLoad;
});

test('PostgreSQL adapter initializes and supports registration, sessions, and case-insensitive login', async () => {
  const register = (email, name) => fetch(`${runtime.apiBaseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        email,
        password: 'longdrive-test-password',
      }),
    });
  const createdResponse = await register('Postgres-Test@example.test', 'Postgres test account');
  assert.equal(createdResponse.status, 201);
  const created = await createdResponse.json();
  assert.equal(created.user.email, 'postgres-test@example.test');

  const duplicateResponse = await register('postgres-test@example.test', 'Duplicate account');
  assert.equal(duplicateResponse.status, 409);

  const profile = await fetch(`${runtime.apiBaseUrl}/auth/me`, {
    headers: { Authorization: `Bearer ${created.token}` },
  });
  assert.equal(profile.status, 200);

  const logout = await fetch(`${runtime.apiBaseUrl}/auth/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${created.token}` },
  });
  assert.equal(logout.status, 200);

  const login = await fetch(`${runtime.apiBaseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'POSTGRES-TEST@EXAMPLE.TEST',
      password: 'longdrive-test-password',
    }),
  });
  assert.equal(login.status, 200);
  assert.equal((await login.json()).user.email, 'postgres-test@example.test');
});

test('PostgreSQL adapter supports trip deletion transactions', async () => {
  const registration = await fetch(`${runtime.apiBaseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Trip deletion test',
      email: 'trip-deletion@example.test',
      password: 'longdrive-test-password',
    }),
  });
  assert.equal(registration.status, 201);
  const { token } = await registration.json();
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const vehicleResponse = await fetch(`${runtime.apiBaseUrl}/vehicles`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      make: 'Test',
      model: 'Vehicle',
      registrationNumber: 'TRIP-DELETE-TEST',
    }),
  });
  assert.equal(vehicleResponse.status, 201);
  const vehicle = await vehicleResponse.json();

  const driverResponse = await fetch(`${runtime.apiBaseUrl}/drivers`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ firstName: 'Test', lastName: 'Driver' }),
  });
  assert.equal(driverResponse.status, 201);
  const driver = await driverResponse.json();

  const tripResponse = await fetch(`${runtime.apiBaseUrl}/trips`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      vehicleId: vehicle.id,
      driverId: driver.id,
      startOdometer: 100,
      startFuel: 30,
    }),
  });
  assert.equal(tripResponse.status, 201);
  const trip = await tripResponse.json();

  const completionResponse = await fetch(`${runtime.apiBaseUrl}/trips/${trip.id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      status: 'completed',
      endOdometer: 150,
      endFuel: 25,
    }),
  });
  assert.equal(completionResponse.status, 200, await completionResponse.text());

  const tripDetailsResponse = await fetch(`${runtime.apiBaseUrl}/trips/${trip.id}`, { headers });
  assert.equal(tripDetailsResponse.status, 200);
  const tripDetails = await tripDetailsResponse.json();
  assert.equal(tripDetails.vehicleId, vehicle.id);
  assert.equal(tripDetails.driverId, driver.id);

  const tripsResponse = await fetch(`${runtime.apiBaseUrl}/trips`, { headers });
  assert.equal(tripsResponse.status, 200);
  const trips = await tripsResponse.json();
  assert.equal(trips[0].vehicleId, vehicle.id);
  assert.equal(trips[0].driverId, driver.id);

  const deleteResponse = await fetch(`${runtime.apiBaseUrl}/trips/${trip.id}`, {
    method: 'DELETE',
    headers,
  });
  const deletedTrip = await deleteResponse.json();
  assert.equal(deleteResponse.status, 200, JSON.stringify(deletedTrip));
  assert.deepEqual(deletedTrip, { message: 'Trasa usunięta', deleted: true });

  const missingTripResponse = await fetch(`${runtime.apiBaseUrl}/trips/${trip.id}`, { headers });
  assert.equal(missingTripResponse.status, 404);
});

test('PostgreSQL adapter supports refuelings, services, key logs, and settings', async () => {
  const registration = await fetch(`${runtime.apiBaseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Fleet modules test',
      email: 'fleet-modules@example.test',
      password: 'longdrive-test-password',
    }),
  });
  assert.equal(registration.status, 201);
  const { token } = await registration.json();
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const vehicleResponse = await fetch(`${runtime.apiBaseUrl}/vehicles`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      make: 'Test',
      model: 'Fleet vehicle',
      registrationNumber: 'FLEET-MODULES-TEST',
    }),
  });
  assert.equal(vehicleResponse.status, 201);
  const vehicle = await vehicleResponse.json();
  const vehiclesResponse = await fetch(`${runtime.apiBaseUrl}/vehicles`, { headers });
  assert.equal(vehiclesResponse.status, 200);
  assert.equal((await vehiclesResponse.json())[0].registrationNumber, 'FLEET-MODULES-TEST');

  const driverResponse = await fetch(`${runtime.apiBaseUrl}/drivers`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ firstName: 'Fleet', lastName: 'Driver' }),
  });
  assert.equal(driverResponse.status, 201);
  const driver = await driverResponse.json();
  const driversResponse = await fetch(`${runtime.apiBaseUrl}/drivers`, { headers });
  assert.equal(driversResponse.status, 200);
  assert.equal((await driversResponse.json())[0].firstName, 'Fleet');

  const refuelingResponse = await fetch(`${runtime.apiBaseUrl}/refuelings`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      vehicleId: vehicle.id,
      date: '2025-01-02',
      liters: 42,
      cost: 73.5,
      mileage: 1200,
      invoiceNumber: 'FUEL-001',
      fullTank: true,
    }),
  });
  assert.equal(refuelingResponse.status, 201);
  const refueling = await refuelingResponse.json();
  const refuelingDetailsResponse = await fetch(`${runtime.apiBaseUrl}/refuelings/${refueling.id}`, { headers });
  assert.equal(refuelingDetailsResponse.status, 200);
  const refuelingDetails = await refuelingDetailsResponse.json();
  assert.equal(refuelingDetails.vehicleId, vehicle.id);
  assert.equal(refuelingDetails.invoiceNumber, 'FUEL-001');
  assert.equal(refuelingDetails.fullTank, 1);
  assert.equal(refuelingDetails.tripId, null);

  const serviceResponse = await fetch(`${runtime.apiBaseUrl}/services`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      vehicleId: vehicle.id,
      date: '2025-01-03',
      description: 'Oil change',
      cost: 110,
      odometer: 1250,
      invoiceNumber: 'SERVICE-001',
    }),
  });
  assert.equal(serviceResponse.status, 201);
  const service = await serviceResponse.json();
  const serviceDetailsResponse = await fetch(`${runtime.apiBaseUrl}/services/${service.id}`, { headers });
  assert.equal(serviceDetailsResponse.status, 200);
  const serviceDetails = await serviceDetailsResponse.json();
  assert.equal(serviceDetails.vehicleId, vehicle.id);
  assert.equal(serviceDetails.invoiceNumber, 'SERVICE-001');

  const keyLogResponse = await fetch(`${runtime.apiBaseUrl}/key-logs`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      vehicleId: vehicle.id,
      driverId: driver.id,
      action: 'issued',
      timestamp: '2025-01-04T10:00:00.000Z',
      issuedBy: 'Fleet manager',
    }),
  });
  assert.equal(keyLogResponse.status, 201);
  const keyLog = await keyLogResponse.json();
  const keyLogDetailsResponse = await fetch(`${runtime.apiBaseUrl}/key-logs/${keyLog.id}`, { headers });
  assert.equal(keyLogDetailsResponse.status, 200);
  const keyLogDetails = await keyLogDetailsResponse.json();
  assert.equal(keyLogDetails.vehicleId, vehicle.id);
  assert.equal(keyLogDetails.driverId, driver.id);
  assert.equal(keyLogDetails.issuedBy, 'Fleet manager');
  const activeKeyLogsResponse = await fetch(`${runtime.apiBaseUrl}/key-logs/active`, { headers });
  assert.equal(activeKeyLogsResponse.status, 200);
  assert.equal((await activeKeyLogsResponse.json())[0].issuedBy, 'Fleet manager');

  const appearanceResponse = await fetch(`${runtime.apiBaseUrl}/user-settings/appearance`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ appearance: { theme: 'dark', fontSize: 16 } }),
  });
  assert.equal(appearanceResponse.status, 200);
  const appearanceDetailsResponse = await fetch(`${runtime.apiBaseUrl}/user-settings/appearance`, { headers });
  assert.equal(appearanceDetailsResponse.status, 200);
  assert.deepEqual((await appearanceDetailsResponse.json()).appearance, { theme: 'dark', fontSize: 16 });

  const companySettingsResponse = await fetch(`${runtime.apiBaseUrl}/company-settings`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ name: 'Fleet test company', zipCode: '00-001', cardPrefix: 'FT' }),
  });
  assert.equal(companySettingsResponse.status, 200);
  const companySettings = await companySettingsResponse.json();
  assert.equal(companySettings.name, 'Fleet test company');
  assert.equal(companySettings.zipCode, '00-001');
  assert.equal(companySettings.cardPrefix, 'FT');
});
