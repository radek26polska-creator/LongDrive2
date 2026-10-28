// src/components/maps/TripDetailsModal.jsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Calendar, Clock, Route, Activity,
  Car, FileText, Gauge,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

const TripDetailsModal = ({
  trip,
  isOpen,
  onClose,
  onViewOnMap,
  onExportToTrip,
  onExportToKarta,
}) => {
  if (!trip) return null;

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

  const getAverageSpeed = () => {
    if (!trip.distance || !trip.duration || trip.duration === 0) return '---';
    const speed = (trip.distance / (trip.duration / 3600));
    return `${speed.toFixed(1)} km/h`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="surface rounded-xl max-w-md w-full max-h-[90vh] overflow-hidden border border-token shadow-xl"
          >
            {/* Nagłówek */}
            <div className="flex items-center justify-between p-4 border-b border-token">
              <h3 className="text-theme-white font-semibold flex items-center gap-2">
                <Route className="w-5 h-5 text-primary" />
                Szczegóły trasy
              </h3>
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8"
                onClick={onClose}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Treść */}
            <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Trasa */}
              <div className="surface-overlay rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400" />
                  <span className="text-theme-white text-sm font-medium">Start</span>
                </div>
                <p className="text-theme-white-secondary text-sm pl-4">
                  {trip.startLocation || 'Nieznana lokalizacja'}
                </p>
                
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-2 h-2 rounded-full bg-red-400" />
                  <span className="text-theme-white text-sm font-medium">Meta</span>
                </div>
                <p className="text-theme-white-secondary text-sm pl-4">
                  {trip.endLocation || 'Nieznana lokalizacja'}
                </p>
              </div>

              {/* Statystyki */}
              <div className="grid grid-cols-2 gap-3">
                <div className="surface-overlay rounded-lg p-3 text-center">
                  <p className="text-xs text-theme-white-muted flex items-center justify-center gap-1">
                    <Route className="w-3 h-3" />
                    Dystans
                  </p>
                  <p className="text-theme-white font-bold text-lg">
                    {formatDistance(trip.distance)}
                  </p>
                </div>
                <div className="surface-overlay rounded-lg p-3 text-center">
                  <p className="text-xs text-theme-white-muted flex items-center justify-center gap-1">
                    <Clock className="w-3 h-3" />
                    Czas
                  </p>
                  <p className="text-theme-white font-bold text-lg">
                    {formatDuration(trip.duration)}
                  </p>
                </div>
                <div className="surface-overlay rounded-lg p-3 text-center">
                  <p className="text-xs text-theme-white-muted flex items-center justify-center gap-1">
                    <Gauge className="w-3 h-3" />
                    Średnia prędkość
                  </p>
                  <p className="text-theme-white font-bold text-lg">
                    {getAverageSpeed()}
                  </p>
                </div>
                <div className="surface-overlay rounded-lg p-3 text-center">
                  <p className="text-xs text-theme-white-muted flex items-center justify-center gap-1">
                    <Activity className="w-3 h-3" />
                    Punkty GPS
                  </p>
                  <p className="text-theme-white font-bold text-lg">
                    {trip.points?.length || 0}
                  </p>
                </div>
              </div>

              {/* Daty */}
              <div className="surface-overlay rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span className="text-theme-white text-sm">Data i czas</span>
                </div>
                <p className="text-theme-white-secondary text-sm">
                  Rozpoczęcie: {format(new Date(trip.startDate), 'dd MMMM yyyy, HH:mm:ss', { locale: pl })}
                </p>
                {trip.endDate && (
                  <p className="text-theme-white-secondary text-sm">
                    Zakończenie: {format(new Date(trip.endDate), 'dd MMMM yyyy, HH:mm:ss', { locale: pl })}
                  </p>
                )}
              </div>

              {/* Przyciski akcji */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button
                  className="bg-gradient-primary"
                  onClick={() => onViewOnMap?.(trip)}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Pokaż na mapie
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onExportToKarta?.(trip)}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Karta drogowa
                </Button>
                <Button
                  variant="outline"
                  className="col-span-2"
                  onClick={() => onExportToTrip?.(trip)}
                >
                  <Car className="w-4 h-4 mr-2" />
                  Dodaj do modułu Podróże
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default TripDetailsModal;