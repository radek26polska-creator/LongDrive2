import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigation, Activity, Battery, Satellite, AlertTriangle, RefreshCw, Info } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

const GPSLiveTracker = ({
  vehicle = null,
  onLocationUpdate = null,
  onTripStart = null,
  onTripEnd = null,
  autoTrack = false,
  trackingInterval = 10, // sekundy
  highAccuracy = true,
  className = '',
}) => {
  const [tracking, setTracking] = useState(autoTrack);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [trackHistory, setTrackHistory] = useState([]);
  const [accuracy, setAccuracy] = useState(null);
  const [error, setError] = useState(null);
  const [errorType, setErrorType] = useState(null); // 'permission', 'timeout', 'unavailable', 'general'
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);
  const [watchId, setWatchId] = useState(null);

  // Obliczanie odległości między dwoma punktami (w km)
  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // Promień Ziemi w km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Funkcja do uzyskania komunikatu błędu w zależności od typu
  const getErrorMessage = (err) => {
    let message = '';
    let type = 'general';
    
    switch(err.code) {
      case 1: // PERMISSION_DENIED
        message = 'Dostęp do lokalizacji został zablokowany. Aby włączyć śledzenie GPS, zezwól na dostęp w przeglądarce.';
        type = 'permission';
        break;
      case 2: // POSITION_UNAVAILABLE
        message = 'Nie można określić pozycji. Sprawdź czy GPS jest włączony i masz zasięg.';
        type = 'unavailable';
        break;
      case 3: // TIMEOUT
        message = 'Czas oczekiwania na lokalizację upłynął. Spróbuj ponownie lub odśwież stronę.';
        type = 'timeout';
        break;
      default:
        message = `Błąd GPS: ${err.message}`;
        type = 'general';
    }
    
    return { message, type };
  };

  // Rozpoczęcie śledzenia
  const startTracking = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError('Geolokalizacja nie jest wspierana w tej przeglądarce');
      setErrorType('unavailable');
      return;
    }

    setError(null);
    setErrorType(null);
    setTracking(true);

    const id = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy: acc, speed, heading } = position.coords;
        const timestamp = new Date(position.timestamp);
        
        const newPosition = {
          lat: latitude,
          lng: longitude,
          accuracy: acc,
          speed: speed || 0,
          heading: heading || 0,
          timestamp,
        };

        setCurrentPosition(newPosition);
        setAccuracy(acc);
        setError(null);
        setErrorType(null);

        // Oblicz odległość od ostatniego punktu
        if (trackHistory.length > 0) {
          const lastPos = trackHistory[trackHistory.length - 1];
          const newDistance = calculateDistance(lastPos.lat, lastPos.lng, latitude, longitude);
          setDistance(prev => prev + newDistance);
        }

        // Dodaj do historii
        setTrackHistory(prev => [...prev, newPosition]);

        // Callback dla aktualizacji lokalizacji
        if (onLocationUpdate) {
          onLocationUpdate(newPosition, trackHistory);
        }
      },
      (err) => {
        console.warn('Błąd GPS:', err);
        const { message, type } = getErrorMessage(err);
        setError(message);
        setErrorType(type);
        setTracking(false);
        
        // Zatrzymaj watch jeśli był
        if (watchId && typeof navigator !== 'undefined' && navigator.geolocation) {
          navigator.geolocation.clearWatch(watchId);
          setWatchId(null);
        }
      },
      {
        enableHighAccuracy: highAccuracy,
        maximumAge: 0,
        timeout: 10000,
      }
    );

    setWatchId(id);
  }, [highAccuracy, trackHistory, onLocationUpdate, watchId]);

  // Zatrzymanie śledzenia
  const stopTracking = useCallback(() => {
    if (watchId && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setTracking(false);
  }, [watchId]);

  // Reset śledzenia
  const resetTracking = useCallback(() => {
    setTrackHistory([]);
    setDistance(0);
    setDuration(0);
    setCurrentPosition(null);
    setAccuracy(null);
    setError(null);
    setErrorType(null);
  }, []);

  // Timer dla czasu trwania
  useEffect(() => {
    let interval;
    if (tracking) {
      interval = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [tracking]);

  // Auto-start śledzenia
  useEffect(() => {
    if (autoTrack) {
      startTracking();
    }
    return () => {
      if (watchId && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [autoTrack, startTracking, watchId]);

  // Formatowanie czasu
  const formatDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  // Formatowanie odległości
  const formatDistance = (km) => {
    if (km < 1) return `${Math.round(km * 1000)} m`;
    return `${km.toFixed(2)} km`;
  };

  // Jakość sygnału GPS
  const getAccuracyStatus = () => {
    if (!accuracy) return { color: 'text-token-muted', label: 'brak', icon: AlertTriangle };
    if (accuracy < 10) return { color: 'text-green-400', label: 'Doskonała', icon: Satellite };
    if (accuracy < 30) return { color: 'text-emerald-400', label: 'Dobra', icon: Satellite };
    if (accuracy < 100) return { color: 'text-yellow-400', label: 'Średnia', icon: Activity };
    return { color: 'text-red-400', label: 'Słaba', icon: AlertTriangle };
  };

  const accuracyStatus = getAccuracyStatus();
  const AccuracyIcon = accuracyStatus.icon;

  // Renderowanie komunikatu błędu z przyciskiem pomocy
  const renderError = () => {
    if (!error) return null;
    
    return (
      <div className="mb-4 p-3 bg-red-500/10 rounded-lg border border-red-500/30">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-red-400">{error}</p>
            
            {/* Instrukcje dla błędu uprawnień */}
            {errorType === 'permission' && (
              <div className="mt-2 text-xs text-token-secondary space-y-1">
                <p className="flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  Jak włączyć lokalizację:
                </p>
                <ul className="list-disc list-inside ml-2 space-y-1">
                  <li>Kliknij ikonę 🔒 lub 🛈 w pasku adresu</li>
                  <li>Znajdź opcję &quot;Lokalizacja&quot; lub &quot;Geolokalizacja&quot;</li>
                  <li>Zmień na &quot;Zezwól&quot;</li>
                  <li>Odśwież stronę</li>
                </ul>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.reload()}
                  className="mt-2 gap-1 text-xs"
                >
                  <RefreshCw className="w-3 h-3" />
                  Odśwież stronę
                </Button>
              </div>
            )}
            
            {/* Przycisk ponownej próby dla innych błędów */}
            {errorType !== 'permission' && (
              <Button
                variant="outline"
                size="sm"
                onClick={startTracking}
                className="mt-2 gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Spróbuj ponownie
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <GlassCard className={`p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tracking ? 'bg-red-500/20' : 'bg-slate-700'}`}>
            <Navigation className={`w-5 h-5 ${tracking ? 'text-red-400 animate-pulse' : 'text-token-muted'}`} />
          </div>
          <div>
            <h3 className="text-theme-white font-semibold">Śledzenie GPS na żywo</h3>
            <p className="text-xs text-theme-white-muted">
              {tracking ? 'Aktywne śledzenie pozycji' : 'Śledzenie nieaktywne'}
            </p>
          </div>
        </div>
        
        <Button
          variant={tracking ? "destructive" : "default"}
          size="sm"
          onClick={tracking ? stopTracking : startTracking}
          className="gap-2"
          disabled={errorType === 'permission'}
        >
          <Navigation className="w-4 h-4" />
          {tracking ? 'Zatrzymaj' : 'Start'}
        </Button>
      </div>

      {/* Komunikat błędu z instrukcjami */}
      {renderError()}

      {/* Aktualna pozycja - tylko gdy nie ma błędu uprawnień */}
      <AnimatePresence>
        {currentPosition && !error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 surface-subtle rounded-lg"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-theme-white-muted">Szerokość</p>
                <p className="text-theme-white font-mono text-sm">{currentPosition.lat.toFixed(6)}°</p>
              </div>
              <div>
                <p className="text-xs text-theme-white-muted">Długość</p>
                <p className="text-theme-white font-mono text-sm">{currentPosition.lng.toFixed(6)}°</p>
              </div>
              <div>
                <p className="text-xs text-theme-white-muted">Prędkość</p>
                <p className="text-theme-white">{currentPosition.speed > 0 ? `${currentPosition.speed.toFixed(1)} km/h` : '0 km/h'}</p>
              </div>
              <div>
                <p className="text-xs text-theme-white-muted flex items-center gap-1">
                  <AccuracyIcon className="w-3 h-3" />
                  Dokładność
                </p>
                <p className={`text-sm ${accuracyStatus.color}`}>
                  {accuracy ? `${Math.round(accuracy)} m` : '---'} ({accuracyStatus.label})
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Statystyki trasy - tylko gdy śledzenie aktywne i nie ma błędu */}
      {tracking && !error && (
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center p-2 surface-subtle rounded-lg">
            <p className="text-xs text-theme-white-muted flex items-center justify-center gap-1">
              <Activity className="w-3 h-3" />
              Dystans
            </p>
            <p className="text-lg font-bold text-theme-white">{formatDistance(distance)}</p>
          </div>
          <div className="text-center p-2 surface-subtle rounded-lg">
            <p className="text-xs text-theme-white-muted flex items-center justify-center gap-1">
              <Battery className="w-3 h-3" />
              Czas
            </p>
            <p className="text-lg font-bold text-theme-white">{formatDuration(duration)}</p>
          </div>
        </div>
      )}

      {/* Historia punktów */}
      {trackHistory.length > 0 && !error && (
        <div className="mt-3 pt-3 border-t border-token">
          <p className="text-xs text-theme-white-muted mb-2">
            Zapisane punkty: {trackHistory.length}
          </p>
          <Progress value={Math.min((trackHistory.length / 1000) * 100, 100)} className="h-1" />
          {tracking && currentPosition?.timestamp && (
            <p className="text-xs text-theme-white-muted mt-2">
              Śledzenie aktywne od {currentPosition.timestamp.toLocaleTimeString()}
            </p>
          )}
        </div>
      )}

      {/* Przycisk resetu */}
      {trackHistory.length > 0 && !tracking && !error && (
        <Button
          variant="outline"
          size="sm"
          onClick={resetTracking}
          className="w-full mt-3"
        >
          Resetuj dane śledzenia
        </Button>
      )}
      
      {/* Komunikat gdy nie ma wsparcia dla geolokalizacji */}
      {!navigator.geolocation && (
        <div className="mt-3 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
          <p className="text-sm text-yellow-400 text-center">
            Twoja przeglądarka nie wspiera geolokalizacji
          </p>
        </div>
      )}
    </GlassCard>
  );
};

export default GPSLiveTracker;