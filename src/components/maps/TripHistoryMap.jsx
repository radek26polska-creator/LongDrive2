import React, { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Play, MapPin, Clock } from 'lucide-react';
import MapView from './MapView';
import GlassCard from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

const TripHistoryMap = ({
  trips = [],
  vehicles = [],
  drivers = [],
  mapSettings = {},
  className = '',
  onTripSelect = null,
}) => {
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [filterVehicle, setFilterVehicle] = useState('all');
  const [filterDriver, setFilterDriver] = useState('all');
  const [filterDate, setFilterDate] = useState('all');
  const [showAnimation, setShowAnimation] = useState(false);

  // Filtrowanie tras
  const filteredTrips = useMemo(() => {
    let filtered = [...trips].filter(t => t.status === 'completed');

    if (filterVehicle !== 'all') {
      filtered = filtered.filter(t => t.vehicleId === parseInt(filterVehicle));
    }

    if (filterDriver !== 'all') {
      filtered = filtered.filter(t => t.driverId === parseInt(filterDriver));
    }

    if (filterDate !== 'all') {
      const now = new Date();
      const filterDateObj = new Date();
      switch (filterDate) {
        case 'today':
          filterDateObj.setHours(0, 0, 0, 0);
          filtered = filtered.filter(t => new Date(t.startDate) >= filterDateObj);
          break;
        case 'week':
          filterDateObj.setDate(now.getDate() - 7);
          filtered = filtered.filter(t => new Date(t.startDate) >= filterDateObj);
          break;
        case 'month':
          filterDateObj.setMonth(now.getMonth() - 1);
          filtered = filtered.filter(t => new Date(t.startDate) >= filterDateObj);
          break;
        case 'quarter':
          filterDateObj.setMonth(now.getMonth() - 3);
          filtered = filtered.filter(t => new Date(t.startDate) >= filterDateObj);
          break;
        case 'year':
          filterDateObj.setFullYear(now.getFullYear() - 1);
          filtered = filtered.filter(t => new Date(t.startDate) >= filterDateObj);
          break;
      }
    }

    return filtered.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
  }, [trips, filterVehicle, filterDriver, filterDate]);

  // Wybór trasy
  const handleTripSelect = useCallback((trip) => {
    setSelectedTrip(trip);
    if (onTripSelect) onTripSelect(trip);
  }, [onTripSelect]);

  // Animacja trasy
  const animateTrip = useCallback(() => {
    setShowAnimation(true);
    setTimeout(() => setShowAnimation(false), 3000);
  }, []);

  // Pobierz nazwę pojazdu
  const getVehicleName = (vehicleId) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    return vehicle ? `${vehicle.name} (${vehicle.licensePlate})` : 'Nieznany';
  };

  // Pobierz nazwę kierowcy
  const getDriverName = (driverId) => {
    const driver = drivers.find(d => d.id === driverId);
    return driver ? driver.name : 'Nieznany';
  };

  // Kolor trasy wg typu pojazdu
  const getRouteColor = (vehicleId) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return mapSettings.routeColors?.car || '#3b82f6';
    
    const type = vehicle.type?.toLowerCase();
    switch (type) {
      case 'ciężarowe':
      case 'truck':
        return mapSettings.routeColors?.truck || '#ef4444';
      case 'dostawcze':
      case 'van':
        return mapSettings.routeColors?.van || '#10b981';
      case 'bus':
      case 'autobus':
        return mapSettings.routeColors?.bus || '#8b5cf6';
      case 'motocykl':
      case 'motorcycle':
        return mapSettings.routeColors?.motorcycle || '#f59e0b';
      default:
        return mapSettings.routeColors?.car || '#3b82f6';
    }
  };

  // Opcje filtrów
  const vehicleOptions = [
    { value: 'all', label: 'Wszystkie pojazdy' },
    ...vehicles.map(v => ({ value: String(v.id), label: `${v.name} (${v.licensePlate})` }))
  ];

  const driverOptions = [
    { value: 'all', label: 'Wszyscy kierowcy' },
    ...drivers.map(d => ({ value: String(d.id), label: d.name }))
  ];

  const dateOptions = [
    { value: 'all', label: 'Wszystkie' },
    { value: 'today', label: 'Dzisiaj' },
    { value: 'week', label: 'Ostatnie 7 dni' },
    { value: 'month', label: 'Ostatni miesiąc' },
    { value: 'quarter', label: 'Ostatnie 3 miesiące' },
    { value: 'year', label: 'Ostatni rok' },
  ];

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Filtry */}
      <GlassCard className="p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[150px]">
            <label className="text-xs text-theme-white-muted mb-1 block">Pojazd</label>
            <Select value={filterVehicle} onValueChange={setFilterVehicle}>
              <SelectTrigger className="surface border-token">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {vehicleOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 min-w-[150px]">
            <label className="text-xs text-theme-white-muted mb-1 block">Kierowca</label>
            <Select value={filterDriver} onValueChange={setFilterDriver}>
              <SelectTrigger className="surface border-token">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {driverOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 min-w-[150px]">
            <label className="text-xs text-theme-white-muted mb-1 block">Okres</label>
            <Select value={filterDate} onValueChange={setFilterDate}>
              <SelectTrigger className="surface border-token">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {dateOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-theme-white-muted whitespace-nowrap">
            Znaleziono: {filteredTrips.length} tras
          </div>
        </div>
      </GlassCard>

      {/* Mapa */}
      <GlassCard className="p-0 overflow-hidden">
        <MapView
          trip={selectedTrip}
          showLiveTracking={false}
          showRoute={!!selectedTrip}
          showMarkers={!!selectedTrip}
          routeColor={selectedTrip ? getRouteColor(selectedTrip.vehicleId) : '#3b82f6'}
          provider={mapSettings.provider || 'osm'}
          mapStyle={mapSettings.mapStyle || 'road'}
          defaultZoom={mapSettings.defaultZoom || 12}
          autoCenter={mapSettings.autoCenter !== false}
          className="w-full"
        />
      </GlassCard>

      {/* Lista tras */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-theme-white font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Historia tras
          </h3>
          {selectedTrip && (
            <Button variant="ghost" size="sm" onClick={() => setSelectedTrip(null)}>
              Wyczyść zaznaczenie
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
          {filteredTrips.map((trip) => {
            const isSelected = selectedTrip?.id === trip.id;
            const distance = (trip.endOdometer || 0) - (trip.startOdometer || 0);
            
            return (
              <motion.div
                key={trip.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleTripSelect(trip)}
                className={`p-3 rounded-lg cursor-pointer transition-all border ${
                  isSelected 
                    ? 'border-primary bg-primary/10' 
                    : 'border-token surface-subtle hover:border-slate-600'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-theme-white font-medium text-sm">
                      {getVehicleName(trip.vehicleId)}
                    </p>
                    <p className="text-xs text-theme-white-muted">
                      {getDriverName(trip.driverId)}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {distance > 0 ? `${distance} km` : 'Brak dystansu'}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2 text-xs text-theme-white-muted">
                  <Calendar className="w-3 h-3" />
                  <span>
                    {format(new Date(trip.startDate), 'dd MMM yyyy', { locale: pl })}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 text-xs text-theme-white-muted mt-1">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">
                    {trip.startLocation} → {trip.endLocation || '?'}
                  </span>
                </div>

                {isSelected && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-2 pt-2 border-t border-token"
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        animateTrip();
                      }}
                    >
                      <Play className="w-3 h-3 mr-1" />
                      Animuj trasę
                    </Button>
                  </motion.div>
                )}
              </motion.div>
            );
          })}

          {filteredTrips.length === 0 && (
            <div className="col-span-full text-center py-8 text-theme-white-muted">
              Brak tras do wyświetlenia
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TripHistoryMap;