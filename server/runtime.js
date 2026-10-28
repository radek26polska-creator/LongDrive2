const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const isWindowsRuntime = () => process.env.LONGDRIVE_RUNTIME === 'windows';

const loadOrCreateJwtSecret = (secretPath) => {
  try {
    const secret = fs.readFileSync(secretPath, 'utf8').trim();
    if (secret.length < 64) {
      throw new Error(`JWT secret file is invalid: ${secretPath}`);
    }
    return secret;
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  const secret = crypto.randomBytes(32).toString('hex');
  try {
    fs.writeFileSync(secretPath, secret, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
    return secret;
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
    const existingSecret = fs.readFileSync(secretPath, 'utf8').trim();
    if (existingSecret.length < 64) {
      throw new Error(`JWT secret file is invalid: ${secretPath}`);
    }
    return existingSecret;
  }
};

const prepareRuntime = async () => {
  if (!isWindowsRuntime()) {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET must be set before starting the LongDrive backend.');
    }
    return { isWindowsRuntime: false };
  }

  process.env.NODE_ENV = 'production';
  const dataDirectory = process.env.LONGDRIVE_DATA_DIR ||
    (process.env.LOCALAPPDATA
      ? path.join(process.env.LOCALAPPDATA, 'LongDrive', 'data')
      : null);

  if (!dataDirectory) {
    throw new Error('LOCALAPPDATA or LONGDRIVE_DATA_DIR must be set for Windows runtime.');
  }

  fs.mkdirSync(dataDirectory, { recursive: true });
  process.env.DATABASE_PATH = process.env.DATABASE_PATH ||
    path.join(dataDirectory, 'longdrive.db');
  process.env.JWT_SECRET = loadOrCreateJwtSecret(path.join(dataDirectory, 'jwt.secret'));

  return { isWindowsRuntime: true, dataDirectory };
};

module.exports = { isWindowsRuntime, prepareRuntime };
