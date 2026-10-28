// Typy dla modułu mapy

export interface Position {
  lat: number;
  lng: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  timestamp?: Date;
}

export interface MapSettings {
  provider: 'google' | 'osm' | 'maptiler' | 'carto' | 'stadia';
  mapStyle: 'road' | 'satellite' | 'terrain' | 'dark' | 'light';
  defaultZoom: number;
  autoCenter: boolean;
  showMarkers: boolean;
  showStops: boolean;
  showTraffic: boolean;
  saveHistory: boolean;
  historyRetention: '30' | '90' | '180' | '365' | '0';
  routeColors: RouteColors;
}

export interface RouteColors {
  car: string;
  truck: string;
  van: string;
  bus: string;
  motorcycle: string;
}

export interface MapProvider {
  id: string;
  name: string;
  url: string;
  attribution: string;
  maxZoom: number;
  requiresApiKey?: boolean;
  free?: boolean;
}

export interface MapStyle {
  id: string;
  name: string;
  provider: string;
  url?: string;
  requiresApiKey?: boolean;
}

export interface RoutePoint extends Position {
  name?: string;
  description?: string;
  type?: 'start' | 'end' | 'stop' | 'waypoint';
  order?: number;
}

export interface TrackedTrip {
  id: string;
  vehicleId: number;
  driverId: number;
  startTime: Date;
  endTime?: Date;
  startPosition: Position;
  endPosition?: Position;
  track: Position[];
  distance: number;
  duration: number;
  averageSpeed: number;
  maxSpeed: number;
}

export interface LocationSearchResult {
  lat: number;
  lng: number;
  name: string;
  display_name: string;
  type?: string;
  importance?: number;
}

export interface MapMarker {
  id: string;
  position: Position;
  title?: string;
  popup?: string;
  icon?: string;
  color?: string;
}

export interface MapRoute {
  id: string;
  waypoints: Position[];
  color?: string;
  weight?: number;
  opacity?: number;
  distance?: number;
  duration?: number;
}