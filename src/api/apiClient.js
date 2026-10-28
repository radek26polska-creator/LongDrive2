// src/api/apiClient.js
import { logApi } from '@/lib/errorHandler';
import { API_BASE_URL } from '@/lib/runtimeConfig';

const getToken = () => localStorage.getItem('token');
const setToken = (token) => {
  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }
};

// Helper do budowania query string
const buildQueryString = (params) => {
  if (!params || Object.keys(params).length === 0) return '';
  const query = Object.entries(params)
    .filter(([_, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  return query ? `?${query}` : '';
};

async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const method = options.method || 'GET';
  const startTime = Date.now();
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Obsługa FormData (dla przesyłania plików)
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }
  
  const config = {
    ...options,
    headers,
  };
  
  // Usuń body jeśli to GET lub HEAD
  if (method === 'GET' || method === 'HEAD') {
    delete config.body;
  }
  
  try {
    const response = await fetch(url, config);
    const duration = Date.now() - startTime;
    
    if (response.status === 401) {
      logApi(endpoint, method, 401, { duration });
      if (token && getToken() === token) {
        setToken(null);
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
      throw new Error('Sesja wygasła. Zaloguj się ponownie.');
    }
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: response.statusText };
      }
      logApi(endpoint, method, response.status, { duration, error: errorData });
      /** @type {Error & { code?: string }} */
      const requestError = new Error(
        errorData.error || errorData.message || `Błąd ${response.status}: ${response.statusText}`
      );
      requestError.code = errorData.code;
      throw requestError;
    }
    
    // Dla odpowiedzi 204 No Content
    if (response.status === 204) {
      logApi(endpoint, method, response.status, { duration, success: true });
      return null;
    }
    
    const data = await response.json();
    logApi(endpoint, method, response.status, { duration, success: true });
    return data;
  } catch (error) {
    // Rozróżnij błędy sieciowe od innych
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      logApi(endpoint, method, 'NETWORK_ERROR', { message: 'Brak połączenia z serwerem' });
      throw new Error('Brak połączenia z serwerem. Sprawdź swoje połączenie internetowe.');
    }
    logApi(endpoint, method, 'UNKNOWN_ERROR', { message: error.message });
    throw error;
  }
}

