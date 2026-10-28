// src/components/maps/RoutePlanner.jsx
import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Navigation, 
  Clock, 
  Route as RouteIcon,
  Loader2,
  AlertCircle,
  RefreshCw,
  X,
  ChevronRight,
  Save,
  Play,
  Crosshair
} from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import LocationSearch from './LocationSearch';
import useRoute from '@/hooks/useRoute';
import { toast } from 'sonner';

const RoutePlanner = ({ 
  mapRef,
  isMapReady = true,
  className = '',
  onRouteCalculated = null,
  editRoute = null,
  onSave = null,
  onStart = null,
}) => {
  const { fetchRoute, clearRoute: clearRouteData, routeData, loading, error } = useRoute();
  
  const [startLocation, setStartLocation] = useState(null);
  const [endLocation, setEndLocation] = useState(null);
  const [routeName, setRouteName] = useState('');
  const [routeCalculated, setRouteCalculated] = useState(false);
  const [showRouteInfo, setShowRouteInfo] = useState(false);
  const [routeColor] = useState('#6366f1');
  const [autoCalculate, setAutoCalculate] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  
  // Stan dla lokalizacji użytkownika
  const [userLocation, setUserLocation] = useState(null);
  const [gettingLocation, setGettingLocation] = useState(false);

  // Pobierz lokalizację użytkownika przy starcie
  useEffect(() => {
    getUserLocation();
  }, []);

  // Funkcja pobierania lokalizacji użytkownika
  const getUserLocation = () => {
    if (!navigator.geolocation) {
      console.warn('Geolokalizacja nie jest wspierana');
      return;
    }

    setGettingLocation(true);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setGettingLocation(false);
        console.log('User location obtained:', { lat: latitude, lng: longitude });
      },
      (error) => {
        console.warn('Nie udało się pobrać lokalizacji:', error.message);
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
    );
  };

  // Wczytaj edytowaną trasę
  useEffect(() => {
    if (editRoute) {
      setStartLocation(editRoute.startLocation);
      setEndLocation(editRoute.endLocation);
      setRouteName(editRoute.name || '');
      setIsSaved(false);
      
      if (isMapReady && editRoute.startLocation && editRoute.endLocation) {
        setTimeout(() => {
          handleCalculateRoute();
        }, 100);
      }
    }
  }, [editRoute]);

  // Automatyczne obliczanie trasy
  useEffect(() => {
    if (autoCalculate && startLocation && endLocation && isMapReady && !editRoute) {
      handleCalculateRoute();
    }
  }, [startLocation, endLocation, autoCalculate]);

  const handleStartSelect = useCallback((location) => {
    console.log('Start location selected:', location);
    setStartLocation(location);
    setRouteCalculated(false);
    setIsSaved(false);
    
    if (mapRef?.current) {
      mapRef.current.clearRoadRoute();
    }
    clearRouteData();
    
    if (mapRef?.current && location) {
      mapRef.current.centerOn(location.lat, location.lng, 13);
    }
  }, [mapRef, clearRouteData]);

  const handleEndSelect = useCallback((location) => {
    console.log('End location selected:', location);
    setEndLocation(location);
    setRouteCalculated(false);
    setIsSaved(false);
    
    if (mapRef?.current) {
      mapRef.current.clearRoadRoute();
    }
    clearRouteData();
  }, [mapRef, clearRouteData]);

  const handleSwapLocations = useCallback(() => {
    const temp = startLocation;
    setStartLocation(endLocation);
    setEndLocation(temp);
    setRouteCalculated(false);
    setIsSaved(false);
    
    if (mapRef?.current) {
      mapRef.current.clearRoadRoute();
    }
    clearRouteData();
  }, [startLocation, endLocation, mapRef, clearRouteData]);

  const handleCalculateRoute = useCallback(async () => {
    if (!startLocation || !endLocation) {
      toast.error('Wybierz punkt początkowy i końcowy');
      return;
    }

    if (mapRef?.current) {
      mapRef.current.clearRoadRoute();
    }

    const routeInfo = await fetchRoute(startLocation, endLocation, {
      profile: 'driving',
      overview: 'full',
      geometries: 'geojson',
    });

    if (routeInfo && mapRef?.current) {
      mapRef.current.drawRoadRoute(routeInfo.coordinates, {
        color: routeColor,
        weight: 5,
        opacity: 0.8,
        startMarker: true,
        endMarker: true,
        fitBounds: true,
        startAddress: startLocation.display_name || startLocation.name,
        endAddress: endLocation.display_name || endLocation.name,
      });
      
      setRouteCalculated(true);
      setShowRouteInfo(true);
      
      if (onRouteCalculated) {
        onRouteCalculated(routeInfo);
      }
    }
  }, [startLocation, endLocation, mapRef, fetchRoute, routeColor, onRouteCalculated]);

  const handleClear = useCallback(() => {
    setStartLocation(null);
    setEndLocation(null);
    setRouteName('');
    setRouteCalculated(false);
    setShowRouteInfo(false);
    setIsSaved(false);
    
    if (mapRef?.current) {
      mapRef.current.clearRoadRoute();
    }
    clearRouteData();
  }, [mapRef, clearRouteData]);

  const handleSaveRoute = useCallback(() => {
    if (!startLocation || !endLocation) {
      toast.error('Wybierz punkt początkowy i końcowy');
      return;
    }

    if (!routeCalculated || !routeData) {
      toast.error('Najpierw wyznacz trasę');
      return;
    }

    const routeDataToSave = {
      name: routeName || `Trasa ${new Date().toLocaleDateString('pl-PL')}`,
      startLocation,
      endLocation,
    };

    if (onSave) {
      onSave(routeDataToSave, routeData);
    }
    
    setIsSaved(true);
    toast.success('Trasa zapisana!');
  }, [startLocation, endLocation, routeName, routeData, routeCalculated, onSave]);

  const handleStartRoute = useCallback(() => {
    if (!startLocation || !endLocation) {
      toast.error('Wybierz punkt początkowy i końcowy');
      return;
    }

    if (!routeCalculated || !routeData) {
      toast.error('Najpierw wyznacz trasę');
      return;
    }

    const routeDataToStart = {
      name: routeName || `Trasa ${new Date().toLocaleDateString('pl-PL')}`,
      startLocation,
      endLocation,
      routeInfo: routeData,
    };

    if (onStart) {
      onStart(routeDataToStart, routeData);
    }
  }, [startLocation, endLocation, routeName, routeData, routeCalculated, onStart]);

  const openInGoogleMaps = useCallback(() => {
    if (!startLocation || !endLocation) return;
    
    const startCoords = `${startLocation.lat},${startLocation.lng}`;
    const endCoords = `${endLocation.lat},${endLocation.lng}`;
    const url = `https://www.google.com/maps/dir/${encodeURIComponent(startCoords)}/${encodeURIComponent(endCoords)}`;
    window.open(url, '_blank');
  }, [startLocation, endLocation]);

  const canCalculate = startLocation && endLocation && isMapReady;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Nagłówek */}
      <div className="flex items-center justify-between">
        <h3 className="text-theme-white text-sm font-semibold flex items-center gap-2">
          <RouteIcon className="w-4 h-4 text-primary" />
          {editRoute ? 'Edytuj trasę' : 'Zaplanuj trasę'}
        </h3>
        <div className="flex items-center gap-2">
          {userLocation && (
            <Badge className="bg-green-500/20 text-green-400 text-[10px] flex items-center gap-1">
              <Crosshair className="w-3 h-3" />
              GPS aktywny
            </Badge>
          )}
          <Label className="text-theme-white-muted text-xs">Auto</Label>
          <Switch 
            checked={autoCalculate} 
            onCheckedChange={setAutoCalculate} 
            className="scale-75"
          />
        </div>
      </div>

      {/* Nazwa trasy */}
      <div>
        <Label className="text-theme-white-secondary text-xs mb-1 block">Nazwa trasy</Label>
        <Input 
          value={routeName} 
          onChange={(e) => setRouteName(e.target.value)} 
          placeholder="np. Trasa do klienta" 
          className="surface-overlay border-slate-600 text-theme-white text-sm h-9"
        />
      </div>

      {/* Pola adresowe */}
      <div className="space-y-3">
        <div>
          <Label className="text-theme-white-secondary text-xs mb-1 flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            Punkt startowy
          </Label>
          <LocationSearch
            onLocationSelect={handleStartSelect}
            placeholder="Wpisz adres startowy..."
            inline={true}
            initialValue={startLocation?.display_name || ''}
            showCurrentLocation={true}
            userLocation={userLocation}
          />
          {startLocation && (
            <p className="text-xs text-green-400 mt-1 truncate">
              ✓ {startLocation.display_name || `${startLocation.lat.toFixed(4)}, ${startLocation.lng.toFixed(4)}`}
            </p>
          )}
        </div>

        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 rounded-full surface hover:bg-slate-700"
            onClick={handleSwapLocations}
            disabled={!startLocation || !endLocation}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        <div>
          <Label className="text-theme-white-secondary text-xs mb-1 flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            Punkt docelowy
          </Label>
          <LocationSearch
            onLocationSelect={handleEndSelect}
            placeholder="Wpisz adres docelowy..."
            inline={true}
            initialValue={endLocation?.display_name || ''}
            showCurrentLocation={false}
            userLocation={userLocation}
          />
          {endLocation && (
            <p className="text-xs text-red-400 mt-1 truncate">
              ✓ {endLocation.display_name || `${endLocation.lat.toFixed(4)}, ${endLocation.lng.toFixed(4)}`}
            </p>
          )}
        </div>
      </div>

      {/* Przycisk Wyznacz trasę */}
      <Button
        className="w-full bg-gradient-primary"
        size="sm"
        onClick={handleCalculateRoute}
        disabled={!canCalculate || loading}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Obliczanie...
          </>
        ) : (
          <>
            <Navigation className="w-4 h-4 mr-2" />
            Wyznacz trasę
          </>
        )}
      </Button>

      {/* Przyciski Zapisz i Wyrusz */}
      {routeCalculated && routeData && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={handleSaveRoute}
            disabled={isSaved}
          >
            <Save className="w-4 h-4 mr-1" />
            {isSaved ? 'Zapisano' : 'Zapisz trasę'}
          </Button>
          <Button
            size="sm"
            className="flex-1 bg-green-600 hover:bg-green-700 text-xs"
            onClick={handleStartRoute}
          >
            <Play className="w-4 h-4 mr-1" />
            Wyrusz w trasę
          </Button>
        </div>
      )}

      {/* Informacje o trasie */}
      <AnimatePresence>
        {showRouteInfo && routeData && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <GlassCard className="p-3 bg-primary/5 border-primary/20">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-theme-white text-xs font-semibold">Informacje o trasie</h4>
                <Badge className="bg-primary/20 text-primary text-xs">OSRM</Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <RouteIcon className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-theme-white-muted text-xs">Dystans</p>
                    <p className="text-theme-white font-semibold">{routeData.distance} km</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-green-400" />
                  </div>
                  <div>
                    <p className="text-theme-white-muted text-xs">Czas przejazdu</p>
                    <p className="text-theme-white font-semibold">{routeData.durationFormatted}</p>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-token">
                <div className="flex items-start gap-2">
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <div className="w-0.5 h-6 bg-slate-600 my-0.5" />
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-theme-white truncate">{routeData.startAddress}</p>
                    <p className="text-xs text-theme-white-muted my-1 flex items-center gap-1">
                      <ChevronRight className="w-3 h-3" />
                    </p>
                    <p className="text-xs text-theme-white truncate">{routeData.endAddress}</p>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={openInGoogleMaps}
                >
                  <img 
                    src="https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png" 
                    alt="Google" 
                    className="w-8 h-3 mr-1"
                  />
                  Otwórz w Google
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={handleClear}
                >
                  <X className="w-3 h-3 mr-1" />
                  Wyczyść
                </Button>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Komunikat błędu */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-400">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RoutePlanner;