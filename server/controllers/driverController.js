const Driver = require('../models/Driver');

const driverController = {
  async getAll(req, res) {
    try {
      const { status } = req.query;
      const filters = {};
      if (status) filters.status = status;

      const drivers = await Driver.findAll(filters, req.user.id);
      res.json(drivers);
    } catch (error) {
      console.error('Błąd podczas pobierania kierowców:', error);
      res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
    }
  },

  async getOne(req, res) {
    try {
      const driver = await Driver.findById(req.params.id, req.user.id);
      if (!driver) {
        return res.status(404).json({ error: 'Kierowca nie znaleziony' });
      }
      res.json(driver);
    } catch (error) {
      console.error('Błąd podczas pobierania kierowcy:', error);
      res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
    }
  },

  async create(req, res) {
    try {
      const { firstName, lastName, licenseNumber, licenseExpiry, phone, email, status } = req.body;
      if (!firstName || !lastName) {
        return res.status(400).json({ error: 'Imię i nazwisko są wymagane' });
      }

      const newDriver = await Driver.create({
        firstName,
        lastName,
        licenseNumber,
        licenseExpiry,
        phone,
        email,
        status,
        ownerUserId: req.user.id,
      });
      res.status(201).json(newDriver);
    } catch (error) {
      console.error('Błąd podczas tworzenia kierowcy:', error);
      if (error.message?.includes('UNIQUE constraint failed') ||
          error.code === '23505') {
        return res.status(409).json({ error: 'Kierowca z tym numerem prawa jazdy już istnieje' });
      }
      res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
    }
  },

  async update(req, res) {
    try {
      const driver = await Driver.findById(req.params.id, req.user.id);
      if (!driver) {
        return res.status(404).json({ error: 'Kierowca nie znaleziony' });
      }

      const updated = await Driver.update(req.params.id, req.body, req.user.id);
      res.json(updated);
    } catch (error) {
      console.error('Błąd podczas aktualizacji kierowcy:', error);
      res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
    }
  },

  async delete(req, res) {
    try {
      const driver = await Driver.findById(req.params.id, req.user.id);
      if (!driver) {
        return res.status(404).json({ error: 'Kierowca nie znaleziony' });
      }

      const result = await Driver.delete(req.params.id, req.user.id);
      res.json({ message: 'Kierowca usunięty', deleted: result.deleted });
    } catch (error) {
      console.error('Błąd podczas usuwania kierowcy:', error);
      res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
    }
  }
};

module.exports = driverController;