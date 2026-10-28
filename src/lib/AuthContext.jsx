import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '@/api/apiClient';
import { logAction } from '@/lib/errorHandler';
import { queryClientInstance } from '@/lib/query-client';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const verifyToken = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const userData = await api.getMe();
        if (!active) return;
        setUser(userData);
        setIsAuthenticated(true);
        logAction('verify_token', { success: true });
      } catch (error) {
        if (!active) return;
        console.error('Token weryfikacja nieudana:', error);
        localStorage.removeItem('token');
        setToken(null);
        setIsAuthenticated(false);
        setUser(null);
        logAction('verify_token', { success: false, error: error.message });
      } finally {
        if (active) setLoading(false);
      }
    };

    verifyToken();
    return () => {
      active = false;
    };
  }, [token]);

  const login = async (email, password) => {
    try {
      await queryClientInstance.cancelQueries();
      queryClientInstance.clear();
      const result = await api.login(email, password);
      if (result.token) {
        localStorage.setItem('token', result.token);
        setToken(result.token);
        setUser(result.user);
        setIsAuthenticated(true);
        logAction('login', { email, success: true });
        return { success: true };
      }
      logAction('login', { email, success: false });
      return { success: false, error: 'Błąd logowania' };
    } catch (error) {
      console.error('Login error:', error);
      logAction('login', { email, error: error.message });
      return {
        success: false,
        error: error.message || 'Błąd logowania',
        errorCode: error.code,
      };
    }
  };

  const register = async (name, email, password) => {
    try {
      await queryClientInstance.cancelQueries();
      queryClientInstance.clear();
      const result = await api.register({ name, email, password });
      if (result.token) {
        localStorage.setItem('token', result.token);
        setToken(result.token);
        setUser(result.user);
        setIsAuthenticated(true);
        logAction('register', { email, success: true });
        return { success: true };
      }
      logAction('register', { email, success: false });
      return { success: false, error: 'Błąd rejestracji' };
    } catch (error) {
      console.error('Register error:', error);
      logAction('register', { email, error: error.message });
      return {
        success: false,
        error: error.message || 'Błąd rejestracji',
        errorCode: error.code,
      };
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (error) {
      if (localStorage.getItem('token')) throw error;
    }
    queryClientInstance.cancelQueries();
    queryClientInstance.clear();
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    logAction('logout', {});
  };

  const updateUser = (updatedData) => {
    setUser(prev => ({ ...prev, ...updatedData }));
  };
  
  const value = {
    user,
    token,
    isAuthenticated,
    loading,
    login,
    register,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};