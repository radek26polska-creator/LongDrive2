// src/lib/errorHandler.js
import { logger } from './logger';

// Globalny handler błędów
export const setupGlobalErrorHandler = () => {
  // Łapanie błędów JavaScript
  window.onerror = function (message, source, lineno, colno, error) {
    logger.log('error', message, {
      source,
      lineno,
      colno,
      stack: error?.stack,
    });
    return false;
  };

  // Łapanie odrzuconych obietnic
  window.onunhandledrejection = function (event) {
    logger.log('error', 'Unhandled Promise Rejection', {
      reason: event.reason?.message || event.reason,
      stack: event.reason?.stack,
    });
  };

  // Łapanie błędów konsoli (opcjonalne)
  const originalConsoleError = console.error;
  console.error = function (...args) {
    logger.log('error', args.join(' '), { args });
    originalConsoleError.apply(console, args);
  };
};

// Funkcja do logowania akcji użytkownika
export const logAction = (action, details = null) => {
  logger.log('info', `User action: ${action}`, details);
};

// Funkcja do logowania nawigacji
export const logNavigation = (from, to) => {
  logger.log('navigation', `Navigate: ${from} → ${to}`, { from, to });
};

// Funkcja do logowania API
export const logApi = (endpoint, method, status, data = null) => {
  logger.log('api', `${method} ${endpoint} → ${status}`, { endpoint, method, status, data });
};