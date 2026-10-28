import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import api from '@/api/apiClient';
import { toast } from 'sonner';

const defaultSettings = {
  theme: 'dark',
  backgroundColor: 'bg-app-gradient1',
  textColor: 'white',
  fontColor: '#f8fafc',
  fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
  fontSize: 14,
  buttonColor: '#5b7cfa',
  buttonTextColor: '#ffffff',
  buttonHoverColor: null,
  menuHighlightColor: '#7c3aed',
  menuTextColor: null,
  menuActiveTextColor: null,
  topBarBackgroundColor: null,
  topBarTextColor: null,
  topBarIconColor: null,
  inputTextColor: '#111827',
  inputBackgroundColor: '#ffffff',
  requireKeyForTrip: false,
  animationType: 'fade',
  animationSpeed: 0.3,
  menuOpacity: 0.5,
  cardOpacity: 0.5,
  cardColor: 'slate',
  customBackground: null,
  menuBackgroundColor: '#0f172a',
  cardBackgroundColor: '#1e293b',
  cardBorderColor: '#475569',
  cardBorderWidth: 1,
};

// Klasy motywów (dla przycisków i gradientów)
const themeClasses = [
  'theme-dark', 'theme-blue', 'theme-purple', 'theme-green',
  'theme-rose', 'theme-amber', 'theme-cyan', 'theme-orange',
  'theme-pink', 'theme-lime', 'theme-sky'
];

// Klasy tła - DODANE 5 NOWYCH (STAXX)
const bgClasses = [
  'bg-app-gradient1', 'bg-app-gradient2', 'bg-app-gradient3', 'bg-app-gradient4',
  'bg-app-gradient5', 'bg-app-gradient6', 'bg-app-gradient7', 'bg-app-gradient8',
  'bg-app-gradient9', 'bg-app-gradient10', 'bg-app-gradient11', 'bg-app-gradient12',
  'bg-app-gradient13', 'bg-app-gradient14', 'bg-app-gradient15',
  'bg-app-solid1', 'bg-app-solid2', 'bg-app-solid3', 'bg-app-solid4',
  'bg-app-solid5', 'bg-app-solid6', 'bg-app-solid7', 'bg-app-solid8',
  'bg-app-solid9', 'bg-app-solid10', 'bg-app-solid11', 'bg-app-solid12',
  'bg-app-solid13', 'bg-app-solid14', 'bg-app-solid15',
  'bg-app-staxx1', 'bg-app-staxx2', 'bg-app-staxx3', 'bg-app-staxx4', 'bg-app-staxx5'
];

// Klasy kolorów tekstu
const textColorClasses = [
  'text-theme-white', 'text-theme-white-secondary', 'text-theme-white-muted',
  'text-theme-blue', 'text-theme-blue-secondary', 'text-theme-blue-muted',
  'text-theme-purple', 'text-theme-purple-secondary', 'text-theme-purple-muted',
  'text-theme-green', 'text-theme-green-secondary', 'text-theme-green-muted',
  'text-theme-amber', 'text-theme-amber-secondary', 'text-theme-amber-muted',
  'text-theme-rose', 'text-theme-rose-secondary', 'text-theme-rose-muted',
  'text-theme-cyan', 'text-theme-cyan-secondary', 'text-theme-cyan-muted',
  'text-theme-orange', 'text-theme-orange-secondary', 'text-theme-orange-muted',
  'text-theme-pink', 'text-theme-pink-secondary', 'text-theme-pink-muted',
  'text-theme-lime', 'text-theme-lime-secondary', 'text-theme-lime-muted',
  'text-theme-sky', 'text-theme-sky-secondary', 'text-theme-sky-muted'
];

// Klasy kolorów dla kafelków (GlassCard i StatCard)
const cardColorClasses = [
  'card-slate', 'card-blue', 'card-purple', 'card-green',
  'card-amber', 'card-rose', 'card-cyan', 'card-orange',
  'card-pink', 'card-lime', 'card-sky'
];

const AppSettingsContext = createContext();

