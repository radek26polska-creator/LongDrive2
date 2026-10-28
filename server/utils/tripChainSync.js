const DEFAULT_FUEL_CONSUMPTION = 7.5;

const toFiniteNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const createConflict = (message) => {
  const error = new Error(message);
  error.code = 'TRIP_CHAIN_CONFLICT';
  return error;
};

const planFollowingTripUpdates = ({
  anchorTrip,
  followingTrips,
  expectedPreviousEndOdometer,
  vehicleFuelConsumption,
}) => {
  const oldAnchorEnd = toFiniteNumber(expectedPreviousEndOdometer);
  const newPreviousEnd = toFiniteNumber(anchorTrip?.endOdometer);

  if (oldAnchorEnd === null || newPreviousEnd === null || newPreviousEnd < 0) {
    throw createConflict('Brakuje prawidłowych danych licznika poprawionej podróży.');
  }

  let previousOriginalEnd = oldAnchorEnd;
  let previousUpdatedEnd = newPreviousEnd;

  return followingTrips.map((trip) => {
    const oldStart = toFiniteNumber(trip.startOdometer);
    const end = toFiniteNumber(trip.endOdometer);

    if (oldStart === null || end === null || end < 0) {
      throw createConflict(`Podróż ${trip.id} nie ma kompletnych odczytów licznika.`);
    }
    if (oldStart !== previousOriginalEnd) {
      throw createConflict(
        `Odczyt początkowy podróży ${trip.id} (${oldStart} km) nie zgadza się z odczytem końcowym poprzedniej podróży (${previousOriginalEnd} km).`
      );
    }

    const newStart = previousUpdatedEnd;
    if (end < newStart) {
      throw createConflict(
        `Po korekcie podróż ${trip.id} miałaby ujemny dystans: licznik końcowy ${end} km jest niższy od nowego początkowego ${newStart} km.`
      );
    }

    const distance = end - newStart;
    const snapshotConsumption = toFiniteNumber(trip.vehicleFuelConsumptionSnapshot);
    const liveConsumption = toFiniteNumber(vehicleFuelConsumption);
    const fuelConsumption = snapshotConsumption > 0
      ? snapshotConsumption
      : liveConsumption > 0
        ? liveConsumption
        : DEFAULT_FUEL_CONSUMPTION;
    const fuelUsedNorm = (distance / 100) * fuelConsumption;
    const startFuel = toFiniteNumber(trip.startFuel);
    const endFuel = toFiniteNumber(trip.endFuel);
    const storedActual = toFiniteNumber(trip.fuelUsedActual);
    if (
      (trip.startFuel !== null && trip.startFuel !== undefined && startFuel === null) ||
      (trip.endFuel !== null && trip.endFuel !== undefined && endFuel === null) ||
      (trip.fuelAdded !== null && trip.fuelAdded !== undefined &&
        trip.fuelAdded !== '' && toFiniteNumber(trip.fuelAdded) === null) ||
      (trip.fuelUsedActual !== null && trip.fuelUsedActual !== undefined &&
        storedActual === null) ||
      startFuel < 0 ||
      endFuel < 0 ||
      toFiniteNumber(trip.fuelAdded) < 0 ||
      storedActual < 0
    ) {
      throw createConflict(`Podróż ${trip.id} zawiera niespójne odczyty paliwa.`);
    }
    const fuelAdded = toFiniteNumber(trip.fuelAdded) ?? 0;
    const calculatedActual = startFuel !== null && endFuel !== null
      ? startFuel + fuelAdded - endFuel
      : null;
    if (calculatedActual !== null && calculatedActual < 0) {
      throw createConflict(`Odczyty paliwa podróży ${trip.id} wskazują ujemne zużycie.`);
    }
    const fuelUsedActual = storedActual ?? calculatedActual;
    const fuelDifference = fuelUsedActual !== null && fuelUsedActual >= 0
      ? fuelUsedNorm - fuelUsedActual
      : null;

    previousOriginalEnd = end;
    previousUpdatedEnd = end;

    return {
      id: trip.id,
      startOdometer: newStart,
      distance,
      fuelUsedNorm,
      fuelSavings: fuelDifference !== null && fuelDifference > 0 ? fuelDifference : null,
      fuelOveruse: fuelDifference !== null && fuelDifference < 0 ? Math.abs(fuelDifference) : null,
    };
  });
};

module.exports = { planFollowingTripUpdates };
