// Konfiguracja różnych dostawców map
export const mapProviders = {
  osm: {
    name: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
    free: true,
  },
  google: {
    name: 'Google Maps',
    url: 'https://maps.googleapis.com/maps/api/js',
    attribution: '&copy; Google Maps',
    maxZoom: 20,
    requiresApiKey: true,
  },
  maptiler: {
    name: 'MapTiler',
    url: 'https://api.maptiler.com/maps/streets/{z}/{x}/{y}.png?key={apiKey}',
    attribution: '&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a>',
    maxZoom: 20,
    requiresApiKey: true,
  },
  carto: {
    name: 'CartoDB',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; CartoDB',
    maxZoom: 19,
    free: true,
  },
  stadia: {
    name: 'Stadia Maps',
    url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>',
    maxZoom: 20,
    free: true,
  },
};

// Style mapy
export const mapStyles = {
  road: {
    name: 'Drogi (standard)',
    provider: 'osm',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  },
  satellite: {
    name: 'Satelitarny',
    provider: 'google',
    requiresApiKey: true,
  },
  terrain: {
    name: 'Terenowy',
    provider: 'stadia',
    url: 'https://tiles.stadiamaps.com/tiles/outdoors/{z}/{x}/{y}.png',
  },
  dark: {
    name: 'Ciemny (nocny)',
    provider: 'carto',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
  },
  light: {
    name: 'Jasny',
    provider: 'carto',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
  },
};

// Kolory tras wg typu pojazdu
export const defaultRouteColors = {
  car: '#3b82f6',      // niebieski - samochód
  truck: '#ef4444',    // czerwony - ciężarówka
  van: '#10b981',      // zielony - dostawczy
  bus: '#8b5cf6',      // fioletowy - autobus
  motorcycle: '#f59e0b' // pomarańczowy - motocykl
};