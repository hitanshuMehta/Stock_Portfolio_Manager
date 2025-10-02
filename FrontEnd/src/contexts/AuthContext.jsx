import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { authService } from '../services/api.jsx';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const refreshTimerRef = useRef(null);

  // Auto-refresh token before it expires (15 minutes)
  const scheduleTokenRefresh = (refreshToken) => {
    // Clear any existing timer
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    // Refresh token 1 minute before expiry (14 minutes)
    const refreshTime = 14 * 60 * 1000;
    
    refreshTimerRef.current = setTimeout(async () => {
      try {
        const response = await authService.refreshToken(refreshToken);
        localStorage.setItem('token', response.token);
        // Schedule next refresh
        scheduleTokenRefresh(refreshToken);
      } catch (error) {
        console.error('Token refresh failed:', error);
        logout();
      }
    }, refreshTime);
  };

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('token');
      const refreshToken = localStorage.getItem('refreshToken');
      
      if (token) {
        try {
          const response = await authService.validateToken();
          if (response.valid) {
            setUser(response.user);
            // Schedule token refresh if we have refresh token
            if (refreshToken) {
              scheduleTokenRefresh(refreshToken);
            }
          } else {
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
          }
        } catch (error) {
          console.error('Token validation failed:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
        }
      }
      setLoading(false);
    };

    initializeAuth();

    // Cleanup timer on unmount
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, []);

  const login = async (username, password) => {
    try {
      const response = await authService.login(username, password);
      localStorage.setItem('token', response.token);
      localStorage.setItem('refreshToken', response.refreshToken);
      setUser(response.user);
      scheduleTokenRefresh(response.refreshToken);
    } catch (error) {
      throw error;
    }
  };

  const signup = async (username, email, password, fullName) => {
    try {
      const response = await authService.signup(username, email, password, fullName);
      localStorage.setItem('token', response.token);
      localStorage.setItem('refreshToken', response.refreshToken);
      setUser(response.user);
      scheduleTokenRefresh(response.refreshToken);
    } catch (error) {
      throw error;
    }
  };

  const googleLogin = async (credential) => {
    try {
      const response = await authService.googleLogin(credential);
      localStorage.setItem('token', response.token);
      localStorage.setItem('refreshToken', response.refreshToken);
      setUser(response.user);
      scheduleTokenRefresh(response.refreshToken);
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
      setUser(null);
    }
  };

  const value = {
    user,
    loading,
    login,
    signup,
    googleLogin,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};