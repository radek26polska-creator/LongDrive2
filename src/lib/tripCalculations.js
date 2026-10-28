export const DEFAULT_FUEL_CONSUMPTION = 7.5;

const isNumber = (value) => (
  value !== null &&
  value !== undefined &&
  value !== '' &&
  Number.isFinite(Number(value))
);

export const toNumberOrNull = (value) => (isNumber(value) ? Number(value) : null);

export const getFuelConsumption = (vehicle) => {
  const value = toNumberOrNull(vehicle?.fuelConsumption);
  return {
    value: value !== null && value > 0 ? value : DEFAULT_FUEL_CONSUMPTION,
    source: value !== null && value > 0 ? 'vehicle' : 'default',
  };
};

export const calculateProjectedEndFuel = ({ startFuel, fuelAdded, distance, vehicle }) => {
  const start = toNumberOrNull(startFuel);
  const added = toNumberOrNull(fuelAdded);
  const km = toNumberOrNull(distance);
  if (start === null || added === null || km === null || km < 0) return null;
  const { value: consumption } = getFuelConsumption(vehicle);
  return start + added - ((km / 100) * consumption);
};

export const calculateTripMetrics = ({
  startOdometer,
  endOdometer,
  startFuel,
  endFuel,
  fuelAdded,
  vehicle,
}) => {
  const startKm = toNumberOrNull(startOdometer);
  const endKm = toNumberOrNull(endOdometer);
  const startFuelValue = toNumberOrNull(startFuel);
  const endFuelValue = toNumberOrNull(endFuel);
  const addedFuelValue = toNumberOrNull(fuelAdded);
  const tankSize = toNumberOrNull(vehicle?.tankSize);
  const consumption = getFuelConsumption(vehicle);

  const hasOdometers = startKm !== null && endKm !== null;
  const distance = hasOdometers && endKm >= startKm ? endKm - startKm : null;
  const invalidOdometer = hasOdometers && endKm < startKm;

  const hasFuelForActual = startFuelValue !== null && endFuelValue !== null;
  const normalizedFuelAdded = addedFuelValue === null ? 0 : addedFuelValue;
  const nonNegativeFuel = (
    (startFuelValue === null || startFuelValue >= 0) &&
    (endFuelValue === null || endFuelValue >= 0) &&
    normalizedFuelAdded >= 0
  );
  const fuelWithinTank = nonNegativeFuel && (tankSize === null || (
    (startFuelValue === null || startFuelValue <= tankSize) &&
    (endFuelValue === null || endFuelValue <= tankSize) &&
    normalizedFuelAdded <= tankSize
  ));
  const fuelUsedActual = hasFuelForActual && fuelWithinTank
    ? startFuelValue + normalizedFuelAdded - endFuelValue
    : null;
  const invalidFuel = (
    !fuelWithinTank ||
    (fuelUsedActual !== null && fuelUsedActual < 0)
  );

  const fuelUsedNorm = distance !== null
    ? (distance / 100) * consumption.value
    : null;
  const fuelDifference = fuelUsedNorm !== null && fuelUsedActual !== null && !invalidFuel
    ? fuelUsedNorm - fuelUsedActual
    : null;

  return {
    startOdometer: startKm,
    endOdometer: endKm,
    startFuel: startFuelValue,
    endFuel: endFuelValue,
    fuelAdded: addedFuelValue,
    tankSize,
    fuelConsumption: consumption.value,
    fuelConsumptionSource: consumption.source,
    distance,
    fuelUsedNorm,
    fuelUsedActual: invalidFuel ? null : fuelUsedActual,
    fuelSavings: fuelDifference !== null && fuelDifference > 0 ? fuelDifference : null,
    fuelOveruse: fuelDifference !== null && fuelDifference < 0 ? Math.abs(fuelDifference) : null,
    invalidOdometer,
    invalidFuel,
    hasCompleteOdometers: distance !== null,
    hasCompleteFuel: hasFuelForActual && !invalidFuel,
  };
};

export const validateTripCompletion = ({
  startOdometer,
  endOdometer,
  startFuel,
  endFuel,
  fuelAdded,
  vehicle,
}) => {
  const errors = [];
  const startKm = toNumberOrNull(startOdometer);
  const endKm = toNumberOrNull(endOdometer);
  const added = toNumberOrNull(fuelAdded);

  if (startKm === null) errors.push('Brakuje początkowego stanu licznika.');
  if (endKm === null) errors.push('Podaj końcowy stan licznika.');
  if (startKm !== null && endKm !== null && endKm < startKm) {
    errors.push('Końcowy stan licznika nie może być mniejszy od początkowego.');
  }
  if (toNumberOrNull(startFuel) === null) errors.push('Brakuje początkowego stanu paliwa.');
  if (toNumberOrNull(endFuel) === null) errors.push('Podaj końcowy stan paliwa.');
  if (added === null || added < 0) errors.push('Ilość zatankowanego paliwa musi być liczbą nieujemną.');

  const metrics = calculateTripMetrics({
    startOdometer,
    endOdometer,
    startFuel,
    endFuel,
    fuelAdded,
    vehicle,
  });
  if (metrics.invalidFuel) {
    errors.push(
      metrics.tankSize === null
        ? 'Sprawdź stany paliwa i ilość tankowania.'
        : `Stany paliwa i tankowanie nie mogą przekraczać pojemności baku (${metrics.tankSize} l).`
    );
  }
  if (metrics.fuelUsedActual !== null && metrics.fuelUsedActual < 0) {
    errors.push('Końcowy stan paliwa przekracza paliwo dostępne przed i podczas trasy.');
  }
  return { valid: errors.length === 0, errors, metrics };
};
