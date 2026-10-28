// src/components/maps/TrackedTripsList.jsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, Calendar, Clock, Route, Eye, Trash2, 
  FileText, ChevronRight, Car,
  Activity, Circle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

const TrackedTripsList = ({
  trips = [],
  onViewOnMap,
  onExportToTrip,
  onExportToKarta,
  onDelete,
  className = '',
}) => {
  const [expandedTripId, setExpandedTripId] = useState(null);

  const formatDistance = (km) => {
    if (!km && km !== 0) return '0 km';
    if (km < 1) return `${Math.round(km * 1000)} m`;
    return `${km.toFixed(1)} km`;
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '---';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-400 bg-green-400/10';
      case 'in_progress': return 'text-blue-400 bg-blue-400/10';
      case 'cancelled': return 'text-red-400 bg-red-400/10';
      default: return 'text-token-muted bg-slate-400/10';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'completed': return 'Zakończona';
      case 'in_progress': return 'W trakcie';
      case 'cancelled': return 'Anulowana';
      default: return '---';
    }
  };

  if (trips.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <Route className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <p className="text-theme-white-muted text-sm">Brak zapisanych tras</p>
        <p className="text-theme-white-muted text-xs mt-1">
          Rozpocznij śledzenie GPS, aby zapisać pierwszą trasę
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {trips.map((trip) => {
        const isExpanded = expandedTripId === trip.id;
        const distance = trip.distance || 0;
        const duration = trip.duration || 0;
        
        return (
          <div
            key={trip.id}
            className={`surface-subtle rounded-xl border transition-all ${
              isExpanded ? 'border-primary' : 'border-token'
            }`}
          >
            {/* Nagłówek trasy */}
            <div 
              className="p-3 cursor-pointer hover:bg-[var(--surface-hover)]-overlay transition-colors"
              onClick={() => setExpandedTripId(isExpanded ? null : trip.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={`text-xs ${getStatusColor(trip.status)}`}>
                      {getStatusLabel(trip.status)}
                    </Badge>
                    {trip.distance > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {formatDistance(trip.distance)}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="mt-2 flex items-center gap-2 text-sm">
                    <div className="flex items-center gap-1 text-green-400">
                      <Circle className="w-2 h-2 fill-green-400" />
                      <span className="text-theme-white text-sm truncate">
                        {trip.startLocation || 'Start'}
                      </span>
                    </div>
                    <ChevronRight className="w-3 h-3 text-slate-500" />
                    <div className="flex items-center gap-1 text-red-400">
                      <MapPin className="w-3 h-3" />
                      <span className="text-theme-white text-sm truncate">
                        {trip.endLocation || 'Cel'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 mt-1 text-xs text-theme-white-muted">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(trip.startDate), 'dd MMM yyyy, HH:mm', { locale: pl })}
                    </span>
                    {trip.endDate && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(trip.endDate), 'HH:mm', { locale: pl })}
                      </span>
                    )}
                  </div>
                </div>
                
                <ChevronRight 
                  className={`w-4 h-4 text-token-muted transition-transform flex-shrink-0 ${
                    isExpanded ? 'rotate-90' : ''
                  }`}
                />
              </div>
            </div>

            {/* Rozszerzone szczegóły */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-3 pt-0 border-t border-token space-y-3">
                    {/* Statystyki trasy */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center p-2 surface-overlay rounded-lg">
                        <p className="text-xs text-theme-white-muted flex items-center justify-center gap-1">
                          <Route className="w-3 h-3" />
                          Dystans
                        </p>
                        <p className="text-theme-white font-semibold text-sm">
                          {formatDistance(distance)}
                        </p>
                      </div>
                      <div className="text-center p-2 surface-overlay rounded-lg">
                        <p className="text-xs text-theme-white-muted flex items-center justify-center gap-1">
                          <Clock className="w-3 h-3" />
                          Czas
                        </p>
                        <p className="text-theme-white font-semibold text-sm">
                          {formatDuration(duration)}
                        </p>
                      </div>
                      <div className="text-center p-2 surface-overlay rounded-lg">
                        <p className="text-xs text-theme-white-muted flex items-center justify-center gap-1">
                          <Activity className="w-3 h-3" />
                          Średnia prędkość
                        </p>
                        <p className="text-theme-white font-semibold text-sm">
                          {duration > 0 && distance > 0 
                            ? `${((distance / (duration / 3600))).toFixed(1)} km/h`
                            : '---'}
                        </p>
                      </div>
                    </div>

                    {/* Przyciski akcji */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-8"
                        onClick={() => onViewOnMap?.(trip)}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Pokaż na mapie
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-8"
                        onClick={() => onExportToKarta?.(trip)}
                      >
                        <FileText className="w-3 h-3 mr-1" />
                        Karta drogowa
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-8"
                        onClick={() => onExportToTrip?.(trip)}
                      >
                        <Car className="w-3 h-3 mr-1" />
                        Dodaj do podróży
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="text-xs h-8"
                        onClick={() => onDelete?.(trip.id)}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Usuń
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
};

export default TrackedTripsList;