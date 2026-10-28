const Trip = require('../models/Trip');
const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');
const CompanySettings = require('../models/CompanySettings');

const tripController = {
  async getAll(req, res) {
    try {
      const { status, vehicleId, driverId } = req.query;
      const filters = {};
      if (status) filters.status = status;
      if (vehicleId) filters.vehicleId = vehicleId;
      if (driverId) filters.driverId = driverId;

      const trips = await Trip.findAll(filters, req.user.id);
      res.json(trips);
    } catch (error) {
      console.error('Błąd podczas pobierania tras:', error);
      res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
    }
  },

  async getOne(req, res) {
    try {
      const trip = await Trip.findById(req.params.id, req.user.id);
      if (!trip) {
        return res.status(404).json({ error: 'Trasa nie znaleziona' });
      }
      res.json(trip);
    } catch (error) {
      console.error('Błąd podczas pobierania trasy:', error);
      res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
    }
  },

  async create(req, res) {
    try {
      const {
        vehicleId, driverId, startTime, startDate, startOdometer,
        startLocation, endLocation, purpose, status,
        startFuel, orderedBy
      } = req.body;
      
      if (!vehicleId || !driverId) {
        return res.status(400).json({ error: 'Pojazd i kierowca są wymagane' });
      }

      const vehicle = await Vehicle.findById(vehicleId, req.user.id);
      const driver = await Driver.findById(driverId, req.user.id);
      if (!vehicle || !driver) {
        return res.status(404).json({ error: 'Pojazd lub kierowca nie znaleziony' });
      }
      await CompanySettings.get(req.user.id);
      const cardNumber = await CompanySettings.reserveCardNumber(req.user.id);

      console.log('📝 Tworzenie trasy:', { vehicleId, driverId, startOdometer, startFuel, cardNumber });

      const newTrip = await Trip.create({
        vehicleId,
        driverId,
        startTime: startTime || startDate || new Date().toISOString(),
        startOdometer: startOdometer || 0,
        startLocation,
        endLocation,
        purpose,
        status: status || 'in_progress',
        startFuel: startFuel || 0,
        orderedBy,
        cardNumber,
        vehicleMakeSnapshot: vehicle?.make,
        vehicleModelSnapshot: vehicle?.model,
        vehicleRegistrationSnapshot: vehicle?.registrationNumber,
        vehicleBodyTypeSnapshot: vehicle?.bodyType,
        vehicleFuelConsumptionSnapshot: vehicle?.fuelConsumption,
        vehicleTankSizeSnapshot: vehicle?.tankSize,
        driverNameSnapshot: driver ? `${driver.firstName || ''} ${driver.lastName || ''}`.trim() : null,
        driverTechSignature: driver ? `${driver.firstName || ''} ${driver.lastName || ''}`.trim() : null,
        driverResultsSignature: driver ? `${driver.firstName || ''} ${driver.lastName || ''}`.trim() : null,
        resultsCalculatedBy: driver ? `${driver.firstName || ''} ${driver.lastName || ''}`.trim() : null,
        resultsControlSignature: orderedBy || null,
        arrivalSignature: orderedBy || null,
        fuelIssuedBy: `${driver.firstName || ''} ${driver.lastName || ''}`.trim(),
        ownerUserId: req.user.id
      });
      
      res.status(201).json(newTrip);
    } catch (error) {
      console.error('❌ Błąd podczas tworzenia trasy:', error);
      res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
    }
  },

  async update(req, res) {
    try {
      const trip = await Trip.findById(req.params.id, req.user.id);
      if (!trip) {
        return res.status(404).json({ error: 'Trasa nie znaleziona' });
      }

      const nextVehicleId = req.body.vehicleId ?? trip.vehicleId;
      const nextDriverId = req.body.driverId ?? trip.driverId;
      const [ownedVehicle, ownedDriver] = await Promise.all([
        Vehicle.findById(nextVehicleId, req.user.id),
        Driver.findById(nextDriverId, req.user.id),
      ]);
      if (!ownedVehicle || !ownedDriver) {
        return res.status(404).json({ error: 'Pojazd lub kierowca nie znaleziony' });
      }

      if (req.body.status === 'completed') {
        const vehicle = ownedVehicle;
        if (!Number.isFinite(Number(req.body.endOdometer)) ||
            Number(req.body.endOdometer) < Number(trip.startOdometer)) {
          return res.status(400).json({ error: 'Końcowy licznik musi być większy lub równy początkowemu' });
        }

        const endTime = req.body.endTime || req.body.endDate || new Date().toISOString();
        const hasEndFuel = req.body.endFuel !== undefined && req.body.endFuel !== null &&
          req.body.endFuel !== '';
        if (!hasEndFuel) {
          return res.status(400).json({ error: 'Podaj końcowy stan paliwa przed zamknięciem trasy' });
        }
        const endFuel = hasEndFuel && Number.isFinite(Number(req.body.endFuel))
          ? Number(req.body.endFuel)
          : Number(trip.startFuel || 0) + Number(req.body.fuelAdded || 0) -
            ((Number(req.body.endOdometer) - Number(trip.startOdometer)) / 100) *
            (Number(vehicle.fuelConsumption) > 0 ? Number(vehicle.fuelConsumption) : 7.5);
        const fuelAdded = Number(req.body.fuelAdded || 0);
        if (endFuel < 0 || fuelAdded < 0 ||
            (vehicle.tankSize && (endFuel > vehicle.tankSize || fuelAdded > vehicle.tankSize))) {
          return res.status(400).json({ error: 'Nieprawidłowe dane paliwa dla tej trasy' });
        }

        const distance = Number(req.body.endOdometer) - Number(trip.startOdometer);
        const fuelUsedActual = Number(trip.startFuel || 0) + fuelAdded - endFuel;
        if (fuelUsedActual < 0) {
          return res.status(400).json({ error: 'Końcowy stan paliwa przekracza paliwo dostępne dla tej trasy' });
        }
        const fuelConsumption = Number(trip.vehicleFuelConsumptionSnapshot) > 0
          ? Number(trip.vehicleFuelConsumptionSnapshot)
          : Number(vehicle.fuelConsumption) > 0
            ? Number(vehicle.fuelConsumption)
            : 7.5;
        const fuelUsedNorm = (distance / 100) * fuelConsumption;
        const fuelDiff = fuelUsedNorm - fuelUsedActual;
        const completedData = {
          ...req.body,
          endTime,
          endOdometer: Number(req.body.endOdometer),
          endFuel,
          fuelAdded,
          distance,
          fuelUsed: fuelUsedActual,
          fuelUsedNorm,
          fuelUsedActual,
          fuelSavings: fuelDiff > 0 ? fuelDiff : null,
          fuelOveruse: fuelDiff < 0 ? Math.abs(fuelDiff) : null,
          status: 'completed'
        };
        if (trip.status === 'completed') {
          const updated = await Trip.update(req.params.id, completedData, req.user.id);
          return res.json(updated);
        }

        const updated = await Trip.complete(
          req.params.id,
          completedData,
          trip.vehicleId,
          fuelAdded > 0 ? {
            date: endTime.split('T')[0],
            liters: fuelAdded,
            cost: req.body.fuelCost,
            invoiceNumber: req.body.fuelReceiptNumber,
            notes: req.body.fuelStation ? `Stacja: ${req.body.fuelStation}` : '',
            fullTank: false
          } : null,
          req.user.id
        );
        return res.json(updated);
      }

      const legacyDates = {
        ...req.body,
        startTime: req.body.startTime || req.body.startDate,
        endTime: req.body.endTime || req.body.endDate
      };
      delete legacyDates.startDate;
      delete legacyDates.endDate;
      const updated = await Trip.update(req.params.id, legacyDates, req.user.id);
      res.json(updated);
    } catch (error) {
      console.error('❌ Błąd podczas aktualizacji trasy:', error);
      res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
    }
  },

  async synchronizeFollowing(req, res) {
    try {
      const expectedPreviousEndOdometer = Number(req.body.expectedPreviousEndOdometer);
      const expectedCorrectedEndOdometer = Number(req.body.expectedCorrectedEndOdometer);
      if (
        !Number.isFinite(expectedPreviousEndOdometer) || expectedPreviousEndOdometer < 0 ||
        !Number.isFinite(expectedCorrectedEndOdometer) || expectedCorrectedEndOdometer < 0
      ) {
        return res.status(400).json({ error: 'Brakuje prawidłowych odczytów licznika.' });
      }
      const result = await Trip.synchronizeFollowing(
        req.params.id,
        expectedPreviousEndOdometer,
        expectedCorrectedEndOdometer,
        req.user.id
      );
      res.json(result);
    } catch (error) {
      if (error.code === 'TRIP_CHAIN_CONFLICT') {
        return res.status(409).json({ error: error.message, code: error.code });
      }
      if (error.code === 'TRIP_NOT_FOUND') {
        return res.status(404).json({ error: error.message });
      }
      console.error('Błąd synchronizacji kolejnych podróży:', error);
      res.status(500).json({ error: 'Nie udało się atomowo zaktualizować kolejnych podróży.' });
    }
  },

  async delete(req, res) {
    try {
      const result = await Trip.delete(req.params.id, req.user.id);
      res.json({ message: 'Trasa usunięta', deleted: result.deleted });
    } catch (error) {
      if (error.code === 'TRIP_NOT_FOUND') {
        return res.status(404).json({ error: error.message });
      }
      if (error.code === 'TRIP_CHAIN_CONFLICT') {
        return res.status(409).json({ error: error.message, code: error.code });
      }
      console.error('Błąd podczas usuwania trasy:', error);
      res.status(500).json({ error: error.message || 'Wewnętrzny błąd serwera' });
    }
  }
};

module.exports = tripController;