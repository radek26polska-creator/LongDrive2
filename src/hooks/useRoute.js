// src/hooks/useRoute.js
import { useState, useCallback, useRef } from 'react';

/**
 * Hook do pobierania trasy drogowej z OSRM (Open Source Routing Machine)
 * Darmowe API, nie wymaga klucza
 */
export const useRoute = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [routeData, setRouteData] = useState(null);
  const abortControllerRef = useRef(null);

  /**
   * Pobiera trasę między dwoma punktami używając OSRM
   * @param {Object} start - { lat, lng, display_name }
   * @param {Object} end - { lat, lng, display_name }
   * @param {Object} options - opcje dodatkowe
   * @returns {Promise<Object>} - dane trasy
   */
  const fetchRoute = useCallback(async (start, end, options = {}) => {
    const {
      profile = 'driving', // driving, walking, cycling
      alternatives = false,
      steps = true,
      geometries = 'geojson',
      overview = 'full',
    } = options;

    if (!start || !end) {
      setError('Wybierz punkt początkowy i końcowy');
      return null;
    }

    // Anuluj poprzednie żądanie
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      // Publiczny serwer OSRM (darmowy, bez klucza API)
      const OSRM_URL = 'https://router.project-osrm.org/route/v1/';
      
      // Format: lng,lat;lng,lat
      const coordString = `${start.lng},${start.lat};${end.lng},${end.lat}`;
      
      const url = `${OSRM_URL}${profile}/${coordString}?overview=${overview}&geometries=${geometries}&steps=${steps}&alternatives=${alternatives}`;
      
      console.log('🚗 Fetching route from OSRM:', url);
      
      const response = await fetch(url, {
        signal: abortControllerRef.current.signal,
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Błąd OSRM: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.routes || data.routes.length === 0) {
        throw new Error('Nie znaleziono trasy między wybranymi punktami');
      }

      const route = data.routes[0];
      
      // Konwersja dystansu (metry → km) i czasu (sekundy → minuty)
      const distanceKm = route.distance / 1000;
      const durationMin = Math.round(route.duration / 60);
      const hours = Math.floor(durationMin / 60);
      const minutes = durationMin % 60;
      
      // Ekstrakcja współrzędnych z GeoJSON - POPRAWIONE: zmiana nazwy zmiennej
      const routeCoordinates = route.geometry.coordinates.map(coord => ({
        lng: coord[0],
        lat: coord[1]
      }));

      const routeInfo = {
        distance: parseFloat(distanceKm.toFixed(1)),
        duration: durationMin,
        durationFormatted: hours > 0 ? `${hours}h ${minutes}min` : `${minutes} min`,
        coordinates: routeCoordinates, // Używamy nowej nazwy
        startAddress: start.display_name || start.name || `${start.lat}, ${start.lng}`,
        endAddress: end.display_name || end.name || `${end.lat}, ${end.lng}`,
        rawRoute: route,
        // Dodatkowe informacje
        legs: route.legs,
        waypoints: data.waypoints,
      };

      setRouteData(routeInfo);
      console.log('✅ Route fetched:', routeInfo.distance, 'km,', routeInfo.durationFormatted);
      
      return routeInfo;
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('🛑 Żądanie anulowane');
        return null;
      }
      console.error('❌ Route fetch error:', err);
      setError(err.message || 'Nie udało się pobrać trasy');
      return null;
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, []);

  /**
   * Pobiera trasę z alternatywnymi ścieżkami
   */
  const fetchRouteWithAlternatives = useCallback(async (start, end) => {
    return fetchRoute(start, end, { alternatives: true });
  }, [fetchRoute]);

  /**
   * Czyści dane trasy
   */
  const clearRoute = useCallback(() => {
    setRouteData(null);
    setError(null);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  /**
   * Anuluje trwające żądanie
   */
  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setLoading(false);
    }
  }, []);

  return {
    fetchRoute,
    fetchRouteWithAlternatives,
    clearRoute,
    cancelRequest,
    routeData,
    loading,
    error
  };
};

export default useRoute;