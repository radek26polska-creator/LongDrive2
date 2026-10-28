// src/hooks/useTrackedTrips.js
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { accountStorage } from '@/lib/accountStorage';

const STORAGE_KEY = 'tracked_trips';

export const useTrackedTrips = () => {
  const [trackedTrips, setTrackedTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  // Wczytaj zapisane trasy z localStorage
  useEffect(() => {
    const loadTrips = () => {
      try {
        const saved = accountStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          // Konwersja dat z powrotem na Date
          const tripsWithDates = parsed.map(trip => ({
            ...trip,
            startDate: new Date(trip.startDate),
            endDate: trip.endDate ? new Date(trip.endDate) : null,
            points: trip.points || []
          }));
          setTrackedTrips(tripsWithDates.sort((a, b) => b.startDate - a.startDate));
        }
      } catch (error) {
        console.error('Błąd ładowania tras:', error);
      } finally {
        setLoading(false);
      }
    };
    loadTrips();
  }, []);

  // Zapisz trasę
  const saveTrackedTrip = useCallback((tripData) => {
    try {
      const newTrip = {
        id: Date.now().toString(),
        ...tripData,
        startDate: tripData.startDate || new Date(),
        endDate: tripData.endDate || new Date(),
        createdAt: new Date().toISOString(),
      };
      
      console.log('💾 Zapisuję trasę:', newTrip);
      
      setTrackedTrips(prev => {
        const updated = [newTrip, ...prev];
        accountStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
      
      toast.success('Trasa została zapisana!');
      return newTrip;
    } catch (error) {
      console.error('Błąd zapisu trasy:', error);
      toast.error('Nie udało się zapisać trasy');
      return null;
    }
  }, []);

  // Usuń trasę
  const deleteTrackedTrip = useCallback((id) => {
    try {
      setTrackedTrips(prev => {
        const updated = prev.filter(trip => trip.id !== id);
        accountStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
      toast.success('Trasa usunięta');
    } catch (error) {
      console.error('Błąd usuwania trasy:', error);
      toast.error('Nie udało się usunąć trasy');
    }
  }, []);

  // Aktualizuj trasę
  const updateTrackedTrip = useCallback((id, updates) => {
    try {
      setTrackedTrips(prev => {
        const updated = prev.map(trip => 
          trip.id === id ? { ...trip, ...updates } : trip
        );
        accountStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
      toast.success('Trasa zaktualizowana');
    } catch (error) {
      console.error('Błąd aktualizacji trasy:', error);
      toast.error('Nie udało się zaktualizować trasy');
    }
  }, []);

  // Pobierz trasę po ID
  const getTrackedTrip = useCallback((id) => {
    return trackedTrips.find(trip => trip.id === id);
  }, [trackedTrips]);

  return {
    trackedTrips,
    loading,
    saveTrackedTrip,
    deleteTrackedTrip,
    updateTrackedTrip,
    getTrackedTrip,
  };
};

export default useTrackedTrips;