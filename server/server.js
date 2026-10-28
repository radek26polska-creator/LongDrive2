const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { isWindowsRuntime, prepareRuntime } = require('./runtime');

const getAllowedOrigins = () => {
  const configuredOrigins = (process.env.LONGDRIVE_ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (configuredOrigins.some((origin) => {
    if (origin === '*' || origin === 'null') return true;
    if (isWindowsRuntime() && origin === 'longdrive://app') return false;
    try {
      const parsed = new URL(origin);
      return !['http:', 'https:'].includes(parsed.protocol) ||
        parsed.origin !== origin ||
        parsed.pathname !== '/' ||
        parsed.search !== '' ||
        parsed.hash !== '';
    } catch {
      return true;
    }
  })) {
    throw new Error('LONGDRIVE_ALLOWED_ORIGINS must contain exact HTTP(S) origins (or the trusted Windows app origin); wildcards are not allowed.');
  }

  if (configuredOrigins.length) {
    const allowedOrigins = new Set(configuredOrigins);
    return (origin) => Boolean(origin && allowedOrigins.has(origin));
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('LONGDRIVE_ALLOWED_ORIGINS is required in production.');
  }

  if (!isWindowsRuntime()) {
    return (origin) => {
      if (!origin) return false;
      try {
        const url = new URL(origin);
        return ['http:', 'https:'].includes(url.protocol) &&
          ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
      } catch {
        return false;
      }
    };
  }
  return () => false;
};

const startServer = async () => {
  await prepareRuntime();

  const db = require('./database');
  await db.ready;

  const express = require('express');
  const cors = require('cors');
  const authRoutes = require('./routes/authRoutes');
  const vehicleRoutes = require('./routes/vehicleRoutes');
  const driverRoutes = require('./routes/driverRoutes');
  const tripRoutes = require('./routes/tripRoutes');
  const serviceRoutes = require('./routes/serviceRoutes');
  const refuelingRoutes = require('./routes/refuelingRoutes');
  const keyLogRoutes = require('./routes/keyLogRoutes');
  const companySettingsRoutes = require('./routes/companySettingsRoutes');
  const userSettingsRoutes = require('./routes/userSettingsRoutes');

  const app = express();
  const portValue = process.env.PORT === undefined ? 5000 : Number(process.env.PORT);
  const host = isWindowsRuntime() ? '127.0.0.1' : (process.env.HOST || undefined);
  const isOriginAllowed = getAllowedOrigins();

  if (!Number.isInteger(portValue) || portValue < 0 || portValue > 65535) {
    throw new Error('PORT must be an integer between 0 and 65535.');
  }

  app.use((req, res, next) => {
    const origin = req.get('Origin');
    if (origin && !isOriginAllowed(origin)) {
      return res.status(403).json({ error: 'Origin niedozwolony' });
    }
    next();
  });
  app.use(cors({
    origin: (origin, callback) => callback(null, Boolean(origin && isOriginAllowed(origin))),
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-LongDrive-Bootstrap-Token'],
  }));
  app.use(express.json({ limit: '3mb' }));

  app.use('/api/auth', authRoutes);
  app.use('/api/vehicles', vehicleRoutes);
  app.use('/api/drivers', driverRoutes);
  app.use('/api/trips', tripRoutes);
  app.use('/api/services', serviceRoutes);
  app.use('/api/refuelings', refuelingRoutes);
  app.use('/api/key-logs', keyLogRoutes);
  app.use('/api/company-settings', companySettingsRoutes);
  app.use('/api/user-settings', userSettingsRoutes);

  app.get('/api/protected', require('./middleware/auth').verifyToken, (req, res) => {
    res.json({ message: 'To jest chroniona trasa', user: req.user });
  });

  app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
  });

  app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint nie istnieje' });
  });

  app.use((err, req, res, next) => {
    console.error('Nieoczekiwany błąd:', err);
    if (err.type === 'entity.too.large') {
      return res.status(413).json({ error: 'Żądanie przekracza dozwolony rozmiar 3 MB' });
    }
    if (err instanceof SyntaxError && Object.prototype.hasOwnProperty.call(err, 'body')) {
      return res.status(400).json({ error: 'Nieprawidłowy format JSON' });
    }
    res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
  });

  const server = await new Promise((resolve, reject) => {
    const listener = host
      ? app.listen(portValue, host, () => resolve(listener))
      : app.listen(portValue, () => resolve(listener));
    listener.once('error', reject);
  });

  const address = server.address();
  const apiBaseUrl = `http://${host || '127.0.0.1'}:${address.port}/api`;
  console.log(`✅ Serwer LongDrive uruchomiony na porcie ${address.port}`);
  console.log(`🌐 ${apiBaseUrl}`);
  console.log(`LONGDRIVE_READY ${JSON.stringify({ apiBaseUrl, host: address.address, port: address.port })}`);

  let closePromise;
  const close = () => {
    if (!closePromise) {
      closePromise = new Promise((resolve, reject) => {
        server.close((serverError) => {
          if (serverError) {
            reject(serverError);
            return;
          }
          db.close((databaseError) => {
            if (databaseError) reject(databaseError);
            else resolve();
          });
        });
      });
    }
    return closePromise;
  };

  return { server, apiBaseUrl, close };
};

if (require.main === module) {
  let runtime;
  const shutdown = async () => {
    try {
      if (runtime) await runtime.close();
      process.exit(0);
    } catch (error) {
      console.error('Nie udało się poprawnie zatrzymać serwera LongDrive:', error);
      process.exit(1);
    }
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  startServer()
    .then((startedRuntime) => {
      runtime = startedRuntime;
    })
    .catch((error) => {
      console.error('Nie udało się uruchomić serwera LongDrive:', error);
      process.exitCode = 1;
    });
}

module.exports = { startServer, getAllowedOrigins };
