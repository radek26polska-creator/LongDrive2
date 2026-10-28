import React from 'react';
import { 
  ZoomIn, ZoomOut, Maximize2, Minimize2, Crosshair, 
  Layers, Sun, Moon, Map, Satellite, Terrain,
  Home
} from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';

const MapControls = ({
  map,
  onZoomIn,
  onZoomOut,
  onFullscreen,
  onCenterLocation,
  onHome,
  onStyleChange,
  onProviderChange,
  isFullscreen = false,
  currentStyle = 'road',
  currentProvider = 'osm',
  showStyleControls = true,
  showProviderControls = true,
  className = '',
}) => {
  const styles = [
    { id: 'road', name: 'Drogi', icon: Map },
    { id: 'satellite', name: 'Satelita', icon: Satellite },
    { id: 'terrain', name: 'Teren', icon: Terrain },
    { id: 'dark', name: 'Ciemny', icon: Moon },
    { id: 'light', name: 'Jasny', icon: Sun },
  ];

  const providers = [
    { id: 'osm', name: 'OpenStreetMap', free: true },
    { id: 'carto', name: 'CartoDB', free: true },
    { id: 'stadia', name: 'Stadia Maps', free: true },
    { id: 'google', name: 'Google Maps', requiresApiKey: true },
  ];

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* Zoom i podstawowe kontrolki */}
      <GlassCard className="p-1 flex flex-col gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8"
          onClick={onZoomIn}
          title="Przybliż"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8"
          onClick={onZoomOut}
          title="Oddal"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        <div className="h-px bg-slate-700 my-1" />
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8"
          onClick={onCenterLocation}
          title="Moja lokalizacja"
        >
          <Crosshair className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8"
          onClick={onHome}
          title="Widok domyślny"
        >
          <Home className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8"
          onClick={onFullscreen}
          title={isFullscreen ? 'Zamknij pełny ekran' : 'Pełny ekran'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </Button>
      </GlassCard>

      {/* Kontrolki stylu mapy */}
      {showStyleControls && (
        <GlassCard className="p-1 flex flex-col gap-1">
          <div className="px-2 py-1 text-xs text-theme-white-muted text-center border-b border-token">
            Styl
          </div>
          {styles.map((style) => {
            const Icon = style.icon;
            return (
              <Button
                key={style.id}
                variant={currentStyle === style.id ? "default" : "ghost"}
                size="icon"
                className={`w-8 h-8 ${currentStyle === style.id ? 'bg-primary' : ''}`}
                onClick={() => onStyleChange?.(style.id)}
                title={style.name}
              >
                <Icon className="w-4 h-4" />
              </Button>
            );
          })}
        </GlassCard>
      )}

      {/* Kontrolki dostawcy mapy */}
      {showProviderControls && (
        <GlassCard className="p-1 flex flex-col gap-1">
          <div className="px-2 py-1 text-xs text-theme-white-muted text-center border-b border-token">
            Źródło
          </div>
          {providers.map((provider) => (
            <Button
              key={provider.id}
              variant={currentProvider === provider.id ? "default" : "ghost"}
              size="icon"
              className={`w-8 h-8 ${currentProvider === provider.id ? 'bg-primary' : ''}`}
              onClick={() => onProviderChange?.(provider.id)}
              title={`${provider.name}${provider.requiresApiKey ? ' (wymaga klucza)' : provider.free ? ' (darmowy)' : ''}`}
            >
              <Layers className="w-4 h-4" />
            </Button>
          ))}
        </GlassCard>
      )}
    </div>
  );
};

export default MapControls;