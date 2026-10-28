const assert = require('node:assert/strict');
const bcrypt = require('bcrypt');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { after, before, test } = require('node:test');

const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'longdrive-account-persistence-'));
process.env.DATABASE_PATH = path.join(testDirectory, 'test.db');
process.env.NODE_ENV = 'production';
process.env.LONGDRIVE_ALLOW_SQLITE_TESTS = 'true';
process.env.JWT_SECRET = 'test-secret-longdrive-account-persistence';
process.env.LONGDRIVE_ALLOWED_ORIGINS = 'http://127.0.0.1';
process.env.PORT = '0';

const { startServer } = require('../server');
let runtime;
let db;
let token;

const request = async (route, method = 'GET', body, token) => {
  const response = await fetch(`${runtime.apiBaseUrl}${route}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, data: await response.json() };
};

const get = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (error, row) => {
    if (error) return reject(error);
    resolve(row);
  });
});

before(async () => {
  runtime = await startServer();
  db = require('../database');
});

after(async () => {
  if (runtime) await runtime.close();
  fs.rmSync(testDirectory, { recursive: true, force: true });
});

test('registration persists a normalized account with a password hash', async () => {
  const registration = await request('/auth/register', 'POST', {
    name: '  Account Persistence  ',
    email: '  Account.Persistence@Example.Test ',
    password: 'correct-test-password',
    role: 'admin',
  });

  assert.equal(registration.status, 201);
  assert.equal(registration.data.user.name, 'Account Persistence');
  assert.equal(registration.data.user.email, 'account.persistence@example.test');
  assert.equal(registration.data.user.role, 'user');
  assert.ok(registration.data.user.id > 0);
  token = registration.data.token;

  const row = await get('SELECT id, email, password_hash, role FROM users WHERE id = ?', [
    registration.data.user.id,
  ]);
  assert.equal(row.email, 'account.persistence@example.test');
  assert.equal(row.role, 'user');
  assert.notEqual(row.password_hash, 'correct-test-password');
  assert.equal(await bcrypt.compare('correct-test-password', row.password_hash), true);

  assert.equal(
    (await request('/auth/register', 'POST', {
      name: 'Duplicate',
      email: 'ACCOUNT.PERSISTENCE@example.test',
      password: 'correct-test-password',
    })).status,
    409
  );
});

test('registration rejects malformed emails and short passwords without creating accounts', async () => {
  const before = await get('SELECT COUNT(*) AS count FROM users');
  assert.equal((await request('/auth/register', 'POST', {
    name: 'Invalid Email',
    email: 'not-an-email',
    password: 'correct-test-password',
  })).status, 400);
  assert.equal((await request('/auth/register', 'POST', {
    name: 'Short Password',
    email: 'short-password@example.test',
    password: '12345',
  })).status, 400);
  const after = await get('SELECT COUNT(*) AS count FROM users');
  assert.equal(after.count, before.count);
});

test('concurrent registrations cannot create duplicate accounts', async () => {
  const results = await Promise.all([
    request('/auth/register', 'POST', {
      name: 'Concurrent A',
      email: 'Concurrent@example.test',
      password: 'correct-test-password',
    }),
    request('/auth/register', 'POST', {
      name: 'Concurrent B',
      email: ' concurrent@EXAMPLE.test ',
      password: 'correct-test-password',
    }),
  ]);
  assert.deepEqual(results.map(({ status }) => status).sort(), [201, 409]);
  assert.equal(await get(
    'SELECT COUNT(*) AS count FROM users WHERE email = ? COLLATE NOCASE',
    ['concurrent@example.test']
  ).then((row) => row.count), 1);
});

test('a registered account can log out and log in again using the same credentials', async () => {
  const logout = await request('/auth/logout', 'POST', undefined, token);
  assert.equal(logout.status, 200);

  const login = await request('/auth/login', 'POST', {
    email: ' ACCOUNT.PERSISTENCE@EXAMPLE.TEST ',
    password: 'correct-test-password',
  });
  assert.equal(login.status, 200);
  assert.equal(login.data.user.email, 'account.persistence@example.test');
  assert.ok(login.data.token);

  token = login.data.token;
});
