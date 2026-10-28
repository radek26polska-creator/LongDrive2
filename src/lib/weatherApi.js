// src/lib/weatherApi.js
// API dla pogody - OpenWeatherMap (bieżąca) + Open-Meteo (prognoza)

const OPENWEATHER_BASE = 'https://api.openweathermap.org/data/2.5';

// ========================================
// BIEŻĄCA POGODA (OpenWeatherMap)
// ========================================
export const getCurrentWeather = async (lat, lng, apiKey) => {
  if (!apiKey) {
    console.error('Brak klucza API OpenWeatherMap');
    return null;
  }
  try {
    const response = await fetch(
      `${OPENWEATHER_BASE}/weather?lat=${lat}&lon=${lng}&units=metric&lang=pl&appid=${apiKey}`
    );
    if (!response.ok) throw new Error('Błąd pobierania pogody');
    const data = await response.json();
    
    return {
      temp: Math.round(data.main.temp),
      feels_like: Math.round(data.main.feels_like),
      humidity: data.main.humidity,
      pressure: data.main.pressure,
      description: data.weather[0].description,
      icon: data.weather[0].icon,
      wind_speed: data.wind.speed,
      wind_deg: data.wind.deg,
      clouds: data.clouds.all,
      visibility: data.visibility || 10000,
      city: data.name,
    };
  } catch (error) {
    console.error('Weather API error:', error);
    return null;
  }
};

// ========================================
// PROGNOZA DŁUGOTERMINOWA (Open-Meteo - DARMOWE, BEZ KLUCZA)
// ========================================
export const getForecastFromOpenMeteo = async (lat, lng, days = 7) => {
  try {
    const maxDays = Math.min(days, 16);
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=${maxDays}`
    );
    if (!response.ok) throw new Error('Błąd pobierania prognozy');
    const data = await response.json();
    
    const mapWeatherCodeToIcon = (code) => {
      if (code === 0) return '01d';
      if (code === 1 || code === 2) return '02d';
      if (code === 3) return '04d';
      if (code >= 45 && code <= 48) return '50d';
      if (code >= 51 && code <= 67) return '10d';
      if (code >= 61 && code <= 65) return '10d';
      if (code >= 71 && code <= 77) return '13d';
      if (code >= 80 && code <= 82) return '09d';
      if (code >= 95 && code <= 99) return '11d';
      return '03d';
    };
    
    const getDescriptionFromCode = (code) => {
      if (code === 0) return 'clear sky';
      if (code === 1 || code === 2) return 'few clouds';
      if (code === 3) return 'overcast clouds';
      if (code >= 45 && code <= 48) return 'fog';
      if (code >= 51 && code <= 67) return 'rain';
      if (code >= 61 && code <= 65) return 'rain';
      if (code >= 71 && code <= 77) return 'snow';
      if (code >= 80 && code <= 82) return 'shower rain';
      if (code >= 95 && code <= 99) return 'thunderstorm';
      return 'scattered clouds';
    };
    
    return data.daily.time.map((date, index) => ({
      date: date,
      temp_max: Math.round(data.daily.temperature_2m_max[index]),
      temp_min: Math.round(data.daily.temperature_2m_min[index]),
      icon: mapWeatherCodeToIcon(data.daily.weathercode[index]),
      description: getDescriptionFromCode(data.daily.weathercode[index]),
    }));
  } catch (error) {
    console.error('Open-Meteo error:', error);
    return [];
  }
};

// Dla zachowania kompatybilności
export const getForecast = async (lat, lng, apiKey, days = 5) => {
  return getForecastFromOpenMeteo(lat, lng, days);
};

// ========================================
// IKONY EMOJI
// ========================================
export const getWeatherIconEmoji = (iconCode) => {
  const icons = {
    '01d': '☀️', '01n': '🌙',
    '02d': '⛅', '02n': '☁️',
    '03d': '☁️', '03n': '☁️',
    '04d': '☁️', '04n': '☁️',
    '09d': '🌧️', '09n': '🌧️',
    '10d': '🌦️', '10n': '🌧️',
    '11d': '⛈️', '11n': '⛈️',
    '13d': '❄️', '13n': '❄️',
    '50d': '🌫️', '50n': '🌫️',
  };
  return icons[iconCode] || '🌡️';
};