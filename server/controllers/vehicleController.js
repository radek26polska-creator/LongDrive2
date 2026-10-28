const Vehicle = require('../models/Vehicle');

const vehicleController = {
  // Pobierz wszystkie pojazdy
  async getAll(req, res) {
    try {
      const { status } = req.query;
      const filters = {};
      if (status) filters.status = status;

      const vehicles = await Vehicle.findAll(filters, req.user.id);
      res.json(vehicles);
    } catch (error) {
      console.error('Błąd podczas pobierania pojazdów:', error);
      res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
    }
  },

  // Pobierz jeden pojazd
  async getOne(req, res) {
    try {
      const vehicle = await Vehicle.findById(req.params.id, req.user.id);
      if (!vehicle) {
        return res.status(404).json({ error: 'Pojazd nie znaleziony' });
      }
      res.json(vehicle);
    } catch (error) {
      console.error('Błąd podczas pobierania pojazdu:', error);
      res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
    }
  },

  // Utwórz nowy pojazd
  async create(req, res) {
    try {
      const {
        make, model, registrationNumber, year, mileage,
        fuelLevel, tankSize, fuelConsumption, status,
        vehicleType, fuelType, engineCapacity, bodyType
      } = req.body;

      if (!make || !model || !registrationNumber) {
        return res.status(400).json({ error: 'Marka, model i numer rejestracyjny są wymagane' });
      }

      const newVehicle = await Vehicle.create({
        make,
        model,
        registrationNumber,
        year,
        mileage,
        fuelLevel,
        tankSize,
        fuelConsumption,
        status,
        vehicleType,
        fuelType,
        engineCapacity,
        bodyType,
        ownerUserId: req.user.id
      });

      res.status(201).json(newVehicle);
    } catch (error) {
      console.error('Błąd podczas tworzenia pojazdu:', error);
      if (error.message?.includes('UNIQUE constraint failed') ||
          error.code === '23505') {
        return res.status(409).json({ error: 'Pojazd z tym numerem rejestracyjnym już istnieje' });
      }
      res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
    }
  },

  // Aktualizuj pojazd
  async update(req, res) {
    try {
      const vehicle = await Vehicle.findById(req.params.id, req.user.id);
      if (!vehicle) {
        return res.status(404).json({ error: 'Pojazd nie znaleziony' });
      }

      const updated = await Vehicle.update(req.params.id, req.body, req.user.id);
      res.json(updated);
    } catch (error) {
      console.error('Błąd podczas aktualizacji pojazdu:', error);
      res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
    }
  },

  // Usuń pojazd
  async delete(req, res) {
    try {
      const vehicle = await Vehicle.findById(req.params.id, req.user.id);
      if (!vehicle) {
        return res.status(404).json({ error: 'Pojazd nie znaleziony' });
      }

      const result = await Vehicle.delete(req.params.id, req.user.id);
      res.json({ message: 'Pojazd usunięty', deleted: result.deleted });
    } catch (error) {
      console.error('Błąd podczas usuwania pojazdu:', error);
      res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
    }
  }
};

module.exports = vehicleController;