const Refueling = require('../models/Refueling');
const Vehicle = require('../models/Vehicle');
const Trip = require('../models/Trip');

const refuelingController = {
  async getAll(req, res) {
    try {
      const { vehicleId } = req.query;
      const filters = {};
      if (vehicleId) filters.vehicleId = vehicleId;
      const refuelings = await Refueling.findAll(filters, req.user.id);
      res.json(refuelings);
    } catch (error) {
      console.error('Błąd podczas pobierania tankowań:', error);
      res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
    }
  },

  async getOne(req, res) {
    try {
      const refueling = await Refueling.findById(req.params.id, req.user.id);
      if (!refueling) return res.status(404).json({ error: 'Tankowanie nie znalezione' });
      res.json(refueling);
    } catch (error) {
      console.error('Błąd podczas pobierania tankowania:', error);
      res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
    }
  },

  async create(req, res) {
    try {
      const { vehicleId, date, liters, cost, mileage, invoiceNumber, notes, fullTank, tripId } = req.body;
      if (!vehicleId || !liters || !cost) {
        return res.status(400).json({ error: 'Pojazd, ilość i koszt są wymagane' });
      }
      if (!await Vehicle.findById(vehicleId, req.user.id)) {
        return res.status(404).json({ error: 'Pojazd nie znaleziony' });
      }
      if (tripId) {
        const trip = await Trip.findById(tripId, req.user.id);
        if (!trip || Number(trip.vehicleId) !== Number(vehicleId)) {
          return res.status(404).json({ error: 'Powiązana podróż lub pojazd nie znaleziony' });
        }
      }
      const newRefueling = await Refueling.create({
        vehicleId,
        date,
        liters,
        cost,
        mileage,
        invoiceNumber,
        notes,
        fullTank,
        tripId,
        ownerUserId: req.user.id,
      });
      res.status(201).json(newRefueling);
    } catch (error) {
      console.error('Błąd podczas tworzenia tankowania:', error);
      res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
    }
  },

  async update(req, res) {
    try {
      const refueling = await Refueling.findById(req.params.id, req.user.id);
      if (!refueling) return res.status(404).json({ error: 'Tankowanie nie znalezione' });
      const nextVehicleId = req.body.vehicleId ?? refueling.vehicleId;
      const nextTripId = req.body.tripId === undefined ? refueling.tripId : req.body.tripId;
      if (!await Vehicle.findById(nextVehicleId, req.user.id)) {
        return res.status(404).json({ error: 'Pojazd nie znaleziony' });
      }
      if (nextTripId) {
        const trip = await Trip.findById(nextTripId, req.user.id);
        if (!trip || Number(trip.vehicleId) !== Number(nextVehicleId)) {
          return res.status(404).json({ error: 'Powiązana podróż lub pojazd nie znaleziony' });
        }
      }
      const updated = await Refueling.update(req.params.id, req.body, req.user.id);
      res.json(updated);
    } catch (error) {
      console.error('Błąd podczas aktualizacji tankowania:', error);
      res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
    }
  },

  async delete(req, res) {
    try {
      const refueling = await Refueling.findById(req.params.id, req.user.id);
      if (!refueling) return res.status(404).json({ error: 'Tankowanie nie znalezione' });
      const result = await Refueling.delete(req.params.id, req.user.id);
      res.json({ message: 'Tankowanie usunięte', deleted: result.deleted });
    } catch (error) {
      console.error('Błąd podczas usuwania tankowania:', error);
      res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
    }
  }
};

module.exports = refuelingController;