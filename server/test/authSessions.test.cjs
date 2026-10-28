const assert = require('node:assert/strict');
const bcrypt = require('bcrypt');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { after, before, test } = require('node:test');

const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'longdrive-auth-sessions-'));
process.env.DATABASE_PATH = path.join(testDirectory, 'test.db');
process.env.NODE_ENV = 'production';
process.env.LONGDRIVE_ALLOW_SQLITE_TESTS = 'true';
process.env.JWT_SECRET = 'test-secret-longdrive-auth-sessions';
process.env.LONGDRIVE_ALLOWED_ORIGINS = 'http://127.0.0.1';
process.env.PORT = '0';

const { startServer } = require('../server');
let runtime;
let db;
let tokenA;
let tokenB;

const request = async (token, route, method = 'GET', body) => {
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

const login = (email, password = 'correct-horse-battery') =>
  request(null, '/auth/login', 'POST', { email, password });

before(async () => {
  runtime = await startServer();
  db = require('../database');
  const passwordHash = await bcrypt.hash('correct-horse-battery', 4);
  await run(
    `INSERT INTO users (id, name, email, password_hash, role)
     VALUES (1, 'Session A', 'session-a@example.test', ?, 'user'),
            (2, 'Session B', 'session-b@example.test', ?, 'user'),
            (3, 'Session C', 'session-c@example.test', ?, 'user')`,
    [passwordHash, passwordHash, passwordHash]
  );
});

after(async () => {
  if (runtime) await runtime.close();
  fs.rmSync(testDirectory, { recursive: true, force: true });
});

test('first login succeeds and its token grants access', async () => {
  const result = await login('session-a@example.test');
  assert.equal(result.status, 200);
  assert.ok(result.data.token);
  tokenA = result.data.token;
  assert.equal((await request(tokenA, '/protected')).status, 200);
});

test('a second login for the same account is blocked without replacing its session', async () => {
  const result = await login('session-a@example.test');
  assert.equal(result.status, 409);
  assert.equal(result.data.code, 'ACCOUNT_SESSION_ACTIVE');
  assert.equal((await request(tokenA, '/protected')).status, 200);
});

test('another account can log in independently', async () => {
  const result = await login('session-b@example.test');
  assert.equal(result.status, 200);
  tokenB = result.data.token;
  assert.equal((await request(tokenB, '/protected')).status, 200);
});

test('login reports missing users and incorrect passwords separately', async () => {
  const missingUser = await login('missing-user@example.test');
  assert.equal(missingUser.status, 404);
  assert.equal(missingUser.data.code, 'USER_NOT_FOUND');
  assert.match(missingUser.data.error, /nie istnieje/i);

  const incorrectPassword = await login('session-a@example.test', 'wrong-password');
  assert.equal(incorrectPassword.status, 401);
  assert.equal(incorrectPassword.data.code, 'INVALID_PASSWORD');
  assert.match(incorrectPassword.data.error, /hasło jest nieprawidłowe/i);
});

test('registration explains short passwords and duplicate email addresses', async () => {
  const shortPassword = await request(null, '/auth/register', 'POST', {
    name: 'New user',
    email: 'new-user@example.test',
    password: '123',
  });
  assert.equal(shortPassword.status, 400);
  assert.match(shortPassword.data.error, /co najmniej 6 znaków/i);

  const duplicateEmail = await request(null, '/auth/register', 'POST', {
    name: 'Duplicate user',
    email: 'session-a@example.test',
    password: 'correct-horse-battery',
  });
  assert.equal(duplicateEmail.status, 409);
  assert.match(duplicateEmail.data.error, /już istnieje/i);
});

test('expired server sessions are rejected and can be replaced by a new login', async () => {
  await run(
    'UPDATE user_sessions SET expires_at = ? WHERE user_id = 2',
    [Math.floor(Date.now() / 1000) - 1]
  );
  assert.equal((await request(tokenB, '/protected')).status, 401);
  const result = await login('session-b@example.test');
  assert.equal(result.status, 200);
});

test('an incorrect password does not revoke the active session', async () => {
  const result = await login('session-a@example.test', 'incorrect-password');
  assert.equal(result.status, 401);
  assert.equal(result.data.code, 'INVALID_PASSWORD');
  assert.equal((await request(tokenA, '/protected')).status, 200);
});

test('logout revokes the server session and the old JWT cannot access protected routes', async () => {
  assert.equal((await request(tokenA, '/auth/logout', 'POST')).status, 200);
  assert.equal((await request(tokenA, '/protected')).status, 401);
});

test('a user can log in again after logout', async () => {
  const result = await login('session-a@example.test');
  assert.equal(result.status, 200);
  tokenA = result.data.token;
});

test('simultaneous logins create only one active session', async () => {
  const results = await Promise.all([
    login('session-c@example.test'),
    login('session-c@example.test'),
  ]);
  assert.deepEqual(results.map(({ status }) => status).sort(), [200, 409]);
  const activeSessions = await get(
    'SELECT COUNT(*) AS count FROM user_sessions WHERE user_id = 3'
  );
  assert.equal(activeSessions.count, 1);
});
