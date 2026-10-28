// src/components/maps/LocationSearch.jsx - WERSJA ULEPSZONA
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, X, Loader2, Navigation, Building2, Home, Car, Clock } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { accountStorage } from '@/lib/accountStorage';

const LocationSearch = ({
  map,
  onLocationSelect,
  apiKey = null,
  provider = 'osm',
  placeholder = 'Szukaj miejsca...',
  className = '',
  initialValue = '',
  showCurrentLocation = true,
  inline = false,
  userLocation = null, // Aktualna lokalizacja użytkownika do sortowania wyników
}) => {
  const [query, setQuery] = useState(initialValue);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [recentLocations, setRecentLocations] = useState([]);
  const [showRecent, setShowRecent] = useState(false);
  const searchTimeoutRef = useRef(null);
  const abortControllerRef = useRef(null);
  const containerRef = useRef(null);

  // Wczytaj ostatnie lokalizacje z localStorage
  useEffect(() => {
    try {
      const saved = accountStorage.getItem('recent_locations');
      if (saved) {
        setRecentLocations(JSON.parse(saved).slice(0, 5));
      }
    } catch (e) {
      console.error('Błąd wczytywania ostatnich lokalizacji:', e);
    }
  }, []);

  // Zapisz lokalizację do historii
  const saveToRecent = useCallback((location) => {
    try {
      const saved = accountStorage.getItem('recent_locations');
      let recent = saved ? JSON.parse(saved) : [];
      
      // Usuń duplikaty
      recent = recent.filter(loc => loc.id !== location.id);
      
      // Dodaj na początek
      recent.unshift({
        ...location,
        usedAt: new Date().toISOString(),
      });
      
      // Zachowaj tylko 10 ostatnich
      recent = recent.slice(0, 10);
      
      accountStorage.setItem('recent_locations', JSON.stringify(recent));
      setRecentLocations(recent.slice(0, 5));
    } catch (e) {
      console.error('Błąd zapisywania lokalizacji:', e);
    }
  }, []);

  useEffect(() => {
    if (initialValue) {
      setQuery(initialValue);
    }
  }, [initialValue]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowResults(false);
        setShowRecent(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Pobierz typ ikony dla lokalizacji
  const getLocationIcon = (type) => {
    switch (type) {
      case 'residential':
      case 'house':
        return Home;
      case 'commercial':
      case 'office':
        return Building2;
      case 'highway':
      case 'motorway':
        return Car;
      default:
        return MapPin;
    }
  };

  // Formatuj adres - usuń powtórzenia
  const formatAddress = (displayName) => {
    if (!displayName) return '';
    
    // Podziel adres na części
    const parts = displayName.split(',').map(p => p.trim());
    
    // Usuń duplikaty (często się zdarzają w Nominatim)
    const uniqueParts = [];
    parts.forEach(part => {
      if (!uniqueParts.includes(part) && part.length > 0) {
        uniqueParts.push(part);
      }
    });
    
    return uniqueParts.join(', ');
  };

  // Oblicz odległość między dwoma punktami (dla sortowania)
  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    if (!lat1 || !lng1 || !lat2 || !lng2) return Infinity;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const searchLocation = useCallback(async (searchQuery) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setResults([]);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);

    try {
      let url;
      if (provider === 'google' && apiKey) {
        // Google Places Autocomplete - lepsze wyniki
        url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(searchQuery)}&key=${apiKey}&language=pl&components=country:pl`;
      } else {
        // Nominatim z lepszymi parametrami
        // Dodajemy viewbox aby priorytetyzować wyniki w Polsce
        const viewbox = '14.0,49.0,24.5,55.0'; // Polska bounding box
        url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&addressdetails=1&limit=15&countrycodes=pl&bounded=1&viewbox=${viewbox}&accept-language=pl`;
      }

      const response = await fetch(url, {
        signal: abortControllerRef.current.signal,
        headers: provider === 'osm' ? {
          'Accept-Language': 'pl',
          'User-Agent': 'LongDriveApp/1.0',
        } : {},
      });
      
      const data = await response.json();

      let formattedResults = [];
      
      if (provider === 'google' && apiKey) {
        // Dla Google Places - potrzebujemy dodatkowego zapytania o szczegóły
        const predictions = data.predictions || [];
        
        // Pobierz szczegóły dla każdego miejsca
        const detailedResults = await Promise.all(
          predictions.slice(0, 8).map(async (pred) => {
            try {
              const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${pred.place_id}&key=${apiKey}&language=pl&fields=geometry,formatted_address,name,types`;
              const detailsRes = await fetch(detailsUrl);
              const detailsData = await detailsRes.json();
              
              if (detailsData.result) {
                const result = detailsData.result;
                return {
                  id: pred.place_id,
                  lat: result.geometry?.location?.lat,
                  lng: result.geometry?.location?.lng,
                  display_name: result.formatted_address,
                  name: result.name,
                  types: result.types,
                  distance: userLocation ? calculateDistance(
                    userLocation.lat, userLocation.lng,
                    result.geometry?.location?.lat,
                    result.geometry?.location?.lng
                  ) : null,
                };
              }
              return null;
            } catch {
              return null;
            }
          })
        );
        
        formattedResults = detailedResults.filter(r => r !== null);
      } else {
        // Nominatim - sortuj wg ważności i odległości
        formattedResults = data.map(item => ({
          id: item.place_id,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          display_name: formatAddress(item.display_name),
          name: item.display_name.split(',')[0],
          type: item.type,
          importance: parseFloat(item.importance) || 0,
          distance: userLocation ? calculateDistance(
            userLocation.lat, userLocation.lng,
            parseFloat(item.lat), parseFloat(item.lon)
          ) : null,
        }));

        // Sortuj: najpierw wg odległości (jeśli mamy lokalizację), potem wg importance
        if (userLocation) {
          formattedResults.sort((a, b) => {
            const distA = a.distance || Infinity;
            const distB = b.distance || Infinity;
            if (Math.abs(distA - distB) < 5) {
              return (b.importance || 0) - (a.importance || 0);
            }
            return distA - distB;
          });
        } else {
          formattedResults.sort((a, b) => (b.importance || 0) - (a.importance || 0));
        }
      }

      setResults(formattedResults);
      setShowResults(true);
      setShowRecent(false);
    } catch (error) {
      if (error.name === 'AbortError') return;
      console.error('Błąd wyszukiwania:', error);
      setResults([]);
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [provider, apiKey, userLocation]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    setSelectedLocation(null);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        searchLocation(value);
      }, 400); // Szybsze wyszukiwanie
    } else {
      setResults([]);
      setShowResults(false);
      if (value.length === 0) {
        setShowRecent(true);
      }
    }
  };

  const handleSelectLocation = (location) => {
    setSelectedLocation(location);
    setQuery(location.display_name || location.name);
    setShowResults(false);
    setShowRecent(false);
    
    // Zapisz do historii
    saveToRecent(location);
    
    if (map && location) {
      map.setView([location.lat, location.lng], 15);
    }
    if (onLocationSelect) {
      onLocationSelect(location);
    }
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      console.warn('Geolokalizacja nie jest wspierana');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1&accept-language=pl`;
          const response = await fetch(url, {
            headers: {
              'Accept-Language': 'pl',
              'User-Agent': 'LongDriveApp/1.0',
            },
          });
          const data = await response.json();
          
          const location = {
            id: data.place_id || `current-${Date.now()}`,
            lat: latitude,
            lng: longitude,
            display_name: formatAddress(data.display_name),
            name: data.display_name.split(',')[0],
            isCurrentLocation: true,
            type: 'current',
          };
          
          setSelectedLocation(location);
          setQuery(location.display_name);
          saveToRecent(location);
          
          if (map) {
            map.setView([latitude, longitude], 15);
          }
          if (onLocationSelect) {
            onLocationSelect(location);
          }
        } catch (error) {
          const location = {
            id: `current-${Date.now()}`,
            lat: latitude,
            lng: longitude,
            display_name: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
            name: 'Twoja lokalizacja',
            isCurrentLocation: true,
            type: 'current',
          };
          
          setSelectedLocation(location);
          setQuery(location.display_name);
          saveToRecent(location);
          
          if (map) {
            map.setView([latitude, longitude], 15);
          }
          if (onLocationSelect) {
            onLocationSelect(location);
          }
        }
        
        setLoading(false);
      },
      (error) => {
        console.error('Błąd GPS:', error);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setShowResults(false);
    setShowRecent(false);
    setSelectedLocation(null);
    if (onLocationSelect) {
      onLocationSelect(null);
    }
  };

  const handleFocus = () => {
    if (query.length === 0) {
      setShowRecent(true);
    } else if (results.length > 0) {
      setShowResults(true);
    }
  };

  const inputElement = (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-token-muted" />
      <Input
        value={query}
        onChange={handleSearchChange}
        onFocus={handleFocus}
        placeholder={placeholder}
        className={`pl-9 pr-20 surface border-token text-theme-white placeholder:text-slate-500 focus:border-primary transition-colors ${inline ? 'h-10' : ''}`}
      />
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
        {loading && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
        {showCurrentLocation && !loading && (
          <button
            onClick={handleGetCurrentLocation}
            className="p-1.5 text-token-muted hover:text-primary hover:bg-slate-700/50 rounded-md transition-all"
            title="Użyj aktualnej lokalizacji"
          >
            <Navigation className="w-4 h-4" />
          </button>
        )}
        {query && !loading && (
          <button
            onClick={handleClear}
            className="p-1.5 text-token-muted hover:text-token-primary hover:bg-slate-700/50 rounded-md transition-all"
            title="Wyczyść"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );

  const resultsElement = (
    <AnimatePresence>
      {(showResults && results.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute top-full left-0 right-0 mt-2 z-50"
        >
          <GlassCard className="p-2 max-h-80 overflow-y-auto">
            {results.map((result, index) => {
              const IconComponent = getLocationIcon(result.type);
              return (
                <motion.button
                  key={result.id || index}
                  whileHover={{ x: 4, backgroundColor: 'rgba(99, 102, 241, 0.1)' }}
                  onClick={() => handleSelectLocation(result)}
                  className="w-full text-left p-2.5 rounded-lg transition-all flex items-start gap-3 group"
                >
                  <div className="flex-shrink-0">
                    <IconComponent className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-theme-white font-medium truncate">{result.name}</p>
                      {result.distance !== null && result.distance < 100 && (
                        <Badge className="text-[10px] bg-primary/20 text-primary">
                          {(result.distance).toFixed(1)} km
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-theme-white-muted truncate mt-0.5">{result.display_name}</p>
                  </div>
                </motion.button>
              );
            })}
          </GlassCard>
        </motion.div>
      )}

      {/* Ostatnie lokalizacje - pokazuj gdy pole puste */}
      {showRecent && recentLocations.length > 0 && query.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute top-full left-0 right-0 mt-2 z-50"
        >
          <GlassCard className="p-2 max-h-80 overflow-y-auto">
            <div className="px-2 py-1 mb-1">
              <p className="text-xs text-theme-white-muted flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Ostatnio używane
              </p>
            </div>
            {recentLocations.map((location) => {
              const IconComponent = getLocationIcon(location.type);
              return (
                <motion.button
                  key={location.id}
                  whileHover={{ x: 4, backgroundColor: 'rgba(99, 102, 241, 0.1)' }}
                  onClick={() => handleSelectLocation(location)}
                  className="w-full text-left p-2.5 rounded-lg transition-all flex items-start gap-3 group"
                >
                  <div className="flex-shrink-0">
                    <IconComponent className="w-4 h-4 text-token-muted" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-theme-white truncate">{location.name}</p>
                    <p className="text-xs text-theme-white-muted truncate">{location.display_name}</p>
                  </div>
                </motion.button>
              );
            })}
          </GlassCard>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (inline) {
    return (
      <div ref={containerRef} className={`relative ${className}`}>
        {inputElement}
        {resultsElement}
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <GlassCard className="p-2">
        {inputElement}
      </GlassCard>
      {resultsElement}
    </div>
  );
};

export default LocationSearch;