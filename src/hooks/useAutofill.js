import { useCallback } from 'react';
import { accountStorage } from '@/lib/accountStorage';

const AUTOFILL_KEYS = {
  lastVehicle: 'autofill_last_vehicle',
  lastDriver: 'autofill_last_driver',
  lastDepartureLocation: 'autofill_last_departure',
  lastDestination: 'autofill_last_destination',
  lastFuelType: 'autofill_last_fuel_type',
  lastServiceType: 'autofill_last_service_type',
};

/**
 * Hook do autofill — zapamiętuje ostatnio używane wartości
 * i proponuje je przy kolejnym otwarciu formularza.
 *
 * Użycie:
 *   const { getAutofill, saveAutofill, applyTripAutofill } = useAutofill();
 *
 *   // Po wyborze pojazdu:
 *   saveAutofill('lastVehicle', { id: vehicle.id, name: vehicle.name });
 *
 *   // W useEffect przy inicializacji:
 *   const autofill = getAutofill('lastVehicle');
 *   if (autofill && !currentValue) setVehicleId(autofill.id);
 */
export function useAutofill() {

  const saveAutofill = useCallback((key, value) => {
    try {
      const storageKey = AUTOFILL_KEYS[key] || `autofill_${key}`;
      accountStorage.setItem(storageKey, JSON.stringify(value));
    } catch (e) {}
  }, []);

  const getAutofill = useCallback((key) => {
    try {
      const storageKey = AUTOFILL_KEYS[key] || `autofill_${key}`;
      const raw = accountStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const clearAutofill = useCallback((key) => {
    const storageKey = AUTOFILL_KEYS[key] || `autofill_${key}`;
    accountStorage.removeItem(storageKey);
  }, []);

  const clearAllAutofill = useCallback(() => {
    Object.values(AUTOFILL_KEYS).forEach(k => accountStorage.removeItem(k));
  }, []);

  /**
   * Zwraca sugestie autofill dla formularza trasy.
   * Użyj przy inicjalizacji formularza AddTrip/EditTrip.
   */
  const getTripAutofill = useCallback(() => {
    return {
      vehicleId: getAutofill('lastVehicle')?.id || '',
      driverId: getAutofill('lastDriver')?.id || '',
      departureLocation: getAutofill('lastDepartureLocation') || '',
      destination: getAutofill('lastDestination') || '',
      fuelType: getAutofill('lastFuelType') || '',
    };
  }, [getAutofill]);

  /**
   * Zapisz dane trasy do autofill po pomyślnym zapisaniu formularza.
   * Wywołaj w onSuccess mutacji.
   */
  const saveTripAutofill = useCallback((tripData, vehicles, drivers) => {
    if (tripData.vehicleId) {
      const vehicle = vehicles?.find(v => v.id === tripData.vehicleId);
      if (vehicle) {
        saveAutofill('lastVehicle', {
          id: vehicle.id,
          name: `${vehicle.brand} ${vehicle.model}`,
          plate: vehicle.plateNumber,
        });
      }
    }
    if (tripData.driverId) {
      const driver = drivers?.find(d => d.id === tripData.driverId);
      if (driver) {
        saveAutofill('lastDriver', {
          id: driver.id,
          name: driver.name,
        });
      }
    }
    if (tripData.departureLocation) {
      saveAutofill('lastDepartureLocation', tripData.departureLocation);
    }
    if (tripData.destination) {
      saveAutofill('lastDestination', tripData.destination);
    }
    if (tripData.fuelType) {
      saveAutofill('lastFuelType', tripData.fuelType);
    }
  }, [saveAutofill]);

  /**
   * Zapisz dane serwisu do autofill.
   */
  const saveServiceAutofill = useCallback((serviceData) => {
    if (serviceData.vehicleId) {
      saveAutofill('lastVehicle', { id: serviceData.vehicleId });
    }
    if (serviceData.serviceType) {
      saveAutofill('lastServiceType', serviceData.serviceType);
    }
  }, [saveAutofill]);

  return {
    saveAutofill,
    getAutofill,
    clearAutofill,
    clearAllAutofill,
    getTripAutofill,
    saveTripAutofill,
    saveServiceAutofill,
  };
}