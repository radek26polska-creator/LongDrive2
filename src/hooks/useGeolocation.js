// src/hooks/useGeolocation.js
import { useState, useEffect, useCallback, useRef } from 'react';

export const useGeolocation = (options = {}) => {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 0,
    autoStart = false,
    watchPosition = false,
    onLocationUpdate = null,
    onError = null,
  } = options;

  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(autoStart);
  const [error, setError] = useState(null);
  const [permission, setPermission] = useState(null);
  const watchIdRef = useRef(null);

  // Sprawdź uprawnienia do geolokalizacji
  const checkPermission = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.permissions || !navigator.permissions.query) {
      setPermission('unknown');
      return;
    }
    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      setPermission(result.state);
      result.addEventListener('change', () => setPermission(result.state));
    } catch (err) {
      setPermission('unknown');
    }
  }, []);

  // Pobierz aktualną pozycję (jednorazowo)
  const getCurrentPosition = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      const errMsg = 'Geolokalizacja nie jest wspierana przez tę przeglądarkę';
      setError(errMsg);
      if (onError) onError(errMsg);
      return Promise.reject(errMsg);
    }

    setLoading(true);
    setError(null);

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const locData = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            altitudeAccuracy: position.coords.altitudeAccuracy,
            heading: position.coords.heading,
            speed: position.coords.speed,
            timestamp: new Date(position.timestamp),
          };
          setLocation(locData);
          setLoading(false);
          resolve(locData);
          if (onLocationUpdate) onLocationUpdate(locData);
        },
        (err) => {
          let errorMsg = 'Błąd pobierania lokalizacji';
          if (err.code === 1) errorMsg = 'Odmówiono dostępu do lokalizacji';
          if (err.code === 2) errorMsg = 'Nie można określić pozycji';
          if (err.code === 3) errorMsg = 'Przekroczono czas oczekiwania na lokalizację';
          setError(errorMsg);
          setLoading(false);
          reject(errorMsg);
          if (onError) onError(errorMsg);
        },
        { enableHighAccuracy, timeout, maximumAge }
      );
    });
  }, [enableHighAccuracy, timeout, maximumAge, onLocationUpdate, onError]);

  // Rozpocznij śledzenie pozycji
  const startWatching = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      const errMsg = 'Geolokalizacja nie jest wspierana';
      setError(errMsg);
      if (onError) onError(errMsg);
      return null;
    }

    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const locData = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          altitudeAccuracy: position.coords.altitudeAccuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
          timestamp: new Date(position.timestamp),
        };
        setLocation(locData);
        setError(null);
        if (onLocationUpdate) onLocationUpdate(locData);
      },
      (err) => {
        let errorMsg = 'Błąd śledzenia lokalizacji';
        if (err.code === 1) errorMsg = 'Odmówiono dostępu do lokalizacji';
        if (err.code === 2) errorMsg = 'Nie można określić pozycji';
        if (err.code === 3) errorMsg = 'Przekroczono czas oczekiwania';
        setError(errorMsg);
        if (onError) onError(errorMsg);
      },
      { enableHighAccuracy, timeout, maximumAge }
    );

    watchIdRef.current = watchId;
    return watchId;
  }, [enableHighAccuracy, timeout, maximumAge, onLocationUpdate, onError]);

  // Zatrzymaj śledzenie
  const stopWatching = useCallback(() => {
    if (watchIdRef.current && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  // Resetuj stan
  const reset = useCallback(() => {
    setLocation(null);
    setError(null);
    setLoading(false);
    stopWatching();
  }, [stopWatching]);

  // Auto-start
  useEffect(() => {
    checkPermission();
    if (autoStart) {
      if (watchPosition) {
        startWatching();
      } else {
        getCurrentPosition();
      }
    }
    return () => {
      if (watchIdRef.current && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [autoStart, watchPosition, checkPermission, startWatching, getCurrentPosition]);

  return {
    location,
    loading,
    error,
    permission,
    getCurrentPosition,
    startWatching,
    stopWatching,
    reset,
    isWatching: !!watchIdRef.current,
  };
};

export default useGeolocation;