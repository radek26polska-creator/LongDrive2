// src/components/weather/WeatherWidget.jsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Cloud, Sun, CloudRain, Snowflake, Wind, Droplets, 
  Thermometer, RefreshCw, MapPin, CloudFog,
  CloudLightning, CloudDrizzle, Eye, Gauge, ChevronRight,
  Calendar, ExternalLink
} from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [forecastDays, setForecastDays] = useState(5);
  
  const { currentWeather, forecast, loading, error, refresh, lastUpdate } = useWeather(
    location,
    apiKey,
    autoRefresh,
    forecastDays
  );

  const getWeatherIcon = (iconCode, size = 48) => {
    const sizeClass = size === 48 ? "w-12 h-12" : size === 32 ? "w-8 h-8" : "w-6 h-6";
    const iconMap = {
      '01d': <Sun className={`${sizeClass} text-yellow-400`} />,
      '01n': <Sun className={`${sizeClass} text-yellow-400`} />,
      '02d': <Cloud className={`${sizeClass} text-slate-300`} />,
      '02n': <Cloud className={`${sizeClass} text-slate-300`} />,
      '03d': <Cloud className={`${sizeClass} text-slate-300`} />,
      '03n': <Cloud className={`${sizeClass} text-slate-300`} />,
      '04d': <Cloud className={`${sizeClass} text-slate-400`} />,
      '04n': <Cloud className={`${sizeClass} text-slate-400`} />,
      '09d': <CloudDrizzle className={`${sizeClass} text-blue-400`} />,
      '09n': <CloudDrizzle className={`${sizeClass} text-blue-400`} />,
      '10d': <CloudRain className={`${sizeClass} text-blue-400`} />,
      '10n': <CloudRain className={`${sizeClass} text-blue-400`} />,
      '11d': <CloudLightning className={`${sizeClass} text-yellow-500`} />,
      '11n': <CloudLightning className={`${sizeClass} text-yellow-500`} />,
      '13d': <Snowflake className={`${sizeClass} text-cyan-300`} />,
      '13n': <Snowflake className={`${sizeClass} text-cyan-300`} />,
      '50d': <CloudFog className={`${sizeClass} text-slate-400`} />,
      '50n': <CloudFog className={`${sizeClass} text-slate-400`} />,
    };
    return iconMap[iconCode] || <Cloud className={`${sizeClass} text-slate-300`} />;
  };

  const getWeatherDescription = (description) => {
    if (!description) return 'Brak danych';
    const descMap = {
      'clear sky': 'Bezchmurnie',
      'few clouds': 'Małe zachmurzenie',
      'scattered clouds': 'Umiarkowane zachmurzenie',
      'broken clouds': 'Duże zachmurzenie',
      'overcast clouds': 'Pochmurno',
      'shower rain': 'Przelotne opady',
      'rain': 'Deszcz',
      'thunderstorm': 'Burza',
      'snow': 'Śnieg',
      'mist': 'Mgła',
      'fog': 'Mgła',
    };
    return descMap[description.toLowerCase()] || description;
  };

  const formatTemp = (temp) => {
    if (temp === undefined || temp === null) return '---';
    return `${Math.round(temp)}°C`;
  };

  const handleGoToWeatherPage = () => {
    navigate('/weather', { state: { currentWeather, forecast, location, forecastDays } });
  };

  const handleDaysChange = (value) => {
    setForecastDays(parseInt(value));
  };

  if (loading && !currentWeather) {
    return (
      <GlassCard className={`p-4 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </GlassCard>
    );
  }

  if (error) {
    return (
      <GlassCard className={`p-4 ${className}`}>
        <div className="text-center py-4">
          <Cloud className="w-12 h-12 text-slate-500 mx-auto mb-2" />
          <p className="text-sm text-red-400">{error}</p>
          <Button variant="outline" size="sm" onClick={refresh} className="mt-3">
            <RefreshCw className="w-3 h-3 mr-1" />
            Spróbuj ponownie
          </Button>
        </div>
      </GlassCard>
    );
  }

  if (!currentWeather) {
    return (
      <GlassCard className={`p-4 ${className}`}>
        <div className="text-center py-4">
          <Cloud className="w-12 h-12 text-slate-500 mx-auto mb-2" />
          <p className="text-sm text-theme-white-muted">Brak danych pogodowych</p>
          <p className="text-xs text-theme-white-muted mt-1">Dodaj klucz API OpenWeather w ustawieniach</p>
          <Button variant="outline" size="sm" onClick={refresh} className="mt-3">
            <RefreshCw className="w-3 h-3 mr-1" />
            Odśwież
          </Button>
        </div>
      </GlassCard>
    );
  }

  const displayedForecast = forecast;

  return (
    <GlassCard className={`p-4 overflow-hidden ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Cloud className="w-5 h-5 text-primary" />
          <h3 className="text-theme-white font-semibold">Pogoda</h3>
          {currentWeather.city && (
            <span className="text-xs text-theme-white-muted flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {currentWeather.city}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="w-6 h-6" onClick={refresh} disabled={loading}>
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="ghost" size="icon" className="w-6 h-6" onClick={handleGoToWeatherPage}>
            <ExternalLink className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Główna pogoda */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {getWeatherIcon(currentWeather.icon, 48)}
          <div>
            <div className="text-3xl font-bold text-theme-white">{formatTemp(currentWeather.temp)}</div>
            <div className="text-sm text-theme-white-muted">{getWeatherDescription(currentWeather.description)}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-theme-white-muted flex items-center gap-1">
            <Thermometer className="w-3 h-3" /> Odczuwalna: {formatTemp(currentWeather.feels_like)}
          </div>
          <div className="text-sm text-theme-white-muted flex items-center gap-1 mt-1">
            <Wind className="w-3 h-3" /> Wiatr: {Math.round(currentWeather.wind_speed)} km/h
          </div>
        </div>
      </div>

      {/* Dodatkowe informacje */}
      <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-700">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-theme-white-muted text-xs"><Droplets className="w-3 h-3" /> Wilgotność</div>
          <p className="text-theme-white text-sm">{currentWeather.humidity || '---'}%</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-theme-white-muted text-xs"><Gauge className="w-3 h-3" /> Ciśnienie</div>
          <p className="text-theme-white text-sm">{currentWeather.pressure || '---'} hPa</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-theme-white-muted text-xs"><Eye className="w-3 h-3" /> Widoczność</div>
          <p className="text-theme-white text-sm">{currentWeather.visibility ? `${(currentWeather.visibility / 1000).toFixed(1)} km` : '---'}</p>
        </div>
      </div>

      {/* Prognoza z wyborem dni */}
      {showForecast && forecast.length > 0 && (
        <>
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-700">
            <div className="flex items-center gap-2">
              <Calendar className="w-3 h-3 text-theme-white-muted" />
              <span className="text-xs text-theme-white-muted">Prognoza</span>
            </div>
            <div className="flex items-center gap-2">
              <Select value={forecastDays.toString()} onValueChange={handleDaysChange}>
                <SelectTrigger className="w-24 h-7 text-xs bg-slate-800 border-slate-700">
                  <SelectValue placeholder="Dni" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="3">3 dni</SelectItem>
                  <SelectItem value="5">5 dni</SelectItem>
                  <SelectItem value="7">7 dni</SelectItem>
                  <SelectItem value="14">14 dni</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)} className="text-xs h-7 px-2">
                {expanded ? 'Zwiń' : 'Rozwiń'}
                <ChevronRight className={`w-3 h-3 ml-1 transition-transform ${expanded ? 'rotate-90' : ''}`} />
              </Button>
            </div>
          </div>

          <AnimatePresence>
            {expanded && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 mt-3 pt-3 border-t border-slate-700">
                  {displayedForecast.map((day, idx) => (
                    <div key={idx} className="text-center p-2 rounded-lg bg-slate-800/30">
                      <p className="text-xs text-theme-white-muted font-medium">{idx === 0 ? 'Dziś' : format(new Date(day.date), 'EEE', { locale: pl })}</p>
                      <p className="text-xs text-theme-white-muted">{format(new Date(day.date), 'dd MMM', { locale: pl })}</p>
                      <div className="my-1">{getWeatherIcon(day.icon, 32)}</div>
                      <p className="text-xs text-theme-white font-semibold">{formatTemp(day.temp_max)}</p>
                      <p className="text-xs text-theme-white-muted">{formatTemp(day.temp_min)}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      <Button variant="outline" size="sm" onClick={handleGoToWeatherPage} className="w-full mt-3 text-xs">
        <ExternalLink className="w-3 h-3 mr-1" /> Szczegółowa prognoza <ChevronRight className="w-3 h-3 ml-1" />
      </Button>

      {lastUpdate && (
        <p className="text-xs text-theme-white-muted text-center mt-2">
          Aktualizacja: {format(lastUpdate, 'HH:mm')}
        </p>
      )}
    </GlassCard>
  );
};

export default WeatherWidget;