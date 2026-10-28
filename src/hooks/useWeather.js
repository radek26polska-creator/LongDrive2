// src/hooks/useWeather.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { getCurrentWeather, getForecastFromOpenMeteo } from '@/lib/weatherApi';
import { accountStorage } from '@/lib/accountStorage';

export function useWeather(location = null, apiKey = null, autoFetch = true, forecastDays = 5) {
  const [currentWeather, setCurrentWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // Pobierz klucz API z localStorage jeśli nie podano
  const getApiKey = useCallback(() => {
    if (apiKey) return apiKey;
    const savedApi = accountStorage.getItem('api_settings');
    if (savedApi) {
      try {
        const parsed = JSON.parse(savedApi);
        return parsed.openWeatherApiKey || null;
      } catch (e) {
        return null;
      }
    }
    return null;
  }, [apiKey]);

  const fetchWeather = useCallback(async (lat, lng) => {
    const validApiKey = getApiKey();
    if (!validApiKey) {
      if (isMounted.current) {
        setError('Brak klucza API OpenWeatherMap. Dodaj go w ustawieniach.');
        setLoading(false);
      }
      return;
    }

    if (isMounted.current) {
      setLoading(true);
      setError(null);
    }

    try {
      const [current, forecastData] = await Promise.all([
        getCurrentWeather(lat, lng, validApiKey),
        getForecastFromOpenMeteo(lat, lng, forecastDays),
      ]);

      if (isMounted.current) {
        if (current) {
          setCurrentWeather(current);
        } else {
          setError('Nie udało się pobrać bieżącej pogody');
        }
        setForecast(forecastData || []);
        setLastUpdate(new Date());
      }
    } catch (err) {
      console.error('Błąd pobierania pogody:', err);
      if (isMounted.current) {
        setError(err.message || 'Nie udało się pobrać danych pogodowych');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [getApiKey, forecastDays]);

  const fetchWeatherForCurrentLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      if (isMounted.current) setError('Geolokalizacja nie jest wspierana');
      return;
    }
    if (isMounted.current) setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => fetchWeather(position.coords.latitude, position.coords.longitude),
      (err) => {
        console.error('Błąd GPS:', err);
        let errorMsg = 'Nie udało się pobrać lokalizacji';
        if (err.code === 1) errorMsg = 'Brak dostępu do lokalizacji';
        if (err.code === 2) errorMsg = 'Lokalizacja niedostępna';
        if (err.code === 3) errorMsg = 'Limit czasu pobierania lokalizacji';
        if (isMounted.current) setError(errorMsg);
        if (isMounted.current) setLoading(false);
      }
    );
  }, [fetchWeather]);

  // Auto-fetch
  useEffect(() => {
    if (autoFetch) {
      if (location?.lat && location?.lng) {
        fetchWeather(location.lat, location.lng);
      } else if (location?.city) {
        const validApiKey = getApiKey();
        if (validApiKey) {
          const geocodeAndFetch = async () => {
            try {
              const res = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(location.city)},PL&limit=1&appid=${validApiKey}`);
              const data = await res.json();
              if (data?.[0]) fetchWeather(data[0].lat, data[0].lon);
              else if (isMounted.current) setError('Nie znaleziono miasta');
            } catch { if (isMounted.current) setError('Błąd geokodowania'); }
          };
          geocodeAndFetch();
        } else {
          fetchWeatherForCurrentLocation();
        }
      } else {
        fetchWeatherForCurrentLocation();
      }
    }
  }, [autoFetch, location, fetchWeather, fetchWeatherForCurrentLocation, getApiKey]);

  // Odświeżanie co 30 minut
  useEffect(() => {
    if (!autoFetch) return;
    const interval = setInterval(() => {
      if (location?.lat && location?.lng) {
        fetchWeather(location.lat, location.lng);
      } else if (location?.city) {
        const validApiKey = getApiKey();
        if (validApiKey) {
          fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(location.city)},PL&limit=1&appid=${validApiKey}`)
            .then(res => res.json())
            .then(data => data?.[0] && fetchWeather(data[0].lat, data[0].lon))
            .catch(console.error);
        }
      } else {
        fetchWeatherForCurrentLocation();
      }
    }, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [autoFetch, location, fetchWeather, fetchWeatherForCurrentLocation, getApiKey]);

  return {
    currentWeather,
    forecast,
    loading,
    error,
    lastUpdate,
    refresh: location?.lat && location?.lng ? () => fetchWeather(location.lat, location.lng) : fetchWeatherForCurrentLocation,
  };
}

export default useWeather;