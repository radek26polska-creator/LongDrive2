// src/pages/MapPage.jsx
import React, { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Map, Navigation, Maximize2, Minimize2,
  Crosshair, Satellite, Clock, X, Plus, Eye,
  Mountain, Route, Save,
  Trash2, ChevronRight,
  AlertTriangle, CheckCircle, Loader2, Car, Power, PowerOff, Wifi, WifiOff, Edit, Play
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import GlassCard from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import MapView from "@/components/maps/MapView";
import TrackedTripsList from "@/components/maps/TrackedTripsList";
import TripDetailsModal from "@/components/maps/TripDetailsModal";
import RoutePlanner from "@/components/maps/RoutePlanner";
import { useTrackedTrips } from "@/hooks/useTrackedTrips";
import api from "@/api/apiClient";
import { useAppSettings } from "@/lib/ThemeContext";
import { toast } from "sonner";
import { accountStorage } from "@/lib/accountStorage";

const SAVED_PLANNED_ROUTES_KEY = "saved_planned_routes";

// Funkcja pomocnicza do formatowania czasu
const formatDuration = (seconds) => {
  if (!seconds) return "0 min";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${minutes} min`;
};

export default function MapPage() {
  const { settings } = useAppSettings();
  const mapRef = useRef(null);
  const watchIdRef = useRef(null);
  const trackingActiveRef = useRef(false);
  const trackingPointsRef = useRef([]);
  const trackingDistanceRef = useRef(0);
  const savedTrackingTripRef = useRef(null);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("live");
  const [fullscreen, setFullscreen] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [selectedTrackedTrip, setSelectedTrackedTrip] = useState(null);
  const [mapView, setMapView] = useState("road");
  const [mapProvider, setMapProvider] = useState("osm");
  const [showTripDetailsModal, setShowTripDetailsModal] = useState(false);
  const [gpsEnabled, setGpsEnabled] = useState(true);
  const [isTracking, setIsTracking] = useState(false);
  const [currentTrackingTrip, setCurrentTrackingTrip] = useState(null);
  const [trackingPoints, setTrackingPoints] = useState([]);
  const [trackingStartTime, setTrackingStartTime] = useState(null);
  const [trackingDistance, setTrackingDistance] = useState(0);
  const [showSavePanel, setShowSavePanel] = useState(false);

  const { trackedTrips, saveTrackedTrip, deleteTrackedTrip } = useTrackedTrips();

  // Stan dla zapisanych zaplanowanych tras
  const [savedPlannedRoutes, setSavedPlannedRoutes] = useState([]);
  const [editingPlannedRoute, setEditingPlannedRoute] = useState(null);

  const [locationSettings, setLocationSettings] = useState({
    gpsEnabled: true,
    highAccuracy: false,
    askForLocationOnStart: true,
    trackLiveRoutes: false,
    saveTripHistory: true,
    autoCenterOnLocation: true,
    trackingInterval: 10,
    googleMapsApiKey: "",
  });

  const [mapSettings, setMapSettings] = useState({
    provider: "osm",
    mapStyle: "road",
    defaultZoom: 12,
    autoCenter: true,
    showMarkers: true,
    showStops: true,
    showTraffic: false,
    saveHistory: true,
    historyRetention: "90",
    routeColors: {
      car: "#3b82f6",
      truck: "#ef4444",
      van: "#10b981",
      bus: "#8b5cf6",
      motorcycle: "#f59e0b",
    },
  });

  const [showRouteMarkers, setShowRouteMarkers] = useState(true);
  const [autoCenter, setAutoCenter] = useState(true);

  const [userLocation, setUserLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [hasAskedForPermission, setHasAskedForPermission] = useState(false);
  const [trackingError, setTrackingError] = useState(null);

  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles"],
    queryFn: api.getVehicles,
  });

  const { data: trips = [] } = useQuery({
    queryKey: ["trips"],
    queryFn: api.getTrips,
  });

  // Wczytaj zapisane zaplanowane trasy
  useEffect(() => {
    const saved = accountStorage.getItem(SAVED_PLANNED_ROUTES_KEY);
    if (saved) {
      try {
        setSavedPlannedRoutes(JSON.parse(saved));
      } catch (e) {
        console.error('Błąd wczytywania zapisanych tras:', e);
      }
    }
  }, []);

  // Wczytaj ustawienia z localStorage
  useEffect(() => {
    const savedLocation = accountStorage.getItem("location_settings");
    if (savedLocation) {
      try {
        const parsed = JSON.parse(savedLocation);
        setLocationSettings(prev => ({ ...prev, ...parsed }));
        setGpsEnabled(parsed.gpsEnabled !== false);
        setAutoCenter(parsed.autoCenterOnLocation !== false);
      } catch (e) {}
    }
    const savedMapSettings = accountStorage.getItem("map_settings");
    if (savedMapSettings) {
      try {
        const parsed = JSON.parse(savedMapSettings);
        setMapSettings(prev => ({ ...prev, ...parsed }));
        setMapProvider(parsed.provider || "osm");
        setMapView(parsed.mapStyle || "road");
        setAutoCenter(parsed.autoCenter !== false);
        setShowRouteMarkers(parsed.showMarkers !== false);
      } catch (e) {}
    }
  }, []);

  useEffect(() => () => {
    trackingActiveRef.current = false;
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  // Automatyczne proszenie o lokalizację
  useEffect(() => {
    if (locationSettings.askForLocationOnStart && gpsEnabled && !hasAskedForPermission && !userLocation) {
      getUserLocation();
    }
  }, [locationSettings.askForLocationOnStart, gpsEnabled]);

  const activeTrips = trips.filter((t) => t.status === "in_progress");

  const getVehicleName = (id) => {
    const vehicle = vehicles.find((v) => v.id === id);
    return vehicle ? `${vehicle.make || vehicle.brand || ""} ${vehicle.model || ""} (${vehicle.registrationNumber || vehicle.licensePlate || ""})` : "Nieznany";
  };

  const getRouteColor = (vehicleId) => {
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    if (!vehicle) return mapSettings.routeColors?.car || "#3b82f6";
    const type = vehicle.type?.toLowerCase();
    switch (type) {
      case "ciężarowe": case "truck": return mapSettings.routeColors?.truck || "#ef4444";
      case "dostawcze": case "van": return mapSettings.routeColors?.van || "#10b981";
      case "bus": case "autobus": return mapSettings.routeColors?.bus || "#8b5cf6";
      case "motocykl": case "motorcycle": return mapSettings.routeColors?.motorcycle || "#f59e0b";
      default: return mapSettings.routeColors?.car || "#3b82f6";
    }
  };

  const toggleFullscreen = () => {
    const mapContainer = document.querySelector(".map-container");
    if (!fullscreen) {
      if (mapContainer?.requestFullscreen) mapContainer.requestFullscreen();
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
    }
    setFullscreen(!fullscreen);
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Pobieranie lokalizacji
  const getUserLocation = () => {
    if (!gpsEnabled) {
      setLocationError("Lokalizator jest wyłączony. Włącz go w ustawieniach.");
      return;
    }
    if (!navigator.geolocation) {
      setLocationError("Twoja przeglądarka nie obsługuje geolokalizacji");
      return;
    }
    setLocationLoading(true);
    setLocationError(null);
    setHasAskedForPermission(true);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        setUserLocation(loc);
        setLocationLoading(false);
        toast.success(`Lokalizacja pobrana! Dokładność: ${Math.round(loc.accuracy)} m`);
      },
      (err) => {
        setLocationLoading(false);
        const messages = {
          1: "Odmówiono dostępu do lokalizacji. Zezwól w ustawieniach przeglądarki.",
          2: "Nie można ustalić lokalizacji. Sprawdź GPS.",
          3: "Przekroczono czas oczekiwania na lokalizację.",
        };
        setLocationError(messages[err.code] || "Błąd lokalizacji");
        toast.error(messages[err.code] || "Błąd lokalizacji");
      },
      { enableHighAccuracy: locationSettings.highAccuracy, timeout: 10000, maximumAge: 0 }
    );
  };

  // Wyłączenie lokalizatora
  const toggleGps = () => {
    const newState = !gpsEnabled;
    setGpsEnabled(newState);
    accountStorage.setItem("gps_enabled", JSON.stringify(newState));
    toast.info(newState ? "Lokalizator włączony" : "Lokalizator wyłączony");
    if (!newState) stopTrackingSession();
  };

  // Test połączenia API
  const testGoogleMapsApi = () => {
    const apiKey = locationSettings.googleMapsApiKey;
    if (!apiKey) {
      toast.error("Brak klucza API Google Maps. Dodaj go w ustawieniach.");
      return;
    }
    toast.loading("Testowanie połączenia z Google Maps API...");
    fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=Warszawa&key=${apiKey}`)
      .then(res => res.json())
      .then(data => {
        toast.dismiss();
        if (data.status === "OK") {
          toast.success("Połączenie z Google Maps API działa poprawnie!");
        } else {
          toast.error(`Błąd API: ${data.status}. Sprawdź klucz.`);
        }
      })
      .catch(err => {
        toast.dismiss();
        toast.error("Nie można połączyć się z Google Maps API");
      });
  };

  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const earthRadiusKm = 6371;
    const deltaLat = (lat2 - lat1) * Math.PI / 180;
    const deltaLng = (lng2 - lng1) * Math.PI / 180;
    const haversine = Math.sin(deltaLat / 2) ** 2
      + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
      * Math.sin(deltaLng / 2) ** 2;
    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  };

  const handleTrackingPosition = (position) => {
    if (!trackingActiveRef.current) return;

    const { latitude, longitude, accuracy } = position.coords;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)
      || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180
      || !Number.isFinite(accuracy) || accuracy > 100) {
      return;
    }

    const timestamp = new Date(position.timestamp || Date.now());
    const newPoint = { lat: latitude, lng: longitude, timestamp, accuracy };
    const previous = trackingPointsRef.current[trackingPointsRef.current.length - 1];
    let distanceFromPrevious = 0;
    if (previous) {
      const elapsedSeconds = (timestamp - new Date(previous.timestamp)) / 1000;
      distanceFromPrevious = calculateDistance(previous.lat, previous.lng, latitude, longitude);
      if (elapsedSeconds <= 0
        || (distanceFromPrevious * 1000 / elapsedSeconds) > 70
        || (distanceFromPrevious < 0.002 && elapsedSeconds < 5)) {
        return;
      }
    }

    const updated = [...trackingPointsRef.current, newPoint];
    trackingPointsRef.current = updated;
    trackingDistanceRef.current += distanceFromPrevious;
    setTrackingPoints(updated);
    setTrackingDistance(trackingDistanceRef.current);
    setUserLocation({ lat: latitude, lng: longitude, accuracy });
    setLocationError(null);
    setTrackingError(null);

    mapRef.current?.updateLiveRoute(updated.map(({ lat, lng }) => ({ lat, lng })));
    if (autoCenter) mapRef.current?.centerOn(latitude, longitude);
  };

  const handleTrackingError = (error) => {
    if (!trackingActiveRef.current) return;
    const errorMessages = {
      1: "Odmówiono dostępu do GPS. Zmień uprawnienia lokalizacji w ustawieniach przeglądarki lub systemu.",
      2: "GPS chwilowo nie może ustalić pozycji. Śledzenie będzie kontynuowane po odzyskaniu sygnału.",
      3: "Pobieranie pozycji GPS przekroczyło limit czasu. Oczekiwanie na kolejny pomiar.",
    };
    const message = errorMessages[error.code] || `Błąd GPS: ${error.message || "nieznany błąd"}`;
    setTrackingError(message);
    if (error.code === 1) {
      toast.error(message);
      stopTrackingSession(false);
    } else {
      setLocationError(message);
    }
  };

  // Rozpoczęcie śledzenia
  const startTrackingSession = () => {
    if (trackingActiveRef.current || watchIdRef.current !== null) return;
    if (!gpsEnabled) {
      toast.error("Lokalizator jest wyłączony. Włącz go najpierw.");
      return;
    }
    if (!navigator.geolocation) {
      const message = "To środowisko nie obsługuje geolokalizacji.";
      setTrackingError(message);
      toast.error(message);
      return;
    }

    trackingActiveRef.current = true;
    trackingPointsRef.current = [];
    trackingDistanceRef.current = 0;
    savedTrackingTripRef.current = null;
    setCurrentTrackingTrip(null);
    setTrackingPoints([]);
    setTrackingDistance(0);
    setTrackingError(null);
    setLocationError(null);
    setIsTracking(true);
    setShowSavePanel(false);
    setTrackingStartTime(new Date());
    setActiveTab("live");
    mapRef.current?.clearLiveRoute();

    try {
      watchIdRef.current = navigator.geolocation.watchPosition(
        handleTrackingPosition,
        handleTrackingError,
        { enableHighAccuracy: locationSettings.highAccuracy, timeout: 15000, maximumAge: 0 }
      );
      toast.success("Rozpoczęto śledzenie trasy GPS");
    } catch (error) {
      trackingActiveRef.current = false;
      watchIdRef.current = null;
      setIsTracking(false);
      const message = `Nie udało się rozpocząć śledzenia GPS: ${error.message}`;
      setTrackingError(message);
      toast.error(message);
    }
  };

  // Zatrzymanie śledzenia
  const stopTrackingSession = (showInsufficientPointsNotice = true) => {
    if (!trackingActiveRef.current && watchIdRef.current === null) return;
    trackingActiveRef.current = false;
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    setIsTracking(false);
    const points = trackingPointsRef.current;
    if (points.length < 2) {
      mapRef.current?.clearLiveRoute();
      setShowSavePanel(false);
      if (showInsufficientPointsNotice) {
        toast.info("Za mało poprawnych punktów GPS, aby zapisać trasę.");
      }
      return;
    }

    mapRef.current?.fitBounds(points.map(({ lat, lng }) => ({ lat, lng })));
    setShowSavePanel(true);
    toast.info("Śledzenie zakończone. Możesz zapisać ślad lub przekazać go do Podróży.");
  };

  // Zapisuje tylko ślad GPS; dane podróży pozostają w formularzu modułu Podróże.
  const saveCurrentTrackedTrip = () => {
    if (savedTrackingTripRef.current) return savedTrackingTripRef.current;
    const points = trackingPointsRef.current;
    if (points.length < 2) {
      toast.error("Nie można zapisać trasy bez co najmniej dwóch poprawnych punktów GPS.");
      return null;
    }

    const startTime = trackingStartTime || new Date(points[0].timestamp);
    const endTime = new Date(points[points.length - 1].timestamp);
    const savedTrip = saveTrackedTrip({
      source: "gps",
      name: `Ślad GPS ${startTime.toLocaleString("pl-PL")}`,
      startLocation: `${points[0].lat.toFixed(5)}, ${points[0].lng.toFixed(5)}`,
      endLocation: `${points[points.length - 1].lat.toFixed(5)}, ${points[points.length - 1].lng.toFixed(5)}`,
      startDate: startTime,
      endDate: endTime,
      startCoordinates: { lat: points[0].lat, lng: points[0].lng },
      endCoordinates: { lat: points[points.length - 1].lat, lng: points[points.length - 1].lng },
      points,
      distance: trackingDistanceRef.current,
      duration: Math.max(0, Math.floor((endTime - startTime) / 1000)),
      status: "completed",
    });
    if (savedTrip) {
      savedTrackingTripRef.current = savedTrip;
      setCurrentTrackingTrip(savedTrip);
      toast.success("Ślad GPS zapisano w zakładce „Zapisane Trasy”.");
    }
    return savedTrip;
  };

  // Odrzucenie trasy
  const discardTrackedTrip = () => {
    setShowSavePanel(false);
    if (savedTrackingTripRef.current) {
      deleteTrackedTrip(savedTrackingTripRef.current.id);
      savedTrackingTripRef.current = null;
      setCurrentTrackingTrip(null);
    }
    setTrackingPoints([]);
    trackingPointsRef.current = [];
    setTrackingDistance(0);
    trackingDistanceRef.current = 0;
    setTrackingStartTime(null);
    if (mapRef.current) {
      mapRef.current.clearLiveRoute();
    }
    toast.info("Trasa została odrzucona");
  };

  // Zapisanie zaplanowanej trasy
  const savePlannedRoute = (routeData, routeInfo) => {
    const newRoute = {
      id: Date.now().toString(),
      name: routeData.name || `Trasa ${savedPlannedRoutes.length + 1}`,
      startLocation: routeData.startLocation,
      endLocation: routeData.endLocation,
      distance: routeInfo?.distance || 0,
      duration: routeInfo?.duration || 0,
      durationFormatted: routeInfo?.durationFormatted || '',
      coordinates: routeInfo?.coordinates || [],
      createdAt: new Date().toISOString(),
    };
    
    const updated = [newRoute, ...savedPlannedRoutes];
    setSavedPlannedRoutes(updated);
    accountStorage.setItem(SAVED_PLANNED_ROUTES_KEY, JSON.stringify(updated));
    toast.success(`Trasa "${newRoute.name}" została zapisana!`);
    setActiveTab("tracked");
    return newRoute;
  };

  // Usunięcie zapisanej zaplanowanej trasy
  const deletePlannedRoute = (id) => {
    const updated = savedPlannedRoutes.filter(r => r.id !== id);
    setSavedPlannedRoutes(updated);
    accountStorage.setItem(SAVED_PLANNED_ROUTES_KEY, JSON.stringify(updated));
    toast.success("Trasa usunięta");
  };

  // Edycja zapisanej trasy
  const editPlannedRoute = (route) => {
    setEditingPlannedRoute(route);
    setActiveTab("planner");
  };

  // Wyświetl trasę na mapie
  const viewPlannedRouteOnMap = (route) => {
    if (mapRef.current && route.coordinates && route.coordinates.length > 0) {
      mapRef.current.clearRoadRoute();
      mapRef.current.drawRoadRoute(route.coordinates, {
        color: '#6366f1',
        weight: 5,
        opacity: 0.8,
        startMarker: true,
        endMarker: true,
        fitBounds: true,
        startAddress: typeof route.startLocation === 'object' 
          ? route.startLocation?.display_name 
          : route.startLocation,
        endAddress: typeof route.endLocation === 'object' 
          ? route.endLocation?.display_name 
          : route.endLocation,
      });
      toast.success(`Wyświetlanie trasy: ${route.name}`);
    }
  };

  // Rozpocznij trasę
  const startRoute = (routeData) => {
    setSelectedTrackedTrip({
      startLocation: typeof routeData.startLocation === 'object' 
        ? routeData.startLocation?.display_name 
        : routeData.startLocation,
      endLocation: typeof routeData.endLocation === 'object' 
        ? routeData.endLocation?.display_name 
        : routeData.endLocation,
      startCoordinates: routeData.startLocation,
      endCoordinates: routeData.endLocation,
      distance: routeData.routeInfo?.distance || 0,
      points: routeData.routeInfo?.coordinates || [],
    });
    setActiveTab("live");
    toast.success(`Rozpoczynanie trasy: ${routeData.name || 'Nowa trasa'}`);
  };

  const exportTrackedTripToTrips = (trip) => {
    if (!trip || !Number.isFinite(Number(trip.distance)) || Number(trip.distance) <= 0) {
      toast.error("Trasa nie zawiera prawidłowego dystansu do przekazania.");
      return;
    }

    const isGpsTrack = trip.source === "gps" || trackedTrips.some(saved => saved.id === trip.id);
    const gpsTrack = isGpsTrack ? (trip.id ? trip : saveCurrentTrackedTrip()) : null;
    if (isGpsTrack && !gpsTrack) return;

    navigate("/trips", {
      state: {
        gpsTripDraft: {
          trackId: gpsTrack?.id || null,
          source: isGpsTrack ? "gps" : "planned",
          startLocation: typeof trip.startLocation === "object"
            ? trip.startLocation?.display_name || trip.startLocation?.name || ""
            : trip.startLocation || "",
          endLocation: typeof trip.endLocation === "object"
            ? trip.endLocation?.display_name || trip.endLocation?.name || ""
            : trip.endLocation || "",
          startDate: trip.startDate || new Date().toISOString(),
          distance: Number(trip.distance),
        },
      },
    });
  };

  // Eksport do Karty Drogowej
  const exportToKartaDrogowa = (trip) => {
    console.log('📄 Generuję Kartę Drogową dla trasy:', trip);
    
    const startLoc = typeof trip.startLocation === 'object' 
      ? (trip.startLocation?.display_name || trip.startLocation?.name || "Start")
      : (trip.startLocation || "Start");
    const endLoc = typeof trip.endLocation === 'object'
      ? (trip.endLocation?.display_name || trip.endLocation?.name || "Cel")
      : (trip.endLocation || "Cel");
    
    toast.success(`📄 Karta drogowa`, {
      description: `${startLoc} → ${endLoc}\nDystans: ${(trip.distance || 0).toFixed(1)} km`,
      duration: 4000,
    });
  };

  // Zapisz zaplanowaną trasę (RoutePlanner)
  const handleRoutePlannerSave = (routeData, routeInfo) => {
    console.log('💾 Zapisywanie zaplanowanej trasy:', routeData);
    const result = savePlannedRoute(routeData, routeInfo);
    if (result) {
      toast.success(`✅ Trasa "${result.name}" została zapisana w zakładce "Zapisane Trasy"`, {
        description: `Dystans: ${result.distance} km | Czas: ${result.durationFormatted}`,
      });
    }
  };

  // Rozpocznij zaplanowaną trasę (RoutePlanner)
  const handleRoutePlannerStart = (routeData, routeInfo) => {
    console.log('🚀 Rozpoczynanie zaplanowanej trasy:', routeData);
    startRoute({ ...routeData, routeInfo });
    toast.success(`🚗 Rozpoczęto nawigację: ${routeData.name || 'Nowa trasa'}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mapa tras"
        subtitle="Wizualizacja tras, śledzenie GPS i planowanie podróży"
        icon={Map}
      />

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Panel boczny */}
        <div className={`${showSidebar ? "lg:w-96" : "lg:w-12"} transition-all duration-300 flex-shrink-0`}>
          <GlassCard className="p-0 overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-token">
              {showSidebar ? (
                <>
                  <h3 className="text-theme-white font-semibold flex items-center gap-2">
                    <Map className="w-4 h-4 text-primary" />
                    Panel mapy
                  </h3>
                  <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => setShowSidebar(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <Button variant="ghost" size="icon" className="w-full h-10" onClick={() => setShowSidebar(true)}>
                  <Eye className="w-4 h-4" />
                </Button>
              )}
            </div>

            {showSidebar && (
              <div className="p-3 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="w-full surface-subtle border border-token p-1">
                    <TabsTrigger value="live" className="flex-1 data-[state=active]:bg-gradient-primary text-xs">Na żywo</TabsTrigger>
                    <TabsTrigger value="tracked" className="flex-1 data-[state=active]:bg-gradient-primary text-xs">Zapisane Trasy</TabsTrigger>
                    <TabsTrigger value="planner" className="flex-1 data-[state=active]:bg-gradient-primary text-xs">Planowanie Trasy</TabsTrigger>
                  </TabsList>

                  {/* Zakładka: Na żywo */}
                  <TabsContent value="live" className="mt-3 space-y-4">
                    <div className="surface-subtle rounded-xl p-3 border border-token">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {gpsEnabled ? <Wifi className="w-4 h-4 text-green-400" /> : <WifiOff className="w-4 h-4 text-red-400" />}
                          <span className="text-theme-white text-sm">Lokalizator</span>
                        </div>
                        <div className="lex items-center gap-2">
                          <Badge className={gpsEnabled ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}>
                            {gpsEnabled ? "WŁĄCZONY" : "WYŁĄCZONY"}
                          </Badge>
                          <Button variant="ghost" size="icon" className="w-8 h-8" onClick={toggleGps}>
                            {gpsEnabled ? <PowerOff className="w-4 h-4 text-red-400" /> : <Power className="w-4 h-4 text-green-400" />}
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="surface-subtle rounded-xl p-3 border border-token">
                      <h4 className="text-theme-white text-sm font-semibold mb-2 flex items-center gap-2">
                        <Crosshair className="w-4 h-4 text-primary" />
                        Moja lokalizacja
                      </h4>
                      {locationError && (
                        <div className="flex items-start gap-2 mb-2 p-2 bg-red-500/10 rounded-lg border border-red-500/20">
                          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                          <p className="text-red-400 text-xs">{locationError}</p>
                        </div>
                      )}
                      {userLocation && !locationError && (
                        <div className="mb-2 p-2 bg-green-500/10 rounded-lg border border-green-500/20">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-400" />
                            <span className="text-green-400 text-xs font-medium">Lokalizacja pobrana</span>
                          </div>
                          <p className="text-xs text-theme-white-secondary mt-1">
                            {userLocation.lat.toFixed(5)}, {userLocation.lng.toFixed(5)}
                          </p>
                          <p className="text-xs text-theme-white-muted">Dokładność: ~{Math.round(userLocation.accuracy)} m</p>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1 bg-gradient-primary text-xs" onClick={getUserLocation} disabled={locationLoading || !gpsEnabled}>
                          {locationLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Crosshair className="w-4 h-4 mr-1" />}
                          {locationLoading ? "Pobieranie..." : "Zlokalizuj mnie"}
                        </Button>
                        <Button size="sm" variant="outline" className="text-xs" onClick={testGoogleMapsApi}>
                          <Wifi className="w-4 h-4 mr-1" />
                          Test API
                        </Button>
                      </div>
                    </div>

                    <div className="surface-subtle rounded-xl p-3 border border-token">
                      <h4 className="text-theme-white text-sm font-semibold mb-3 flex items-center gap-2">
                        <Navigation className="w-4 h-4 text-primary" />
                        Śledzenie trasy
                      </h4>

                      {trackingError && (
                        <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 p-2">
                          <p className="text-xs text-red-300">{trackingError}</p>
                        </div>
                      )}
                      
                      {isTracking && (
                        <div className="mb-3 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-blue-400 text-xs font-medium flex items-center gap-1">
                              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                              Śledzenie AKTYWNE
                            </p>
                            <Badge className="bg-blue-500/20 text-blue-400 text-[10px]">
                              {trackingPoints.length} punktów
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-center">
                            <div className="surface-overlay rounded-lg p-2">
                              <p className="text-theme-white-muted text-[10px]">Dystans</p>
                              <p className="text-theme-white font-bold text-sm">{trackingDistance.toFixed(1)} km</p>
                            </div>
                            <div className="surface-overlay rounded-lg p-2">
                              <p className="text-theme-white-muted text-[10px]">Czas</p>
                              <p className="text-theme-white font-bold text-sm">
                                {trackingStartTime ? Math.floor((new Date() - trackingStartTime) / 60000) : 0} min
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {showSavePanel && trackingPoints.length > 0 && (
                        <div className="mb-3 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="w-4 h-4 text-yellow-400" />
                            <p className="text-yellow-400 text-xs font-medium">Śledzenie zakończone</p>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-center mb-3">
                            <div className="surface-overlay rounded-lg p-2">
                              <p className="text-theme-white-muted text-[10px]">Dystans</p>
                              <p className="text-theme-white font-bold text-sm">{trackingDistance.toFixed(1)} km</p>
                            </div>
                            <div className="surface-overlay rounded-lg p-2">
                              <p className="text-theme-white-muted text-[10px]">Punkty GPS</p>
                              <p className="text-theme-white font-bold text-sm">{trackingPoints.length}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <Button size="sm" disabled={!!currentTrackingTrip} className="bg-green-600 hover:bg-green-700 text-xs" onClick={saveCurrentTrackedTrip}>
                              <Save className="w-3 h-3 mr-1" />
                              {currentTrackingTrip ? "Trasa zapisana" : "Zapisz tę trasę"}
                            </Button>
                            <Button
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-xs"
                              onClick={() => {
                                const savedTrip = saveCurrentTrackedTrip();
                                if (savedTrip) exportTrackedTripToTrips(savedTrip);
                              }}
                            >
                              <Car className="w-3 h-3 mr-1" />
                              Użyj w Podróżach
                            </Button>
                            <Button size="sm" variant="outline" className="col-span-2 text-xs" onClick={discardTrackedTrip}>
                              <Trash2 className="w-3 h-3 mr-1" />
                              Odrzuć
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex gap-2">
                        {!isTracking ? (
                          <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700 text-xs" onClick={startTrackingSession} disabled={!gpsEnabled}>
                            <Navigation className="w-4 h-4 mr-1" />
                            Rozpocznij śledzenie
                          </Button>
                        ) : (
                          <Button size="sm" className="flex-1 bg-red-600 hover:bg-red-700 text-xs" onClick={stopTrackingSession}>
                            <PowerOff className="w-4 h-4 mr-1" />
                            Zakończ śledzenie
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="surface-subtle rounded-xl p-3 border border-token space-y-3">
                      <h4 className="text-theme-white text-sm font-semibold">Ustawienia widoku</h4>
                      {[
                        { label: "Znaczniki trasy", state: showRouteMarkers, set: setShowRouteMarkers },
                        { label: "Auto-centrowanie", state: autoCenter, set: setAutoCenter },
                      ].map(({ label, state, set }) => (
                        <div key={label} className="flex items-center justify-between">
                          <Label className="text-theme-white-secondary text-xs">{label}</Label>
                          <Switch checked={state} onCheckedChange={set} />
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  {/* Zakładka: Zapisane Trasy */}
                  <TabsContent value="tracked" className="mt-3 space-y-3">
                    {/* Zapisane zaplanowane trasy */}
                    <div className="surface-subtle rounded-xl p-3 border border-token">
                      <h4 className="text-theme-white text-sm font-semibold mb-3 flex items-center gap-2">
                        <Save className="w-4 h-4 text-primary" />
                        Zaplanowane trasy ({savedPlannedRoutes.length})
                      </h4>
                      
                      {savedPlannedRoutes.length === 0 ? (
                        <div className="text-center py-4">
                          <Route className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                          <p className="text-theme-white-muted text-xs">Brak zapisanych zaplanowanych tras</p>
                          <Button size="sm" variant="outline" className="mt-2 text-xs" onClick={() => setActiveTab("planner")}>
                            <Plus className="w-3 h-3 mr-1" />
                            Zaplanuj trasę
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {savedPlannedRoutes.map((route) => (
                            <div key={route.id} className="p-3 rounded-lg border border-token surface-overlay hover:border-slate-500 transition-all">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-theme-white text-sm font-medium truncate">{route.name}</p>
                                  <p className="text-theme-white-muted text-xs truncate">
                                    {typeof route.startLocation === 'object' 
                                      ? route.startLocation?.display_name || `${route.startLocation?.lat?.toFixed(4)}, ${route.startLocation?.lng?.toFixed(4)}`
                                      : route.startLocation}
                                  </p>
                                  <ChevronRight className="w-3 h-3 text-slate-500 mx-1 inline" />
                                  <p className="text-theme-white-muted text-xs truncate">
                                    {typeof route.endLocation === 'object'
                                      ? route.endLocation?.display_name || `${route.endLocation?.lat?.toFixed(4)}, ${route.endLocation?.lng?.toFixed(4)}`
                                      : route.endLocation}
                                  </p>
                                </div>
                              </div>
                              
                              {route.distance > 0 && (
                                <div className="flex items-center gap-3 mb-2 text-xs">
                                  <span className="text-theme-white-muted">
                                    <Route className="w-3 h-3 inline mr-1 text-blue-400" />
                                    {route.distance} km
                                  </span>
                                  <span className="text-theme-white-muted">
                                    <Clock className="w-3 h-3 inline mr-1 text-green-400" />
                                    {route.durationFormatted}
                                  </span>
                                </div>
                              )}
                              
                              <div className="flex gap-1">
                                <Button size="sm" variant="ghost" className="flex-1 h-7 text-xs text-blue-400 hover:text-blue-300" onClick={() => viewPlannedRouteOnMap(route)}>
                                  <Eye className="w-3 h-3 mr-1" />
                                  Pokaż
                                </Button>
                                <Button size="sm" variant="ghost" className="flex-1 h-7 text-xs text-yellow-400 hover:text-yellow-300" onClick={() => editPlannedRoute(route)}>
                                  <Edit className="w-3 h-3 mr-1" />
                                  Edytuj
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="flex-1 h-7 text-xs text-green-400 hover:text-green-300"
                                  onClick={() => {
                                    const tripToExport = {
                                      startLocation: route.startLocation,
                                      endLocation: route.endLocation,
                                      distance: route.distance,
                                      duration: route.duration,
                                      points: route.coordinates || [],
                                    };
                                    exportTrackedTripToTrips(tripToExport);
                                  }}
                                >
                                  <Car className="w-3 h-3 mr-1" />
                                  Eksportuj
                                </Button>
                                <Button size="sm" variant="ghost" className="flex-1 h-7 text-xs text-green-400 hover:text-green-300" onClick={() => {
                                  setActiveTab("live");
                                  setSelectedTrackedTrip(route);
                                  toast.success(`Rozpoczynanie trasy: ${route.name}`);
                                }}>
                                  <Play className="w-3 h-3 mr-1" />
                                  Jedź
                                </Button>
                                <Button size="sm" variant="ghost" className="w-7 h-7 text-red-400 hover:text-red-300" onClick={() => deletePlannedRoute(route.id)}>
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Śledzone trasy */}
                    <div className="surface-subtle rounded-xl p-3 border border-token">
                      <h4 className="text-theme-white text-sm font-semibold mb-3 flex items-center gap-2">
                        <Navigation className="w-4 h-4 text-primary" />
                        Śledzone trasy ({trackedTrips.length})
                      </h4>
                      <TrackedTripsList
                        trips={trackedTrips}
                        onViewOnMap={(trip) => {
                          setSelectedTrackedTrip(trip);
                          setActiveTab("live");
                          if (mapRef.current && trip.points && trip.points.length > 0) {
                            setTimeout(() => {
                              mapRef.current.drawRoadRoute(trip.points, {
                                color: '#6366f1',
                                weight: 5,
                                opacity: 0.8,
                                startMarker: true,
                                endMarker: true,
                                fitBounds: true,
                                startAddress: trip.startLocation,
                                endAddress: trip.endLocation,
                              });
                            }, 100);
                          }
                          toast.success(`Wyświetlanie trasy: ${trip.startLocation} → ${trip.endLocation}`);
                        }}
                        onExportToTrip={(trip) => exportTrackedTripToTrips(trip)}
                        onExportToKarta={exportToKartaDrogowa}
                        onDelete={deleteTrackedTrip}
                      />
                    </div>
                  </TabsContent>

                  {/* Zakładka: Planowanie Trasy */}
                  <TabsContent value="planner" className="mt-3">
                    <RoutePlanner 
                      mapRef={mapRef}
                      isMapReady={true}
                      editRoute={editingPlannedRoute}
                      onSave={handleRoutePlannerSave}
                      onStart={handleRoutePlannerStart}
                      onRouteCalculated={(routeInfo) => {
                        console.log('✅ Trasa obliczona:', routeInfo);
                      }}
                    />
                    
                    <div className="mt-4 p-3 surface-subtle rounded-xl border border-token">
                      <h4 className="text-theme-white text-xs font-semibold mb-2 flex items-center gap-2">
                        <Route className="w-4 h-4 text-primary" />
                        Informacje o routingu
                      </h4>
                      <p className="text-theme-white-muted text-xs">
                        Trasy są obliczane przy użyciu darmowego API OSRM (Open Source Routing Machine). 
                        Trasa jest wyznaczana po rzeczywistych drogach, uwzględniając ograniczenia prędkości.
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className="bg-green-500/20 text-green-400 text-xs">Darmowe</Badge>
                        <Badge className="bg-blue-500/20 text-blue-400 text-xs">Bez klucza API</Badge>
                        <Badge className="bg-purple-500/20 text-purple-400 text-xs">OpenStreetMap</Badge>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </GlassCard>
        </div>

        {/* Mapa */}
        <div className="flex-1 min-w-0">
          <GlassCard className="p-0 overflow-hidden map-container">
            <div className="flex items-center justify-between p-3 border-b border-token">
              <div className="flex items-center gap-2">
                {!showSidebar && (<Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setShowSidebar(true)}><Eye className="w-4 h-4" /></Button>)}
                <h3 className="text-theme-white font-semibold text-sm flex items-center gap-2">
                  <Map className="w-4 h-4 text-primary" />
                  {selectedTrackedTrip ? `Trasa: ${selectedTrackedTrip.startLocation} → ${selectedTrackedTrip.endLocation}` : activeTab === 'planner' ? 'Planowanie Trasy' : "Mapa tras"}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {[
                    { id: "road", icon: Map, title: "Mapa drogowa" },
                    { id: "satellite", icon: Satellite, title: "Satelita" },
                    { id: "terrain", icon: Mountain, title: "Teren" },
                  ].map(({ id, icon: Icon, title }) => (
                    <Button key={id} variant={mapView === id ? "default" : "ghost"} size="icon" className={`w-8 h-8 ${mapView === id ? "bg-gradient-primary" : ""}`} onClick={() => setMapView(id)} title={title}><Icon className="w-4 h-4" /></Button>
                  ))}
                </div>
                <div className="h-5 w-px bg-slate-700" />
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="w-8 h-8" onClick={toggleFullscreen} title={fullscreen ? "Zamknij pełny ekran" : "Pełny ekran"}>{fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}</Button>
                </div>
              </div>
            </div>

            <MapView
              ref={mapRef}
              trip={selectedTrackedTrip || selectedTrip}
              trackedTrip={selectedTrackedTrip}
              showRoute={true}
              showMarkers={showRouteMarkers}
              provider={mapProvider}
              mapStyle={mapView}
              defaultZoom={12}
              autoCenter={autoCenter}
              routeColor="#3b82f6"
              userLocation={userLocation}
              className="w-full"
              height="600px"
            />
          </GlassCard>
        </div>
      </div>

      {/* Modal szczegółów trasy */}
      <TripDetailsModal
        trip={selectedTrackedTrip}
        isOpen={showTripDetailsModal}
        onClose={() => setShowTripDetailsModal(false)}
        onViewOnMap={(trip) => { setSelectedTrackedTrip(trip); setShowTripDetailsModal(false); setActiveTab("live"); }}
        onExportToTrip={exportTrackedTripToTrips}
        onExportToKarta={exportToKartaDrogowa}
      />

    </div>
  );
}