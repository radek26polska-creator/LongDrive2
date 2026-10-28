// src/hooks/useMapSearch.js
import { useState, useCallback, useRef } from 'react';

export const useMapSearch = (options = {}) => {
  const {
    provider = 'osm',
    apiKey = null,
    language = 'pl',
    countryCodes = 'pl',
    limit = 10,
    debounceMs = 500,
  } = options;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const searchTimeoutRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Wyszukiwanie przez OpenStreetMap Nominatim (darmowe)
  const searchNominatim = useCallback(async (searchQuery) => {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&addressdetails=1&limit=${limit}&countrycodes=${countryCodes}`;
    const response = await fetch(url, {
      headers: {
        'Accept-Language': language,
        'User-Agent': 'LongDriveApp/1.0',
      },
    });
    if (!response.ok) throw new Error('Błąd wyszukiwania');
    const data = await response.json();
    return data.map(item => ({
      id: item.place_id,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      name: item.display_name.split(',')[0],
      display_name: item.display_name,
      type: item.type,
      importance: item.importance,
      address: item.address,
    }));
  }, [limit, countryCodes, language]);

  // Wyszukiwanie przez Google Maps Geocoding (wymaga klucza API)
  const searchGoogle = useCallback(async (searchQuery) => {
    if (!apiKey) throw new Error('Brak klucza API Google Maps');
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(searchQuery)}&key=${apiKey}&language=${language}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Błąd wyszukiwania');
    const data = await response.json();
    if (data.status !== 'OK') throw new Error(data.error_message || `Błąd API: ${data.status}`);
    return data.results.map(result => ({
      id: result.place_id,
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
      name: result.address_components?.[0]?.long_name || result.formatted_address.split(',')[0],
      display_name: result.formatted_address,
      type: result.types?.[0],
      address: result.address_components,
      viewport: result.geometry.viewport,
    }));
  }, [apiKey, language]);

  // Główna funkcja wyszukiwania
  const search = useCallback(async (searchQuery) => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setResults([]);
      return [];
    }

    // Anuluj poprzednie żądanie
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      let searchResults;
      if (provider === 'google' && apiKey) {
        searchResults = await searchGoogle(searchQuery);
      } else {
        searchResults = await searchNominatim(searchQuery);
      }
      setResults(searchResults);
      return searchResults;
    } catch (err) {
      console.error('Błąd wyszukiwania:', err);
      setError(err.message || 'Nie udało się wyszukać lokalizacji');
      setResults([]);
      return [];
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [provider, apiKey, searchNominatim, searchGoogle]);

  // Wyszukiwanie z debounce
  const searchDebounced = useCallback((searchQuery) => {
    setQuery(searchQuery);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      search(searchQuery);
    }, debounceMs);
  }, [search, debounceMs]);

  // Wybór lokalizacji
  const selectLocation = useCallback((location) => {
    setSelectedLocation(location);
    setQuery(location.display_name || location.name);
    setResults([]);
    return location;
  }, []);

  // Wyczyść wyniki
  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  // Resetuj cały stan
  const reset = useCallback(() => {
    setQuery('');
    setResults([]);
    setSelectedLocation(null);
    setError(null);
    setLoading(false);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return {
    query,
    setQuery,
    results,
    loading,
    error,
    selectedLocation,
    search,
    searchDebounced,
    selectLocation,
    clearResults,
    reset,
  };
};

export default useMapSearch;