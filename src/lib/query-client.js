import { QueryCache, QueryClient } from '@tanstack/react-query';
import api from '@/api/apiClient';
import { toast } from 'sonner';

export const queryClientInstance = new QueryClient({
  queryCache: new QueryCache({
    onError(error, query) {
      if (query.state.data === undefined) {
        toast.error(`Nie udało się pobrać danych: ${error.message || 'Błąd połączenia z serwerem'}`);
      }
    },
  }),
  defaultOptions: {
    queries: {
      // ✅ DODANE - domyślna funkcja dla wszystkich zapytań
      queryFn: async ({ queryKey }) => {
        const [endpoint] = queryKey;
        
        // Mapowanie endpointów na funkcje API
        const apiMap = {
          'vehicles': () => api.getVehicles(),
          'drivers': () => api.getDrivers(),
          'trips': () => api.getTrips(),
          'services': () => api.getServices(),
          'refuelings': () => api.getRefuels(),
          'key-logs': () => api.getKeyLogs(),
          'keyLogs': () => api.getKeyLogs(),
          'companySettings': () => api.getCompanySettings(),
          'settings': () => api.getCompanySettings(), // alias dla /settings
          'company-settings': () => api.getCompanySettings(),
        };
        
        const apiFn = apiMap[endpoint];
        
        if (!apiFn) {
          throw new Error(`Nieznany endpoint danych: ${endpoint}`);
        }

        const result = await apiFn();
        if (endpoint === 'companySettings' || endpoint === 'settings' || endpoint === 'company-settings') {
          return result;
        }
        if (Array.isArray(result)) return result;
        if (Array.isArray(result?.data)) return result.data;
        throw new Error(`Serwer zwrócił nieprawidłowe dane dla endpointu ${endpoint}`);
      },
      refetchOnWindowFocus: false,  // zmienione na false - mniej zapytań
      refetchOnMount: true,
      staleTime: 5 * 60 * 1000,     // 5 minut - dane są świeże
      gcTime: 10 * 60 * 1000,       // 10 minut w cache
      retry: 1,                     // tylko 1 raz przy błędzie
    },
  },
});