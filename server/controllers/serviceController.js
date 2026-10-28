const Service = require('../models/Service');
const Vehicle = require('../models/Vehicle');

const serviceController = {
  async getAll(req, res) {
    try {
      const { vehicleId } = req.query;
      const filters = {};
      if (vehicleId) filters.vehicleId = vehicleId;

      const services = await Service.findAll(filters, req.user.id);
      res.json(services);
    } catch (error) {
      console.error('Błąd podczas pobierania serwisów:', error);
      res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
    }
  },

  async getOne(req, res) {
    try {
      const service = await Service.findById(req.params.id, req.user.id);
      if (!service) {
        return res.status(404).json({ error: 'Serwis nie znaleziony' });
      }
      res.json(service);
    } catch (error) {
      console.error('Błąd podczas pobierania serwisu:', error);
      res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
    }
  },

  async create(req, res) {
    try {
      const { vehicleId, date, description, cost, odometer, invoiceNumber } = req.body;
      if (!vehicleId || !description) {
        return res.status(400).json({ error: 'Pojazd i opis są wymagane' });
      }
      if (!await Vehicle.findById(vehicleId, req.user.id)) {
        return res.status(404).json({ error: 'Pojazd nie znaleziony' });
      }

      const newService = await Service.create({
        vehicleId,
        date,
        description,
        cost,
        odometer,
        invoiceNumber,
        ownerUserId: req.user.id,
      });
      res.status(201).json(newService);
    } catch (error) {
      console.error('Błąd podczas tworzenia serwisu:', error);
      res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
    }
  },

  async update(req, res) {
    try {
      const service = await Service.findById(req.params.id, req.user.id);
      if (!service) {
        return res.status(404).json({ error: 'Serwis nie znaleziony' });
      }

      if (req.body.vehicleId !== undefined &&
          !await Vehicle.findById(req.body.vehicleId, req.user.id)) {
        return res.status(404).json({ error: 'Pojazd nie znaleziony' });
      }
      const updated = await Service.update(req.params.id, req.body, req.user.id);
      res.json(updated);
    } catch (error) {
      console.error('Błąd podczas aktualizacji serwisu:', error);
      res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
    }
  },

  async delete(req, res) {
    try {
      const service = await Service.findById(req.params.id, req.user.id);
      if (!service) {
        return res.status(404).json({ error: 'Serwis nie znaleziony' });
      }

      const result = await Service.delete(req.params.id, req.user.id);
      res.json({ message: 'Serwis usunięty', deleted: result.deleted });
    } catch (error) {
      console.error('Błąd podczas usuwania serwisu:', error);
      res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
    }
  }
};

module.exports = serviceController;