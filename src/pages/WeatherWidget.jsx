import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cloud, Sun, CloudRain, Snowflake, Wind, Droplets,
  Thermometer, RefreshCw, MapPin, CloudFog,
  CloudLightning, CloudDrizzle, Eye, Gauge
} from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { useWeather } from '@/hooks/useWeather';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

const WeatherWidget = ({
  location = null,
  apiKey = null,
  showForecast = true,
  autoRefresh = true,
  className = '',
}) => {
  const [expanded, setExpanded] = useState(false);
  // FIX: własne śledzenie czasu ostatniej aktualizacji
  const [lastUpdate, setLastUpdate] = useState(null);

  const { currentWeather, forecast, loading, error, refresh } = useWeather(
    location,
    apiKey,
    autoRefresh
  );

  // Aktualizacja znacznika czasu gdy dane się zmienią
  useEffect(() => {
    if (currentWeather) {
      setLastUpdate(new Date());
    }
  }, [currentWeather]);

  // Ikona pogody
  const getWeatherIcon = (iconCode, size = 8) => {
    const cls = `w-${size} h-${size}`;
    const iconMap = {
      '01d': <Sun className={`${cls} text-yellow-400`} />,
      '01n': <Sun className={`${cls} text-yellow-300`} />,
      '02d': <Cloud className={`${cls} text-slate-300`} />,
      '02n': <Cloud className={`${cls} text-slate-300`} />,
      '03d': <Cloud className={`${cls} text-slate-300`} />,
      '03n': <Cloud className={`${cls} text-slate-300`} />,
      '04d': <Cloud className={`${cls} text-slate-400`} />,
      '04n': <Cloud className={`${cls} text-slate-400`} />,
      '09d': <CloudDrizzle className={`${cls} text-blue-400`} />,
      '09n': <CloudDrizzle className={`${cls} text-blue-400`} />,
      '10d': <CloudRain className={`${cls} text-blue-400`} />,
      '10n': <CloudRain className={`${cls} text-blue-400`} />,
      '11d': <CloudLightning className={`${cls} text-yellow-500`} />,
      '11n': <CloudLightning className={`${cls} text-yellow-500`} />,
      '13d': <Snowflake className={`${cls} text-cyan-300`} />,
      '13n': <Snowflake className={`${cls} text-cyan-300`} />,
      '50d': <CloudFog className={`${cls} text-slate-400`} />,
      '50n': <CloudFog className={`${cls} text-slate-400`} />,
    };
    return iconMap[iconCode] || <Cloud className={`${cls} text-slate-300`} />;
  };

  // Opis pogody po polsku
  const getWeatherDescription = (description) => {
    if (!description) return '';
    const descMap = {
      'clear sky': 'Bezchmurnie',
      'few clouds': 'Małe zachmurzenie',
      'scattered clouds': 'Umiarkowane zachmurzenie',
      'broken clouds': 'Duże zachmurzenie',
      'overcast clouds': 'Pochmurno',
      'shower rain': 'Przelotne opady',
      'rain': 'Deszcz',
      'light rain': 'Lekki deszcz',
      'moderate rain': 'Umiarkowany deszcz',
      'heavy intensity rain': 'Intensywny deszcz',
      'thunderstorm': 'Burza',
      'snow': 'Śnieg',
      'light snow': 'Lekki śnieg',
      'mist': 'Mgła',
      'fog': 'Gęsta mgła',
      'haze': 'Zamglenie',
      'drizzle': 'Mżawka',
    };
    const lower = description.toLowerCase();
    return descMap[lower] || description;
  };

  const formatTemp = (temp) =>
    temp !== undefined && temp !== null ? `${Math.round(temp)}°C` : '---';

  // Stan ładowania
  if (loading && !currentWeather) {
    return (
      <GlassCard className={`p-4 ${className}`}>
        <div className="flex items-center gap-2 mb-4">
          <Cloud className="w-5 h-5 text-sky-400" />
          <h3 className="text-theme-white font-semibold">Pogoda</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </GlassCard>
    );
  }

  // Stan błędu
  if (error) {
    return (
      <GlassCard className={`p-4 ${className}`}>
        <div className="flex items-center gap-2 mb-4">
          <Cloud className="w-5 h-5 text-sky-400" />
          <h3 className="text-theme-white font-semibold">Pogoda</h3>
        </div>
        <div className="text-center py-4">
          <Cloud className="w-12 h-12 text-slate-500 mx-auto mb-2" />
          <p className="text-sm text-slate-400 mb-1">
            {apiKey
              ? 'Błąd pobierania danych pogodowych'
              : 'Brak klucza API pogody'}
          </p>
          <p className="text-xs text-slate-500 mb-3">
            {apiKey
              ? error
              : 'Skonfiguruj klucz OpenWeatherMap w Ustawieniach → API'}
          </p>
          {apiKey && (
            <Button variant="outline" size="sm" onClick={refresh} className="text-xs">
              <RefreshCw className="w-3 h-3 mr-1" />
              Spróbuj ponownie
            </Button>
          )}
        </div>
      </GlassCard>
    );
  }

  // Brak danych — podgląd zastępczy gdy nie ma klucza
  if (!currentWeather) {
    return (
      <GlassCard className={`p-4 ${className}`}>
        <div className="flex items-center gap-2 mb-4">
          <Cloud className="w-5 h-5 text-sky-400" />
          <h3 className="text-theme-white font-semibold">Pogoda</h3>
        </div>
        <div className="text-center py-6">
          <Sun className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
          <p className="text-theme-white-secondary text-sm">
            Skonfiguruj lokalizację i klucz API
          </p>
          <p className="text-theme-white-muted text-xs mt-1">
            Ustawienia → API → OpenWeatherMap
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {[
              { label: 'Temp', value: '-- °C', icon: Thermometer },
              { label: 'Wiatr', value: '-- km/h', icon: Wind },
              { label: 'Wilgotność', value: '--%', icon: Droplets },
              { label: 'Ciśnienie', value: '-- hPa', icon: Gauge },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="bg-slate-800/50 rounded-lg p-2 text-center">
                <Icon className="w-4 h-4 text-slate-500 mx-auto mb-1" />
                <p className="text-xs text-slate-500">{label}</p>
                <p className="text-sm text-slate-600 font-semibold">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className={`p-4 overflow-hidden ${className}`}>
      {/* Nagłówek */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Cloud className="w-5 h-5 text-sky-400" />
          <h3 className="text-theme-white font-semibold">Pogoda</h3>
          {currentWeather.city && (
            <div className="flex items-center gap-1 text-theme-white-muted text-xs">
              <MapPin className="w-3 h-3" />
              {currentWeather.city}
              {currentWeather.country && `, ${currentWeather.country}`}
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="w-6 h-6"
          onClick={() => {
            refresh();
            setLastUpdate(new Date());
          }}
          disabled={loading}
          title="Odśwież"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Główna pogoda */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {getWeatherIcon(currentWeather.icon, 12)}
          <div>
            <div className="text-3xl font-bold text-theme-white">
              {formatTemp(currentWeather.temp)}
            </div>
            <div className="text-sm text-theme-white-muted capitalize">
              {getWeatherDescription(currentWeather.description)}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-theme-white-secondary flex items-center justify-end gap-1">
            <Thermometer className="w-3 h-3" />
            Odczuwa się {formatTemp(currentWeather.feels_like)}
          </div>
          <div className="text-sm text-theme-white-muted flex items-center justify-end gap-1 mt-1">
            <Wind className="w-3 h-3" />
            Wiatr {Math.round(currentWeather.wind_speed || 0)} km/h
          </div>
          {currentWeather.temp_min !== undefined &&
            currentWeather.temp_max !== undefined && (
              <div className="text-xs text-theme-white-muted mt-1">
                {formatTemp(currentWeather.temp_min)} / {formatTemp(currentWeather.temp_max)}
              </div>
            )}
        </div>
      </div>

      {/* Dodatkowe informacje */}
      <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-700">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-theme-white-muted text-xs mb-1">
            <Droplets className="w-3 h-3" />
            Wilgotność
          </div>
          <p className="text-theme-white text-sm font-medium">
            {currentWeather.humidity !== undefined ? `${currentWeather.humidity}%` : '---'}
          </p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-theme-white-muted text-xs mb-1">
            <Gauge className="w-3 h-3" />
            Ciśnienie
          </div>
          <p className="text-theme-white text-sm font-medium">
            {currentWeather.pressure ? `${currentWeather.pressure} hPa` : '---'}
          </p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-theme-white-muted text-xs mb-1">
            <Eye className="w-3 h-3" />
            Widoczność
          </div>
          <p className="text-theme-white text-sm font-medium">
            {currentWeather.visibility
              ? `${(currentWeather.visibility / 1000).toFixed(1)} km`
              : '---'}
          </p>
        </div>
      </div>

      {/* Prognoza 5-dniowa */}
      {showForecast && forecast && forecast.length > 0 && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="w-full mt-3 text-xs text-theme-white-secondary"
          >
            {expanded ? 'Zwiń prognozę' : 'Pokaż prognozę na 5 dni'}
          </Button>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-5 gap-1 mt-3 pt-3 border-t border-slate-700">
                  {forecast.slice(0, 5).map((day, idx) => (
                    <div key={idx} className="text-center">
                      <p className="text-xs text-theme-white-muted capitalize">
                        {day.date
                          ? format(new Date(day.date), 'EEE', { locale: pl })
                          : '---'}
                      </p>
                      <div className="my-1 flex justify-center">
                        {getWeatherIcon(day.icon, 6)}
                      </div>
                      <p className="text-xs text-theme-white">
                        {formatTemp(day.temp_max)}/{formatTemp(day.temp_min)}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Czas ostatniej aktualizacji — FIX: zarządzany lokalnie */}
      {lastUpdate && (
        <p className="text-xs text-theme-white-muted text-center mt-3">
          Aktualizacja: {format(lastUpdate, 'HH:mm')}
        </p>
      )}
    </GlassCard>
  );
};

export default WeatherWidget;
