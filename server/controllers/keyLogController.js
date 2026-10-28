const KeyLog = require('../models/KeyLog');
const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');

const isValidId = (value) => Number.isSafeInteger(Number(value)) && Number(value) > 0;
const validActions = ['issued', 'returned'];
const isForeignKeyError = (error) =>
  error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY' ||
  (error.code === 'SQLITE_CONSTRAINT' && error.message.includes('FOREIGN KEY constraint failed'));

const keyLogController = {
  async getAll(req, res) {
    try {
      const { vehicleId, driverId, action } = req.query;
      const filters = {};
      if (vehicleId) filters.vehicleId = vehicleId;
      if (driverId) filters.driverId = driverId;
      if (action) filters.action = action;

      const logs = await KeyLog.findAll(filters, req.user.id);
      res.json(logs);
    } catch (error) {
      console.error('Błąd podczas pobierania logów kluczyków:', error);
      res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
    }
  },

  async getOne(req, res) {
    try {
      const log = await KeyLog.findById(req.params.id, req.user.id);
      if (!log) {
        return res.status(404).json({ error: 'Log nie znaleziony' });
      }
      res.json(log);
    } catch (error) {
      console.error('Błąd podczas pobierania logu kluczyków:', error);
      res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
    }
  },

  async create(req, res) {
    try {
      if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
        return res.status(400).json({ error: 'Nieprawidłowe dane logu kluczyków' });
      }

      const { vehicleId, driverId, action, timestamp, notes, issuedBy } = req.body;
      if (!isValidId(vehicleId) || !isValidId(driverId) || !action) {
        return res.status(400).json({ error: 'Pojazd, kierowca i akcja są wymagane' });
      }
      const [vehicle, driver] = await Promise.all([
        Vehicle.findById(Number(vehicleId), req.user.id),
        Driver.findById(Number(driverId), req.user.id),
      ]);
      if (!vehicle || !driver) {
        return res.status(404).json({ error: 'Pojazd lub kierowca nie znaleziony' });
      }
      if (!validActions.includes(action)) {
        return res.status(400).json({ error: 'Akcja musi być "issued" lub "returned"' });
      }
      if (timestamp !== undefined && (typeof timestamp !== 'string' || Number.isNaN(Date.parse(timestamp)))) {
        return res.status(400).json({ error: 'Nieprawidłowa data logu' });
      }
      if ((notes !== undefined && typeof notes !== 'string') ||
          (issuedBy !== undefined && typeof issuedBy !== 'string')) {
        return res.status(400).json({ error: 'Nieprawidłowe uwagi lub osoba wydająca klucz' });
      }

      const newLog = await KeyLog.create({
        vehicleId: Number(vehicleId),
        driverId: Number(driverId),
        action,
        timestamp,
        notes,
        issuedBy,
        ownerUserId: req.user.id
      });
      res.status(201).json(newLog);
    } catch (error) {
      console.error('Błąd podczas tworzenia logu kluczyków:', error);
      if (isForeignKeyError(error)) {
        return res.status(409).json({ error: 'Pojazd lub kierowca nie istnieje' });
      }
      res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
    }
  },

  async getActiveIssues(req, res) {
    try {
      const active = await KeyLog.findActiveIssues(req.user.id);
      res.json(active);
    } catch (error) {
      console.error('Błąd podczas pobierania aktywnych wydań kluczyków:', error);
      res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
    }
  },

  async update(req, res) {
    try {
      if (!isValidId(req.params.id)) {
        return res.status(400).json({ error: 'Nieprawidłowy identyfikator logu' });
      }
      if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
        return res.status(400).json({ error: 'Nieprawidłowe dane aktualizacji logu' });
      }

      const allowedFields = ['vehicleId', 'driverId', 'action', 'timestamp', 'notes', 'issuedBy'];
      const suppliedFields = Object.keys(req.body);
      if (suppliedFields.some((field) => !allowedFields.includes(field)) ||
          !suppliedFields.some((field) => allowedFields.includes(field))) {
        return res.status(400).json({ error: 'Nieprawidłowe pola aktualizacji logu' });
      }

      const { vehicleId, driverId, action, timestamp, notes, issuedBy } = req.body;
      if ((vehicleId !== undefined && !isValidId(vehicleId)) ||
          (driverId !== undefined && !isValidId(driverId))) {
        return res.status(400).json({ error: 'Nieprawidłowy pojazd lub kierowca' });
      }
      const [vehicle, driver] = await Promise.all([
        vehicleId === undefined
          ? Promise.resolve(true)
          : Vehicle.findById(Number(vehicleId), req.user.id),
        driverId === undefined
          ? Promise.resolve(true)
          : Driver.findById(Number(driverId), req.user.id),
      ]);
      if (!vehicle || !driver) {
        return res.status(404).json({ error: 'Pojazd lub kierowca nie znaleziony' });
      }
      if (action !== undefined && !validActions.includes(action)) {
        return res.status(400).json({ error: 'Akcja musi być "issued" lub "returned"' });
      }
      if (timestamp !== undefined && (typeof timestamp !== 'string' || Number.isNaN(Date.parse(timestamp)))) {
        return res.status(400).json({ error: 'Nieprawidłowa data logu' });
      }
      if ((notes !== undefined && typeof notes !== 'string') ||
          (issuedBy !== undefined && typeof issuedBy !== 'string')) {
        return res.status(400).json({ error: 'Nieprawidłowe uwagi lub osoba wydająca klucz' });
      }

      const log = await KeyLog.findById(Number(req.params.id), req.user.id);
      if (!log) {
        return res.status(404).json({ error: 'Log nie znaleziony' });
      }

      const updatedLog = await KeyLog.update(Number(req.params.id), {
        vehicleId: vehicleId === undefined ? undefined : Number(vehicleId),
        driverId: driverId === undefined ? undefined : Number(driverId),
        action,
        timestamp,
        notes,
        issuedBy
      }, req.user.id);
      if (!updatedLog) {
        return res.status(404).json({ error: 'Log nie znaleziony' });
      }

      res.json(updatedLog);
    } catch (error) {
      console.error('Błąd podczas aktualizacji logu kluczyków:', error);
      if (isForeignKeyError(error)) {
        return res.status(409).json({ error: 'Pojazd lub kierowca nie istnieje' });
      }
      res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
    }
  },

  async delete(req, res) {
    try {
      const log = await KeyLog.findById(req.params.id, req.user.id);
      if (!log) {
        return res.status(404).json({ error: 'Log nie znaleziony' });
      }

      const result = await KeyLog.delete(req.params.id, req.user.id);
      res.json({ message: 'Log usunięty', deleted: result.deleted });
    } catch (error) {
      console.error('Błąd podczas usuwania logu kluczyków:', error);
      res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
    }
  }
};

module.exports = keyLogController;