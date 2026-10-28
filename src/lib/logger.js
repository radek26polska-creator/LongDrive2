// src/lib/logger.js
import { accountStorage } from '@/lib/accountStorage';
const MAX_LOGS = 1000;
const STORAGE_KEY = 'app_debug_logs';

let logs = [];
let enabled = false;

// Wczytaj zapisane logi z localStorage
export const loadLogsFromStorage = () => {
  try {
    const stored = accountStorage.getItem(STORAGE_KEY);
    if (stored) {
      logs = JSON.parse(stored);
      console.log(`📋 Wczytano ${logs.length} logów z pamięci`);
    }
  } catch (e) {
    console.error('Błąd wczytywania logów:', e);
  }
};

// Zapisz logi do localStorage
const saveLogsToStorage = () => {
  try {
    accountStorage.setItem(STORAGE_KEY, JSON.stringify(logs.slice(-MAX_LOGS)));
  } catch (e) {
    console.error('Błąd zapisu logów:', e);
  }
};

export const logger = {
  enable() {
    enabled = true;
    console.log('🔍 Debug mode ENABLED');
    this.log('system', 'Debug mode enabled', null);
  },

  disable() {
    enabled = false;
    console.log('🔍 Debug mode DISABLED');
    this.log('system', 'Debug mode disabled', null);
  },

  isEnabled() {
    return enabled;
  },

  log(type, message, data = null) {
    if (!enabled) return;

    const entry = {
      id: Date.now(),
      type, // 'info' | 'error' | 'warn' | 'system' | 'api' | 'navigation'
      message,
      data: data ? JSON.parse(JSON.stringify(data)) : null, // deep clone
      timestamp: new Date().toISOString(),
      url: window.location.href,
    };

    logs.push(entry);

    // Ogranicz liczbę logów
    if (logs.length > MAX_LOGS) {
      logs = logs.slice(-MAX_LOGS);
    }

    saveLogsToStorage();

    // Wyświetl w konsoli dla wygody
    const logPrefix = `[${entry.type.toUpperCase()}]`;
    if (type === 'error') {
      console.error(logPrefix, message, data || '');
    } else if (type === 'warn') {
      console.warn(logPrefix, message, data || '');
    } else {
      console.log(logPrefix, message, data || '');
    }
  },

  getLogs() {
    return [...logs];
  },

  getLogsByType(type) {
    return logs.filter(log => log.type === type);
  },

  clear() {
    logs = [];
    saveLogsToStorage();
    this.log('system', 'Logs cleared', null);
  },

  export() {
    return {
      exportDate: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      logs: logs,
    };
  }
};

// Inicjalizacja
loadLogsFromStorage();