export const AppSettingsProvider = ({ children }) => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const userId = isAuthenticated ? user?.id : null;
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [customBackground, setCustomBackground] = useState(null);
  const [menuOpacity, setMenuOpacity] = useState(0.5);
  const [cardOpacity, setCardOpacity] = useState(0.5);
  
  // NOWE STATE DLA KOLORÓW TŁA
  const [menuBackgroundColor, setMenuBackgroundColor] = useState('#0f172a');
  const [cardBackgroundColor, setCardBackgroundColor] = useState('#1e293b');
  const [loadedUserId, setLoadedUserId] = useState(null);
  const lastPersistedSettings = useRef(null);
  const currentSettingsLoaded = loadedUserId === (userId ?? 'anonymous');
  const activeSettings = currentSettingsLoaded ? settings : defaultSettings;
  const activeCustomBackground = currentSettingsLoaded ? customBackground : defaultSettings.customBackground;
  const activeMenuOpacity = currentSettingsLoaded ? menuOpacity : defaultSettings.menuOpacity;
  const activeCardOpacity = currentSettingsLoaded ? cardOpacity : defaultSettings.cardOpacity;
  const activeMenuBackgroundColor = currentSettingsLoaded
    ? menuBackgroundColor
    : defaultSettings.menuBackgroundColor;
  const activeCardBackgroundColor = currentSettingsLoaded
    ? cardBackgroundColor
    : defaultSettings.cardBackgroundColor;

  useEffect(() => {
    if (authLoading) return undefined;

    let active = true;
    setLoadedUserId(null);
    lastPersistedSettings.current = null;
    setLoading(true);
    setSettings(defaultSettings);
    setCustomBackground(null);
    setMenuOpacity(defaultSettings.menuOpacity);
    setCardOpacity(defaultSettings.cardOpacity);
    setMenuBackgroundColor(defaultSettings.menuBackgroundColor);
    setCardBackgroundColor(defaultSettings.cardBackgroundColor);

    const loadForUser = async () => {
      try {
        const saved = userId ? await api.getAppearanceSettings() : null;
        if (!active) return;
        const parsed = saved && typeof saved === 'object' ? saved : {};
        const nextSettings = {
          ...defaultSettings,
          ...parsed,
          customBackground: parsed.customBackground?.startsWith?.('blob:')
            ? null
            : parsed.customBackground ?? defaultSettings.customBackground,
        };
        setSettings(nextSettings);
        setMenuOpacity(nextSettings.menuOpacity);
        setCardOpacity(nextSettings.cardOpacity);
        setCustomBackground(nextSettings.customBackground || null);
        setMenuBackgroundColor(nextSettings.menuBackgroundColor);
        setCardBackgroundColor(nextSettings.cardBackgroundColor);
        lastPersistedSettings.current = saved ? JSON.stringify(nextSettings) : null;
        setLoadedUserId(userId ?? 'anonymous');
      } catch (error) {
        if (active) {
          console.error('Nie udało się pobrać ustawień wyglądu z konta:', error);
          toast.error('Nie udało się pobrać ustawień wyglądu. Zmiany nie będą zapisywane, aby nie nadpisać danych konta.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadForUser();
    return () => {
      active = false;
    };
  }, [authLoading, userId]);

  const saveSettings = async (newSettings) => {
    if (!userId || loadedUserId !== userId) {
      throw new Error('Ustawienia konta nie są jeszcze dostępne. Spróbuj ponownie po ich wczytaniu.');
    }
    const nextSettings = { ...defaultSettings, ...newSettings };
    setMenuOpacity(nextSettings.menuOpacity);
    setCardOpacity(nextSettings.cardOpacity);
    setCustomBackground(nextSettings.customBackground || null);
    setMenuBackgroundColor(nextSettings.menuBackgroundColor);
    setCardBackgroundColor(nextSettings.cardBackgroundColor);
    setSettings(nextSettings);
    await api.saveAppearanceSettings(nextSettings);
    lastPersistedSettings.current = JSON.stringify(nextSettings);
  };

  const saveMenuOpacity = (value) => {
    setMenuOpacity(value);
    setSettings((previous) => ({ ...previous, menuOpacity: value }));
  };

  const saveCardOpacity = (value) => {
    setCardOpacity(value);
    setSettings((previous) => ({ ...previous, cardOpacity: value }));
  };

  const saveCustomBackground = (url) => {
    if (url?.startsWith('blob:')) return;
    const nextBackground = url || null;
    setCustomBackground(nextBackground);
    setSettings((previous) => ({ ...previous, customBackground: nextBackground }));
  };

  // NOWE FUNKCJE ZAPISU KOLORÓW TŁA
  const saveMenuBackgroundColor = (color) => {
    setMenuBackgroundColor(color);
    setSettings((previous) => ({ ...previous, menuBackgroundColor: color }));
  };

  const saveCardBackgroundColor = (color) => {
    setCardBackgroundColor(color);
    setSettings((previous) => ({ ...previous, cardBackgroundColor: color }));
  };

  useEffect(() => {
    if (!userId || loadedUserId !== userId || loading) return undefined;
    const serialized = JSON.stringify(settings);
    if (serialized === lastPersistedSettings.current) return undefined;
    const timeout = window.setTimeout(() => {
      if (serialized === lastPersistedSettings.current) return;
      api.saveAppearanceSettings(settings)
        .then(() => {
          lastPersistedSettings.current = serialized;
        })
        .catch((error) => {
          console.error('Nie udało się zapisać ustawień wyglądu na koncie:', error);
          toast.error('Nie udało się zsynchronizować ustawień wyglądu z kontem.');
        });
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [settings, userId, loadedUserId, loading]);

  // Nakładanie klasy motywu na <html> (dla zmiennych CSS gradientów)
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove(...themeClasses);
    root.classList.add(`theme-${activeSettings.theme}`);
    root.classList.toggle('dark', activeSettings.theme === 'dark' || activeSettings.mode === 'dark' || activeSettings.darkMode === true);
  }, [activeSettings.theme, activeSettings.mode, activeSettings.darkMode]);

  useEffect(() => {
    const root = document.documentElement;
    const fontColor = activeSettings.fontColor || defaultSettings.fontColor;
    const fontFamily = activeSettings.fontFamily || defaultSettings.fontFamily;
    const fontSize = activeSettings.fontSize || defaultSettings.fontSize;
    const buttonColor = activeSettings.buttonColor || defaultSettings.buttonColor;
    const buttonTextColor = activeSettings.buttonTextColor || defaultSettings.buttonTextColor;
    const buttonHoverColor = activeSettings.buttonHoverColor || buttonColor;
    const menuHighlightColor = activeSettings.menuHighlightColor || defaultSettings.menuHighlightColor;

    const toRgba = (hex, alpha) => {
      const clean = hex.replace('#', '');
      const full = clean.length === 3 ? clean.split('').map((char) => char + char).join('') : clean;
      const value = parseInt(full, 16);
      const r = (value >> 16) & 255;
      const g = (value >> 8) & 255;
      const b = value & 255;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    root.style.setProperty('--text-primary', fontColor);
    root.style.setProperty('--text-secondary', fontColor === '#0f172a' ? '#475569' : '#cbd5e1');
    root.style.setProperty('--input-text-color', activeSettings.inputTextColor || '#111827');
    root.style.setProperty('--input-bg-color', activeSettings.inputBackgroundColor || '#ffffff');
    root.style.setProperty('--primary-color', buttonColor);
    root.style.setProperty('--primary-dark', buttonHoverColor);
    root.style.setProperty('--button-text-color', buttonTextColor);
    root.style.setProperty('--button-hover-color', buttonHoverColor);
    root.style.setProperty('--accent-color', buttonColor);
    root.style.setProperty('--primary-light', buttonColor);
    root.style.setProperty('--primary-soft', toRgba(buttonColor, 0.12));
    root.style.setProperty('--menu-highlight-color', menuHighlightColor);
    root.style.setProperty('--menu-highlight-soft', toRgba(menuHighlightColor, 0.16));
    root.style.setProperty('--primary-gradient', `linear-gradient(135deg, ${buttonColor}, ${buttonColor})`);
    root.style.setProperty('--app-font-family', fontFamily);
    root.style.setProperty('--app-font-size', `${fontSize}px`);
    document.body.style.color = fontColor;
    document.body.style.fontFamily = fontFamily;
    document.body.style.fontSize = `${fontSize}px`;
  }, [activeSettings.fontColor, activeSettings.fontFamily, activeSettings.fontSize, activeSettings.buttonColor, activeSettings.buttonTextColor, activeSettings.buttonHoverColor, activeSettings.menuHighlightColor, activeSettings.inputTextColor, activeSettings.inputBackgroundColor]);

  // Nakładanie klasy tła na <body>
  useEffect(() => {
    const body = document.body;
    body.classList.remove(...bgClasses);
    body.classList.add(activeSettings.backgroundColor);
  }, [activeSettings.backgroundColor]);

  // Nakładanie klas koloru tekstu na <body>
  useEffect(() => {
    const body = document.body;
    body.classList.remove(...textColorClasses);
    if (activeSettings.textColor === 'white') {
      body.classList.add('text-theme-white', 'text-theme-white-secondary', 'text-theme-white-muted');
    } else {
      body.classList.add(
        `text-theme-${activeSettings.textColor}`,
        `text-theme-${activeSettings.textColor}-secondary`,
        `text-theme-${activeSettings.textColor}-muted`
      );
    }
  }, [activeSettings.textColor]);

  // Nakładanie klasy koloru kafelków na <html>
  useEffect(() => {
    const root = document.documentElement;
    if (root) {
      root.classList.remove(...cardColorClasses);
      root.classList.add(`card-${activeSettings.cardColor || 'slate'}`);
    }
  }, [activeSettings.cardColor]);

  return (
    <AppSettingsContext.Provider value={{ 
      settings: activeSettings,
      saveSettings, 
      loading,
      menuOpacity: activeMenuOpacity,
      cardOpacity: activeCardOpacity,
      saveMenuOpacity,
      saveCardOpacity,
      customBackground: activeCustomBackground,
      saveCustomBackground,
      cardColor: activeSettings.cardColor,
      fontColor: activeSettings.fontColor,
      fontFamily: activeSettings.fontFamily,
      fontSize: activeSettings.fontSize,
      buttonColor: activeSettings.buttonColor,
      menuHighlightColor: activeSettings.menuHighlightColor,
      menuBackgroundColor: activeMenuBackgroundColor,
      cardBackgroundColor: activeCardBackgroundColor,
      cardBorderColor: activeSettings.cardBorderColor,
      cardBorderWidth: activeSettings.cardBorderWidth,
      saveMenuBackgroundColor,
      saveCardBackgroundColor,
    }}>
      {children}
    </AppSettingsContext.Provider>
  );
};

export const useAppSettings = () => {
  const context = useContext(AppSettingsContext);
  if (!context) {
    throw new Error('useAppSettings must be used within AppSettingsProvider');
  }
  return context;
};