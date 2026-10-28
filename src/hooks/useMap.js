// src/hooks/useMap.js - ROZBUDOWANA WERSJA Z ROUTINGIEM
import { useRef, useState, useEffect, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

export function useMap(mapContainerRef, options = {}) {
  const {
    provider = 'osm',
    mapStyle = 'road',
    initialCenter = [52.2297, 21.0122],
    initialZoom = 12,
    onLocationUpdate = null,
    onError = null,
  } = options;

  const [map, setMap] = useState(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [tracking, setTracking] = useState(false);
  const watchIdRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const initializedRef = useRef(false);
  
  // Refs dla routingu
  const routeLayerRef = useRef(null);
  const startMarkerRef = useRef(null);
  const endMarkerRef = useRef(null);
  const markersLayerRef = useRef(null);

  const geolocationApi = typeof navigator !== 'undefined' ? navigator.geolocation : null;

  // Inicjalizacja mapy - TYLKO RAZ
  useEffect(() => {
    if (!mapContainerRef.current || initializedRef.current) return;
    initializedRef.current = true;

    let tileLayerUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    let attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
    
    if (mapStyle === 'satellite') {
      tileLayerUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      attribution = '&copy; Esri';
    } else if (mapStyle === 'terrain') {
      tileLayerUrl = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
      attribution = '&copy; OpenTopoMap';
    }

    const mapInstance = L.map(mapContainerRef.current).setView(initialCenter, initialZoom);
    L.tileLayer(tileLayerUrl, { attribution, maxZoom: 19 }).addTo(mapInstance);
    
    // Inicjalizacja warstwy markerów
    markersLayerRef.current = L.layerGroup().addTo(mapInstance);
    
    mapInstanceRef.current = mapInstance;
    setMap(mapInstance);
    setIsMapReady(true);

    return () => {
      if (watchIdRef.current && geolocationApi) {
        geolocationApi.clearWatch(watchIdRef.current);
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [mapContainerRef, initialCenter, initialZoom, mapStyle]);

  // Pobierz aktualną lokalizację
  const getCurrentLocation = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!geolocationApi) {
        reject('Geolokalizacja nie jest wspierana');
        return;
      }
      geolocationApi.getCurrentPosition(
        (position) => {
          resolve({ 
            lat: position.coords.latitude, 
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy 
          });
        },
        (error) => reject('Błąd lokalizacji'),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }, []);

  // Start śledzenia
  const startTracking = useCallback(() => {
    if (!geolocationApi || watchIdRef.current) return;
    
    setTracking(true);
    
    const watchId = geolocationApi.watchPosition(
      (position) => {
        const newPosition = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        setCurrentPosition(newPosition);
        if (onLocationUpdate) onLocationUpdate(newPosition);
      },
      (error) => {
        if (onError) onError('Błąd GPS');
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
    
    watchIdRef.current = watchId;
  }, [onLocationUpdate, onError]);

  // Stop śledzenia
  const stopTracking = useCallback(() => {
    if (watchIdRef.current && geolocationApi) {
      geolocationApi.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setTracking(false);
  }, [geolocationApi]);

  // Dodaj marker
  const addMarker = useCallback((latlng, markerOptions = {}) => {
    if (!mapInstanceRef.current) return null;
    const { popup = '', icon = null, id = null } = markerOptions;
    
    const marker = L.marker(latlng, { icon }).addTo(markersLayerRef.current);
    if (popup) marker.bindPopup(popup);
    if (id) marker._customId = id;
    
    return marker;
  }, []);

  // Wyczyść wszystkie markery
  const clearMarkers = useCallback(() => {
    if (markersLayerRef.current) {
      markersLayerRef.current.clearLayers();
    }
  }, []);

  // Narysuj prostą trasę (linia)
  const drawRoute = useCallback((waypoints, routeOptions = {}) => {
    if (!mapInstanceRef.current) return;
    const { color = '#3b82f6', weight = 4, opacity = 0.8 } = routeOptions;
    const latlngs = waypoints.map(w => Array.isArray(w) ? w : [w.lat, w.lng]);
    const route = L.polyline(latlngs, { color, weight, opacity }).addTo(mapInstanceRef.current);
    mapInstanceRef.current.fitBounds(L.latLngBounds(latlngs));
    return route;
  }, []);

  // Wyczyść trasę
  const clearRoute = useCallback(() => {
    // Do implementacji w razie potrzeby
  }, []);

  // ==================== NOWE FUNKCJE ROUTINGU ====================

  /**
   * Rysuje trasę drogową na mapie z markerami start/meta
   * @param {Array} coordinates - tablica punktów {lat, lng}
   * @param {Object} options - opcje trasy
   */
  const drawRoadRoute = useCallback((coordinates, options = {}) => {
    if (!mapInstanceRef.current) {
      console.warn('Mapa nie jest gotowa');
      return null;
    }

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

    if (!coordinates || coordinates.length < 2) {
      console.warn('Za mało punktów do narysowania trasy');
      return null;
    }

    // Konwersja współrzędnych do formatu Leaflet
    const latlngs = coordinates.map(coord => [coord.lat, coord.lng]);
    
    // Utwórz nową trasę
    routeLayerRef.current = L.polyline(latlngs, {
      color,
      weight,
      opacity,
      smoothFactor: 1,
      className: 'route-line'
    }).addTo(mapInstanceRef.current);

    // Dodaj marker startu
    if (startMarker && coordinates.length > 0) {
      const start = coordinates[0];
      const popupContent = startPopup || (startAddress ? `<b>Start</b><br>${startAddress}` : `<b>Start</b><br>${start.lat.toFixed(5)}, ${start.lng.toFixed(5)}`);
      
      startMarkerRef.current = L.marker([start.lat, start.lng], {
        icon: L.divIcon({
          html: `<div class="w-8 h-8 bg-green-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold">S</div>`,
          className: 'custom-marker-start',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -16]
        })
      }).addTo(mapInstanceRef.current);
      startMarkerRef.current.bindPopup(popupContent);
    }

    // Dodaj marker mety
    if (endMarker && coordinates.length > 0) {
      const end = coordinates[coordinates.length - 1];
      const popupContent = endPopup || (endAddress ? `<b>Meta</b><br>${endAddress}` : `<b>Meta</b><br>${end.lat.toFixed(5)}, ${end.lng.toFixed(5)}`);
      
      endMarkerRef.current = L.marker([end.lat, end.lng], {
        icon: L.divIcon({
          html: `<div class="w-8 h-8 bg-red-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold">M</div>`,
          className: 'custom-marker-end',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -16]
        })
      }).addTo(mapInstanceRef.current);
      endMarkerRef.current.bindPopup(popupContent);
    }

    // Dopasuj widok mapy do trasy
    if (fitBounds && latlngs.length > 0) {
      const bounds = L.latLngBounds(latlngs);
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
    }

    // Dodaj efekt cienia do linii trasy
    const style = document.createElement('style');
    style.textContent = `
      .route-line {
        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
      }
    `;
    if (!document.querySelector('#route-line-style')) {
      style.id = 'route-line-style';
      document.head.appendChild(style);
    }

    return routeLayerRef.current;
  }, []);

  /**
   * Czyści trasę drogową i markery start/meta
   */
  const clearRoadRoute = useCallback(() => {
    if (routeLayerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }
    if (startMarkerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(startMarkerRef.current);
      startMarkerRef.current = null;
    }
    if (endMarkerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(endMarkerRef.current);
      endMarkerRef.current = null;
    }
  }, []);

  /**
   * Centruje mapę na współrzędnych
   */
  const centerOn = useCallback((lat, lng, zoom = null) => {
    if (mapInstanceRef.current) {
      const currentZoom = zoom !== null ? zoom : mapInstanceRef.current.getZoom();
      mapInstanceRef.current.setView([lat, lng], currentZoom);
    }
  }, []);

  /**
   * Dopasowuje widok do punktów
   */
  const fitBoundsToPoints = useCallback((points, padding = [50, 50]) => {
    if (!mapInstanceRef.current || !points || points.length === 0) return;
    
    const latlngs = points.map(p => [p.lat, p.lng]);
    const bounds = L.latLngBounds(latlngs);
    mapInstanceRef.current.fitBounds(bounds, { padding });
  }, []);

  // Ustaw zoom
  const setZoom = useCallback((zoomLevel) => {
    if (mapInstanceRef.current) mapInstanceRef.current.setZoom(zoomLevel);
  }, []);

  // Centruj na pozycji
  const centerOnPosition = useCallback((position) => {
    if (mapInstanceRef.current && position) {
      mapInstanceRef.current.setView([position.lat, position.lng], mapInstanceRef.current.getZoom());
    }
  }, []);

  // Zoom in/out
  const zoomIn = useCallback(() => mapInstanceRef.current?.zoomIn(), []);
  const zoomOut = useCallback(() => mapInstanceRef.current?.zoomOut(), []);

  // Pobierz instancję mapy
  const getMap = useCallback(() => mapInstanceRef.current, []);

  return {
    map,
    isMapReady,
    currentPosition,
    tracking,
    startTracking,
    stopTracking,
    addMarker,
    clearMarkers,
    drawRoute,
    clearRoute,
    // Nowe funkcje routingu
    drawRoadRoute,
    clearRoadRoute,
    centerOn,
    fitBoundsToPoints,
    getCurrentLocation,
    setZoom,
    centerOnPosition,
    zoomIn,
    zoomOut,
    getMap,
  };
}

export default useMap;