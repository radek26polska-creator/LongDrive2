// src/hooks/useKeyBlocker.js
import { useQuery } from '@tanstack/react-query';
import api from '@/api/apiClient';
import { accountStorage } from '@/lib/accountStorage';

export const useKeyBlocker = (vehicleId) => {
  // Pobierz ustawienia z API
  const { data: settingsArr } = useQuery({
    queryKey: ['companySettings'],
    queryFn: () => api.getCompanySettings().catch(() => ({})),
  });
  
  // Pobierz wszystkie wpisy kluczyków
  const { data: keyLogs = [] } = useQuery({
    queryKey: ['keyLogs'],
    queryFn: () => api.getKeyLogs().catch(() => []),
  });

  // Pobierz requireKeyForTrip z modules_settings (localStorage)
  const getRequireKeyForTrip = () => {
    try {
      const modulesSettings = accountStorage.getItem('modules_settings');
      if (modulesSettings) {
        const parsed = JSON.parse(modulesSettings);
        console.log('🔑 useKeyBlocker - modules_settings:', parsed);
        return parsed.requireKeyForTrip === true;
      }
    } catch (e) {
      console.error('Błąd odczytu modules_settings:', e);
    }
    
    // Fallback - sprawdź też w companySettings (API)
    const settings = settingsArr && !Array.isArray(settingsArr) 
      ? settingsArr 
      : (Array.isArray(settingsArr) && settingsArr[0]) || {};
    
    return settings.requireKeyForTrip === true;
  };

  const requireKeyForTrip = getRequireKeyForTrip();
  
  console.log('🔑 useKeyBlocker - requireKeyForTrip:', requireKeyForTrip);

  // ✅ ODWRÓCONA LOGIKA - sprawdź, czy kluczyk dla danego pojazdu jest WYDANY (czyli DOZWOLONY)
  const isVehicleKeyIssued = (vId) => {
    if (!vId) return false;
    
    const vehicleLogs = keyLogs.filter(log => {
      return String(log.vehicleId) === String(vId);
    });
    
    if (vehicleLogs.length === 0) return false;
    
    const sortedLogs = [...vehicleLogs].sort((a, b) => {
      const dateA = a.timestamp ? new Date(a.timestamp) : new Date(0);
      const dateB = b.timestamp ? new Date(b.timestamp) : new Date(0);
      return dateB - dateA;
    });
    
    const lastAction = sortedLogs[0]?.action;
    const isIssued = lastAction === 'issued';
    console.log(`🔑 useKeyBlocker - Pojazd ${vId}: ostatnia akcja = ${lastAction}, kluczyk wydany = ${isIssued}`);
    
    return isIssued;
  };

  // Pobierz listę wszystkich pojazdów z WYDANYMI kluczykami (DOZWOLONYCH)
  const getVehiclesWithIssuedKeys = () => {
    const vehicleLastLog = new Map();
    
    keyLogs.forEach(log => {
      if (!log.vehicleId) return;
      
      const vId = String(log.vehicleId);
      const existing = vehicleLastLog.get(vId);
      const logDate = log.timestamp ? new Date(log.timestamp) : new Date(0);
      
      if (!existing || logDate > existing.date) {
        vehicleLastLog.set(vId, {
          log,
          date: logDate
        });
      }
    });
    
    const issued = [];
    vehicleLastLog.forEach((item, vId) => {
      if (item.log.action === 'issued') {
        issued.push({
          vehicleId: vId,
          log: item.log
        });
      }
    });
    
    console.log(`🔑 useKeyBlocker - Pojazdy z wydanymi kluczykami (DOZWOLONE): ${issued.length}`);
    return issued;
  };

  const vehiclesWithIssuedKeys = getVehiclesWithIssuedKeys();
  const issuedVehicleIds = vehiclesWithIssuedKeys.map(issue => issue.vehicleId);
  
  // ✅ ODWRÓCONA LOGIKA BLOKADY:
  // Pojazd jest ZABLOKOWANY jeśli NIE ma wydanego kluczyka
  const isVehicleBlocked = (vId) => {
    if (!vId) return false;
    return !isVehicleKeyIssued(vId);
  };

  // Czy wybrany pojazd jest zablokowany (brak wydanego kluczyka)
  const isSelectedVehicleBlocked = vehicleId ? isVehicleBlocked(vehicleId) : false;
  
  // Globalna blokada - czy są pojazdy BEZ wydanych kluczyków?
  // (Wszystkie dostępne pojazdy powinny mieć wydane kluczyki?)
  const allVehiclesBlocked = requireKeyForTrip && vehicleId ? isSelectedVehicleBlocked : false;
  
  const blockedReason = allVehiclesBlocked
    ? 'Brak wydanego kluczyka dla tego pojazdu. Najpierw pobierz kluczyk w module "Kluczyki".'
    : null;

  // Lista ID pojazdów ZABLOKOWANYCH (bez wydanych kluczyków)
  // Uwaga: to wymaga listy wszystkich pojazdów, więc zwracamy funkcję do sprawdzania
  const blockedVehicleIds = []; // Będziemy sprawdzać dynamicznie

  return {
    requireKeyForTrip,
    keyLogs,
    issuedVehicles: vehiclesWithIssuedKeys,      // pojazdy DOZWOLONE (z wydanymi kluczykami)
    issuedVehicleIds,                            // ID pojazdów DOZWOLONYCH
    isBlocked: allVehiclesBlocked,               // czy pojazd jest ZABLOKOWANY (brak kluczyka)
    blockedReason,
    isVehicleKeyIssued,                          // czy kluczyk wydany (DOZWOLONY)
    isVehicleBlocked,                            // czy pojazd ZABLOKOWANY (brak kluczyka)
    isBlockedForVehicle: isSelectedVehicleBlocked,
    blockedVehicleIds,
  };
};

export default useKeyBlocker;