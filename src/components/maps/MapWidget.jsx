import React, { useState, useRef, useEffect } from 'react';
import { Map, Maximize2, Activity, Navigation } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMap } from '@/hooks/useMap';

const MapWidget = ({
  trips = [],
  vehicles = [],
  activeTrip = null,
  mapSettings = {},
  onFullscreen = null,
  onTripClick = null,
  className = '',
}) => {
  const mapContainerRef = useRef(null);
  const [isTracking, setIsTracking] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(null);

  const {
    map,
    isMapReady,
    currentPosition: trackedPosition,
    tracking,
    startTracking,
    stopTracking,
    addMarker,
    clearMarkers,
    drawRoute,
    clearRoute,
    centerOnPosition,
  } = useMap(mapContainerRef, {
    initialCenter: [52.2297, 21.0122],
    initialZoom: mapSettings.defaultZoom || 12,
    provider: mapSettings.provider || 'osm',
    mapStyle: mapSettings.mapStyle || 'road',
    autoCenter: mapSettings.autoCenter !== false,
    onLocationFound: (pos) => setCurrentPosition(pos),
  });

  // Śledzenie GPS
  const toggleTracking = () => {
    if (tracking) {
      stopTracking();
      setIsTracking(false);
    } else {
      startTracking();
      setIsTracking(true);
    }
  };

  // Rysowanie aktywnej trasy
  useEffect(() => {
    if (!isMapReady || !activeTrip) return;

    clearRoute();
    clearMarkers();

    if (activeTrip.startCoordinates && activeTrip.endCoordinates) {
      drawRoute([activeTrip.startCoordinates, activeTrip.endCoordinates], {
        color: '#3b82f6',
        weight: 4,
      });
    }

    if (activeTrip.startCoordinates) {
      addMarker(activeTrip.startCoordinates, {
        title: 'Start',
        popup: `<b>Start trasy</b><br/>${activeTrip.startLocation || ''}`,
      });
    }

    if (activeTrip.endCoordinates) {
      addMarker(activeTrip.endCoordinates, {
        title: 'Meta',
        popup: `<b>Koniec trasy</b><br/>${activeTrip.endLocation || ''}`,
      });
    }

    return () => {
      clearRoute();
      clearMarkers();
    };
  }, [isMapReady, activeTrip, drawRoute, clearRoute, addMarker, clearMarkers]);

  // Marker bieżącej pozycji
  useEffect(() => {
    if (!isMapReady || !trackedPosition) return;

    const existingMarker = document.querySelector('.current-marker');
    addMarker([trackedPosition.lat, trackedPosition.lng], {
      title: 'Twoja pozycja',
      popup: `Aktualna pozycja\nDokładność: ${Math.round(trackedPosition.accuracy)}m`,
    });
  }, [isMapReady, trackedPosition, addMarker]);

  // Centrowanie na bieżącej pozycji
  const centerOnCurrentLocation = async () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          centerOnPosition({ lat: latitude, lng: longitude });
        },
        (error) => {
          console.error('Błąd GPS:', error);
        }
      );
    }
  };

  // Aktywne trasy
  const activeTrips = trips.filter(t => t.status === 'in_progress');

  return (
    <GlassCard className={`p-0 overflow-hidden ${className}`}>
      <div className="relative">
        {/* Nagłówek */}
        <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between">
          <div className="flex items-center gap-2 surface-deep/80 backdrop-blur-sm rounded-lg px-3 py-1.5">
            <Map className="w-4 h-4 text-primary" />
            <span className="text-sm text-theme-white">Mapa tras</span>
            {activeTrips.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activeTrips.length} aktywna trasa
              </Badge>
            )}
          </div>
          <div className="flex gap-1">
            <Button
              variant={tracking ? "default" : "outline"}
              size="icon"
              className="w-8 h-8 surface-deep/80 backdrop-blur-sm"
              onClick={toggleTracking}
              title={tracking ? "Zatrzymaj śledzenie" : "Rozpocznij śledzenie"}
            >
              <Navigation className={`w-4 h-4 ${tracking ? 'animate-pulse' : ''}`} />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="w-8 h-8 surface-deep/80 backdrop-blur-sm"
              onClick={centerOnCurrentLocation}
              title="Centruj na mojej pozycji"
            >
              <Activity className="w-4 h-4" />
            </Button>
            {onFullscreen && (
              <Button
                variant="outline"
                size="icon"
                className="w-8 h-8 surface-deep/80 backdrop-blur-sm"
                onClick={onFullscreen}
                title="Pełny ekran"
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Kontener mapy */}
        <div
          ref={mapContainerRef}
          className="w-full h-[300px] surface"
        />

        {/* Aktywne trasy - lista */}
        {activeTrips.length > 0 && (
          <div className="absolute bottom-3 left-3 right-3 z-10">
            <div className="surface-deep/90 backdrop-blur-sm rounded-lg p-2">
              <p className="text-xs text-theme-white-muted mb-2">Aktywne trasy:</p>
              <div className="flex flex-col gap-1">
                {activeTrips.slice(0, 3).map(trip => (
                  <button
                    key={trip.id}
                    onClick={() => onTripClick?.(trip)}
                    className="text-left text-xs text-theme-white hover:text-primary transition-colors p-1 rounded hover:bg-[var(--surface-hover)]"
                  >
                    {trip.startLocation} → {trip.endLocation || 'w trakcie'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Status śledzenia */}
        {tracking && (
          <div className="absolute top-3 right-3 z-10">
            <div className="bg-red-500/90 text-token-primary text-xs px-2 py-1 rounded-full flex items-center gap-1">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              Śledzenie GPS
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  );
};

export default MapWidget;