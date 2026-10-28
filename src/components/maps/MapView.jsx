// src/components/maps/MapView.jsx - WERSJA Z OBSŁUGĄ ZAPISANYCH TRAS
import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { Maximize2, Minimize2, ZoomIn, ZoomOut, Crosshair, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import GlassCard from '@/components/ui/GlassCard';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix dla ikon Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const getGeolocationApi = () => (typeof navigator !== 'undefined' ? navigator.geolocation : null);

const MapView = forwardRef(({
  userLocation = null,
  showLiveTracking = false,
  showRouteMarkers = true,
  mapStyle = 'road',
  autoCenter = true,
  className = '',
  trip = null,
  trackedTrip = null,
  showRoute = true,
  routeColor = '#3b82f6',
  provider = 'osm',
  defaultZoom = 12,
  showMarkers = true,
  onMapReady = null,
  height = '500px',
}, ref) => {
  const mapContainerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [map, setMap] = useState(null);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [tracking, setTracking] = useState(false);
  const userMarkerRef = useRef(null);
  const watchIdRef = useRef(null);
  const tileLayerRef = useRef(null);
  
  // Refs dla routingu
  const routeLayerRef = useRef(null);
  const liveRouteLayerRef = useRef(null);
  const startMarkerRef = useRef(null);
  const endMarkerRef = useRef(null);
  const tripMarkersRef = useRef([]);

  // Ekspozycja metod przez ref
  useImperativeHandle(ref, () => ({
    getMap: () => map,
    
    drawRoadRoute: (coordinates, options = {}) => {
      if (!map) return null;

      const {
        color = '#6366f1',
        weight = 5,
        opacity = 0.8,
        startMarker = true,
        endMarker = true,
        fitBounds = true,
        startPopup = null,
        endPopup = null,
        startAddress = '',
        endAddress = '',
      } = options;

      // Usuń starą trasę i markery
      clearRoadRoute();

      if (!coordinates || coordinates.length < 2) return null;

      const latlngs = coordinates.map(coord => [coord.lat, coord.lng]);
      
      routeLayerRef.current = L.polyline(latlngs, {
        color,
        weight,
        opacity,
        smoothFactor: 1
      }).addTo(map);

      if (startMarker && coordinates.length > 0) {
        const start = coordinates[0];
        const popupContent = startPopup || (startAddress ? `<b>Start</b><br>${startAddress}` : `<b>Start</b><br>${start.lat.toFixed(5)}, ${start.lng.toFixed(5)}`);
        
        startMarkerRef.current = L.marker([start.lat, start.lng], {
          icon: L.divIcon({
            html: `<div class="w-8 h-8 bg-green-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-token-primary text-xs font-bold">S</div>`,
            className: 'custom-marker-start',
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          })
        }).addTo(map);
        startMarkerRef.current.bindPopup(popupContent);
      }

      if (endMarker && coordinates.length > 0) {
        const end = coordinates[coordinates.length - 1];
        const popupContent = endPopup || (endAddress ? `<b>Meta</b><br>${endAddress}` : `<b>Meta</b><br>${end.lat.toFixed(5)}, ${end.lng.toFixed(5)}`);
        
        endMarkerRef.current = L.marker([end.lat, end.lng], {
          icon: L.divIcon({
            html: `<div class="w-8 h-8 bg-red-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-token-primary text-xs font-bold">M</div>`,
            className: 'custom-marker-end',
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          })
        }).addTo(map);
        endMarkerRef.current.bindPopup(popupContent);
      }

      if (fitBounds && latlngs.length > 0) {
        const bounds = L.latLngBounds(latlngs);
        map.fitBounds(bounds, { padding: [50, 50] });
      }

      return routeLayerRef.current;
    },

    clearRoadRoute: () => {
      clearRoadRoute();
    },

    updateLiveRoute: (coordinates) => updateLiveRoute(coordinates),

    clearLiveRoute: () => clearLiveRoute(),

    addMarker: (lat, lng, options = {}) => {
      if (!map) return null;
      const marker = L.marker([lat, lng], options).addTo(map);
      if (options.popup) marker.bindPopup(options.popup);
      return marker;
    },

    clearMarkers: () => {
      tripMarkersRef.current.forEach(m => {
        if (map) map.removeLayer(m);
      });
      tripMarkersRef.current = [];
    },

    centerOn: (lat, lng, zoom = null) => {
      if (map) {
        map.setView([lat, lng], zoom || map.getZoom());
      }
    },

    fitBounds: (points, padding = [50, 50]) => {
      if (map && points.length > 0) {
        const bounds = L.latLngBounds(points.map(p => [p.lat, p.lng]));
        map.fitBounds(bounds, { padding });
      }
    },

    zoomIn: () => map?.zoomIn(),
    zoomOut: () => map?.zoomOut(),
  }));

  const clearRoadRoute = () => {
    if (routeLayerRef.current && map) {
      map.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }
    if (startMarkerRef.current && map) {
      map.removeLayer(startMarkerRef.current);
      startMarkerRef.current = null;
    }
    if (endMarkerRef.current && map) {
      map.removeLayer(endMarkerRef.current);
      endMarkerRef.current = null;
    }
  };

  const updateLiveRoute = (coordinates) => {
    if (!map || !coordinates || coordinates.length < 2) return null;
    const latlngs = coordinates.map(({ lat, lng }) => [lat, lng]);
    if (liveRouteLayerRef.current) {
      liveRouteLayerRef.current.setLatLngs(latlngs);
    } else {
      liveRouteLayerRef.current = L.polyline(latlngs, {
        color: '#6366f1',
        weight: 5,
        opacity: 0.85,
        smoothFactor: 1,
        className: 'route-line',
      }).addTo(map);
    }
    return liveRouteLayerRef.current;
  };

  const clearLiveRoute = () => {
    if (liveRouteLayerRef.current && map) {
      map.removeLayer(liveRouteLayerRef.current);
      liveRouteLayerRef.current = null;
    }
  };

  // Inicjalizacja mapy
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const mapInstance = L.map(mapContainerRef.current).setView([52.2297, 21.0122], defaultZoom);
    setMap(mapInstance);
    
    if (onMapReady) {
      onMapReady(mapInstance);
    }

    return () => {
      const geolocation = getGeolocationApi();
      if (watchIdRef.current && geolocation) {
        geolocation.clearWatch(watchIdRef.current);
      }
      userMarkerRef.current = null;
      tileLayerRef.current = null;
      routeLayerRef.current = null;
      liveRouteLayerRef.current = null;
      startMarkerRef.current = null;
      endMarkerRef.current = null;
      tripMarkersRef.current = [];
      mapInstance.remove();
    };
  }, [defaultZoom]);

  useEffect(() => {
    if (!map) return;

    let tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    let attribution = '&copy; OpenStreetMap contributors';
    if (mapStyle === 'satellite') {
      tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      attribution = '&copy; Esri';
    } else if (mapStyle === 'terrain') {
      tileUrl = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
      attribution = '&copy; OpenTopoMap';
    }

    if (tileLayerRef.current) map.removeLayer(tileLayerRef.current);
    tileLayerRef.current = L.tileLayer(tileUrl, { attribution, maxZoom: 19 }).addTo(map);
  }, [map, mapStyle]);

  // Dodawanie markera gdy zmieni się userLocation
  useEffect(() => {
    if (!map || !userLocation) return;

    const popupContent = `
      <b>Twoja lokalizacja</b><br/>
      Dokładność: ~${Math.round(userLocation.accuracy)}m<br/>
      ${userLocation.lat.toFixed(5)}, ${userLocation.lng.toFixed(5)}
    `;
    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
      userMarkerRef.current.setPopupContent(popupContent);
    } else {
      userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng]).addTo(map);
      userMarkerRef.current.bindPopup(popupContent).openPopup();
    }

    if (autoCenter) {
      map.setView([userLocation.lat, userLocation.lng], map.getZoom());
    }
  }, [map, userLocation, autoCenter]);

  // Obsługa trip/trackedTrip - rysowanie trasy na mapie
  useEffect(() => {
    if (!map) return;
    
    // Wyczyść poprzednie warstwy trasy i markery
    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }
    tripMarkersRef.current.forEach(m => {
      if (map) map.removeLayer(m);
    });
    tripMarkersRef.current = [];
    
    const tripData = trackedTrip || trip;
    if (!tripData) return;

    // Sprawdź czy mamy punkty GPS (zapisana śledzona trasa)
    if (tripData.points && tripData.points.length > 1) {
      // Rysuj linię po punktach GPS
      const latlngs = tripData.points.map(p => [p.lat, p.lng]);
      routeLayerRef.current = L.polyline(latlngs, {
        color: routeColor,
        weight: 5,
        opacity: 0.8,
        smoothFactor: 1
      }).addTo(map);
      
      // Dopasuj widok mapy do trasy
      if (autoCenter) {
        map.fitBounds(L.latLngBounds(latlngs), { padding: [50, 50] });
      }
    } 
    // Jeśli nie ma punktów ale są współrzędne start/meta
    else if (tripData.startCoordinates && tripData.endCoordinates) {
      const latlngs = [
        [tripData.startCoordinates.lat, tripData.startCoordinates.lng],
        [tripData.endCoordinates.lat, tripData.endCoordinates.lng]
      ];
      routeLayerRef.current = L.polyline(latlngs, {
        color: routeColor,
        weight: 4,
        dashArray: '5, 10',
        opacity: 0.7
      }).addTo(map);
      
      if (autoCenter) {
        map.fitBounds(L.latLngBounds(latlngs), { padding: [50, 50] });
      }
    }

    // Dodaj marker startu
    if (tripData.startCoordinates) {
      const startMarker = L.marker([tripData.startCoordinates.lat, tripData.startCoordinates.lng], {
        icon: L.divIcon({
          html: `<div class="w-6 h-6 bg-green-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-token-primary text-xs font-bold">S</div>`,
          className: 'custom-marker-start',
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        })
      }).addTo(map);
      startMarker.bindPopup(`<b>Start</b><br>${tripData.startLocation || ''}`);
      tripMarkersRef.current.push(startMarker);
    }

    // Dodaj marker mety
    if (tripData.endCoordinates) {
      const endMarker = L.marker([tripData.endCoordinates.lat, tripData.endCoordinates.lng], {
        icon: L.divIcon({
          html: `<div class="w-6 h-6 bg-red-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-token-primary text-xs font-bold">M</div>`,
          className: 'custom-marker-end',
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        })
      }).addTo(map);
      endMarker.bindPopup(`<b>Meta</b><br>${tripData.endLocation || ''}`);
      tripMarkersRef.current.push(endMarker);
    }
  }, [map, trip, trackedTrip, routeColor, autoCenter]);

  // Śledzenie GPS
  const startTracking = () => {
    const geolocation = getGeolocationApi();
    if (!geolocation) return;
    
    setTracking(true);
    
    const watchId = geolocation.watchPosition(
      (position) => {
        const newPosition = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        setCurrentPosition(newPosition);
        
        if (map && userMarkerRef.current) {
          userMarkerRef.current.setLatLng([newPosition.lat, newPosition.lng]);
          userMarkerRef.current.getPopup().setContent(`
            <b>Aktualna pozycja</b><br/>
            Dokładność: ~${Math.round(newPosition.accuracy)}m<br/>
            ${newPosition.lat.toFixed(5)}, ${newPosition.lng.toFixed(5)}
          `);
          if (autoCenter) {
            map.setView([newPosition.lat, newPosition.lng], map.getZoom());
          }
        }
      },
      (error) => console.error('Błąd GPS:', error),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
    
    watchIdRef.current = watchId;
  };

  const stopTracking = () => {
    const geolocation = getGeolocationApi();
    if (watchIdRef.current && geolocation) {
      geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setTracking(false);
  };

  const centerOnLocation = () => {
    if (userLocation && map) {
      map.setView([userLocation.lat, userLocation.lng], map.getZoom());
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        map?.setView([pos.coords.latitude, pos.coords.longitude], map.getZoom());
      });
    }
  };

  const toggleFullscreen = () => {
    const container = mapContainerRef.current;
    if (!container) return;
    if (!isFullscreen) {
      container.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  const handleZoomIn = () => map?.zoomIn();
  const handleZoomOut = () => map?.zoomOut();

  return (
    <div className={`relative ${className}`}>
      <div
        ref={mapContainerRef}
        className="w-full h-full min-h-[400px] rounded-xl overflow-hidden surface"
        style={{ height: isFullscreen ? '100vh' : height }}
      />

      {map && (
        <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
          <GlassCard className="p-1 flex flex-col gap-1">
            <Button variant="ghost" size="icon" className="w-8 h-8" onClick={handleZoomIn} title="Przybliż">
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="w-8 h-8" onClick={handleZoomOut} title="Oddal">
              <ZoomOut className="w-4 h-4" />
            </Button>
            <div className="h-px bg-slate-700 my-1" />
            <Button variant="ghost" size="icon" className="w-8 h-8" onClick={centerOnLocation} title="Zlokalizuj mnie">
              <Crosshair className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="w-8 h-8" onClick={toggleFullscreen} title={isFullscreen ? 'Zamknij pełny ekran' : 'Pełny ekran'}>
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
          </GlassCard>
        </div>
      )}

      {showLiveTracking && (
        <div className="absolute bottom-4 left-4 z-10">
          <Button
            variant={tracking ? "default" : "outline"}
            className={`gap-2 ${tracking ? 'bg-red-500 hover:bg-red-600' : ''}`}
            onClick={tracking ? stopTracking : startTracking}
          >
            <Navigation className={`w-4 h-4 ${tracking ? 'animate-pulse' : ''}`} />
            {tracking ? 'Śledzenie aktywne' : 'Rozpocznij śledzenie'}
          </Button>
        </div>
      )}

      {/* Style dla markera lokalizacji */}
      <style jsx>{`
        .pulse-animation {
          animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
          70% { box-shadow: 0 0 0 15px rgba(59, 130, 246, 0); }
          100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }
        .route-line {
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
        }
      `}</style>
    </div>
  );
});

MapView.displayName = 'MapView';

export default MapView;