const api = {
  // ==================== AUTH ====================
  login: async (email, password) => {
    const result = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (result.token) {
      setToken(result.token);
    }
    return result;
  },
  
  register: async (data) => {
    const registerAccount = globalThis.longDriveRuntime?.registerAccount;
    const result = typeof registerAccount === 'function'
      ? await registerAccount(data)
      : await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    if (result.token) {
      setToken(result.token);
    }
    return result;
  },
  
  logout: () => apiRequest('/auth/logout', { method: 'POST' }),
  
  getMe: () => apiRequest('/auth/me'),

  changePassword: async (oldPassword, newPassword) => {
    return apiRequest('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ oldPassword, newPassword }),
    });
  },
  
  // ==================== VEHICLES ====================
  getVehicles: (params = {}) => {
    const query = buildQueryString(params);
    return apiRequest(`/vehicles${query}`);
  },
  
  getVehicle: (id) => apiRequest(`/vehicles/${id}`),
  
  createVehicle: (data) => apiRequest('/vehicles', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  updateVehicle: (id, data) => apiRequest(`/vehicles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  
  deleteVehicle: (id) => apiRequest(`/vehicles/${id}`, {
    method: 'DELETE',
  }),
  
  // ==================== DRIVERS ====================
  getDrivers: (params = {}) => {
    const query = buildQueryString(params);
    return apiRequest(`/drivers${query}`);
  },
  
  getDriver: (id) => apiRequest(`/drivers/${id}`),
  
  createDriver: (data) => apiRequest('/drivers', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  updateDriver: (id, data) => apiRequest(`/drivers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  
  deleteDriver: (id) => apiRequest(`/drivers/${id}`, {
    method: 'DELETE',
  }),
  
  // ==================== TRIPS ====================
  getTrips: (params = {}) => {
    const query = buildQueryString(params);
    return apiRequest(`/trips${query}`);
  },
  
  getTrip: (id) => apiRequest(`/trips/${id}`),
  
  createTrip: (data) => apiRequest('/trips', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  updateTrip: (id, data) => apiRequest(`/trips/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  synchronizeFollowingTrips: (id, expectedPreviousEndOdometer, expectedCorrectedEndOdometer) => apiRequest(`/trips/${id}/synchronize-following`, {
    method: 'POST',
    body: JSON.stringify({ expectedPreviousEndOdometer, expectedCorrectedEndOdometer }),
  }),
  
  deleteTrip: (id) => apiRequest(`/trips/${id}`, {
    method: 'DELETE',
  }),
  
  startTrip: (id, data) => apiRequest(`/trips/${id}/start`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  endTrip: (id, data) => apiRequest(`/trips/${id}/end`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  getActiveTrip: () => apiRequest('/trips/active'),
  
  // ==================== SERVICES ====================
  getServices: (params = {}) => {
    const query = buildQueryString(params);
    return apiRequest(`/services${query}`);
  },
  
  getService: (id) => apiRequest(`/services/${id}`),
  
  createService: (data) => apiRequest('/services', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  updateService: (id, data) => apiRequest(`/services/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  
  deleteService: (id) => apiRequest(`/services/${id}`, {
    method: 'DELETE',
  }),
  
  // ==================== REFUELINGS ====================
  getRefuels: (params = {}) => {
    const query = buildQueryString(params);
    return apiRequest(`/refuelings${query}`);
  },
  
  getRefuel: (id) => apiRequest(`/refuelings/${id}`),
  
  createRefuel: (data) => apiRequest('/refuelings', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  updateRefuel: (id, data) => apiRequest(`/refuelings/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  
  deleteRefuel: (id) => apiRequest(`/refuelings/${id}`, {
    method: 'DELETE',
  }),
  
  // ==================== KEY LOGS ====================
  getKeyLogs: (params = {}) => {
    const query = buildQueryString(params);
    return apiRequest(`/key-logs${query}`);
  },
  
  getKeyLog: (id) => apiRequest(`/key-logs/${id}`),
  
  createKeyLog: (data) => apiRequest('/key-logs', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  updateKeyLog: (id, data) => apiRequest(`/key-logs/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  
  deleteKeyLog: (id) => apiRequest(`/key-logs/${id}`, {
    method: 'DELETE',
  }),
  
  returnKey: (id, data) => apiRequest(`/key-logs/${id}/return`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  // ==================== SETTINGS ====================
  getSettings: () => apiRequest('/company-settings'),
  
  updateSettings: (data) => apiRequest('/company-settings', {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  
  getCompanySettings: () => apiRequest('/company-settings'),
  
  updateCompanySettings: (data) => apiRequest('/company-settings', {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  getAppearanceSettings: async () => {
    const result = await apiRequest('/user-settings/appearance');
    return result.appearance;
  },

  saveAppearanceSettings: async (appearance) => {
    const result = await apiRequest('/user-settings/appearance', {
      method: 'PUT',
      body: JSON.stringify({ appearance }),
    });
    return result.appearance;
  },
  
  // ==================== STATISTICS ====================
  getStatistics: (params = {}) => {
    const query = buildQueryString(params);
    return apiRequest(`/statistics${query}`);
  },
  
  getDashboardStats: () => apiRequest('/statistics/dashboard'),
  
  // ==================== EXPORT ====================
  exportData: (type, params = {}) => {
    const query = buildQueryString(params);
    return apiRequest(`/export/${type}${query}`, {
      headers: {
        'Accept': 'application/json',
      },
    });
  },
  
  // ==================== UTILS ====================
  // Sprawdzenie stanu serwera
  healthCheck: () => apiRequest('/health').catch(() => ({ status: 'error' })),
  
  // Pobranie wersji API
  getVersion: () => apiRequest('/version').catch(() => ({ version: 'unknown' })),
};

export default api;