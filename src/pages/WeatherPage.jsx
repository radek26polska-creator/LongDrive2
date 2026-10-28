// src/pages/WeatherPage.jsx
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Cloud, Sun, CloudRain, Snowflake, Wind, Droplets, 
  Thermometer, RefreshCw, MapPin, CloudFog,
  CloudLightning, CloudDrizzle, Gauge, ArrowLeft,
  Calendar
} from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getCurrentWeather, getForecastFromOpenMeteo } from '@/lib/weatherApi';
import { format, isToday, isTomorrow } from 'date-fns';
import { pl } from 'date-fns/locale';
import { accountStorage } from '@/lib/accountStorage';

const WeatherPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedDay, setSelectedDay] = useState(null);
  const [forecastDays, setForecastDays] = useState(7);
  
  const [currentWeather, setCurrentWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  
  const passedState = location.state || {};
  const { location: initialLocation } = passedState;
  
  // Pobierz klucz API z localStorage
  const getApiKey = () => {
    const savedApi = accountStorage.getItem('api_settings');
    if (savedApi) {
      try {
        const parsed = JSON.parse(savedApi);
        return parsed.openWeatherApiKey || null;
      } catch (e) {
        return null;
      }
    }
    return null;
  };

  // Pobierz lokalizację
  const getLocation = () => {
    return new Promise((resolve, reject) => {
      if (initialLocation?.lat && initialLocation?.lng) {
        resolve(initialLocation);
        return;
      }
      
      const companySettings = accountStorage.getItem('company_settings');
      if (companySettings) {
        try {
          const parsed = JSON.parse(companySettings);
          if (parsed.city) {
            const apiKey = getApiKey();
            if (apiKey) {
              fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(parsed.city)},PL&limit=1&appid=${apiKey}`)
                .then(res => res.json())
                .then(data => {
                  if (data && data[0]) {
                    resolve({ lat: data[0].lat, lng: data[0].lon, city: parsed.city });
                  } else {
                    reject('Nie znaleziono miasta');
                  }
                })
                .catch(reject);
              return;
            }
          }
        } catch (e) {}
      }
      
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              city: 'Twoja lokalizacja'
            });
          },
          (err) => reject('Nie udało się pobrać lokalizacji GPS')
        );
      } else {
        reject('Geolokalizacja nie jest wspierana');
      }
    });
  };

  // Pobierz dane pogodowe
  const fetchWeatherData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const apiKey = getApiKey();
      if (!apiKey) {
        setError('Brak klucza API OpenWeatherMap. Dodaj go w ustawieniach.');
        setLoading(false);
        return;
      }
      
      const locationData = await getLocation();
      
      const current = await getCurrentWeather(locationData.lat, locationData.lng, apiKey);
      if (current) {
        setCurrentWeather(current);
      } else {
        setError('Nie udało się pobrać aktualnej pogody');
      }
      
      const forecastData = await getForecastFromOpenMeteo(locationData.lat, locationData.lng, forecastDays);
      setForecast(forecastData || []);
      setLastUpdate(new Date());
      
    } catch (err) {
      console.error('Błąd pobierania pogody:', err);
      setError(err.message || 'Nie udało się pobrać danych pogodowych');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeatherData();
  }, [forecastDays]);

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

  const getDayLabel = (date) => {
    if (isToday(new Date(date))) return 'Dziś';
    if (isTomorrow(new Date(date))) return 'Jutro';
    return format(new Date(date), 'EEEE', { locale: pl });
  };

  if (loading && !currentWeather) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Prognoza pogody"
        subtitle={currentWeather?.city ? `Aktualna pogoda dla ${currentWeather.city}` : "Szczegółowa prognoza"}
        icon={Cloud}
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Wróć
          </Button>
        }
      />

      {error && (
        <GlassCard className="p-4 border border-red-500/20">
          <p className="text-red-400 text-center">{error}</p>
          <div className="flex justify-center mt-3">
            <Button onClick={fetchWeatherData} className="bg-gradient-primary">
              <RefreshCw className="w-4 h-4 mr-2" />
              Spróbuj ponownie
            </Button>
          </div>
        </GlassCard>
      )}

      {currentWeather && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <GlassCard className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-4">
                {getWeatherIcon(currentWeather.icon, 64)}
                <div>
                  <div className="text-5xl font-bold text-theme-white">{formatTemp(currentWeather.temp)}</div>
                  <div className="text-lg text-theme-white-muted">{getWeatherDescription(currentWeather.description)}</div>
                  <div className="text-sm text-theme-white-muted mt-1 flex items-center gap-2">
                    <MapPin className="w-3 h-3" /> {currentWeather.city || 'Twoja lokalizacja'}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-theme-white-muted text-sm"><Thermometer className="w-4 h-4" /> Odczuwalna</div>
                  <p className="text-theme-white font-semibold">{formatTemp(currentWeather.feels_like)}</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-theme-white-muted text-sm"><Wind className="w-4 h-4" /> Wiatr</div>
                  <p className="text-theme-white font-semibold">{Math.round(currentWeather.wind_speed)} km/h</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-theme-white-muted text-sm"><Droplets className="w-4 h-4" /> Wilgotność</div>
                  <p className="text-theme-white font-semibold">{currentWeather.humidity}%</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-theme-white-muted text-sm"><Gauge className="w-4 h-4" /> Ciśnienie</div>
                  <p className="text-theme-white font-semibold">{currentWeather.pressure} hPa</p>
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {forecast.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                <h3 className="text-theme-white font-semibold">Prognoza</h3>
              </div>
              <div className="flex items-center gap-3">
                <Select value={forecastDays.toString()} onValueChange={(v) => setForecastDays(parseInt(v))}>
                  <SelectTrigger className="w-28 h-8 text-sm bg-slate-800 border-slate-700">
                    <SelectValue placeholder="Liczba dni" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="3">3 dni</SelectItem>
                    <SelectItem value="5">5 dni</SelectItem>
                    <SelectItem value="7">7 dni</SelectItem>
                    <SelectItem value="14">14 dni</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" onClick={fetchWeatherData} disabled={loading}>
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
              {forecast.map((day, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl text-center transition-all cursor-pointer hover:bg-slate-800/50 ${
                    selectedDay === idx ? 'bg-slate-800/70 border border-primary' : 'bg-slate-800/30'
                  }`}
                  onClick={() => setSelectedDay(selectedDay === idx ? null : idx)}
                >
                  <p className="text-theme-white font-medium">{getDayLabel(day.date)}</p>
                  <p className="text-xs text-theme-white-muted">{format(new Date(day.date), 'dd MMM', { locale: pl })}</p>
                  <div className="my-2">{getWeatherIcon(day.icon, 40)}</div>
                  <p className="text-lg text-theme-white font-bold">{formatTemp(day.temp_max)}</p>
                  <p className="text-sm text-theme-white-muted">{formatTemp(day.temp_min)}</p>
                  {selectedDay === idx && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-3 pt-3 border-t border-slate-700">
                      <p className="text-xs text-theme-white-muted">{getWeatherDescription(day.description)}</p>
                    </motion.div>
                  )}
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>
      )}

      {lastUpdate && (
        <p className="text-xs text-theme-white-muted text-center">
          Ostatnia aktualizacja: {format(lastUpdate, 'HH:mm:ss', { locale: pl })}
        </p>
      )}
    </div>
  );
};

export default WeatherPage;