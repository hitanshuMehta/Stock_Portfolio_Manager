import axios from 'axios';

// const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const API_BASE_URL = 'https://stock-portfolio-manager-dpkw.onrender.com/api';
// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors and token expiry
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If token expired and we have a refresh token
    if (error.response?.status === 401 && 
        error.response?.data?.code === 'TOKEN_EXPIRED' && 
        !originalRequest._retry) {
      
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');

      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
            refreshToken
          });
          
          localStorage.setItem('token', response.data.token);
          originalRequest.headers.Authorization = `Bearer ${response.data.token}`;
          
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed, logout user
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }
    }

    // Token is invalid or other 401 errors
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

// Auth services
export const authService = {
  signup: async (username, email, password, fullName) => {
    const response = await api.post('/auth/signup', { 
      username, 
      email, 
      password, 
      fullName 
    });
    return response.data;
  },

  login: async (username, password) => {
    const response = await api.post('/auth/login', { username, password });
    return response.data;
  },

  googleLogin: async (credential) => {
    const response = await api.post('/auth/google', { credential });
    return response.data;
  },

  refreshToken: async (refreshToken) => {
    const response = await api.post('/auth/refresh-token', { refreshToken });
    return response.data;
  },

  validateToken: async () => {
    const response = await api.get('/auth/validate');
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  updateProfile: async (data) => {
    const response = await api.put('/auth/profile', data);
    return response.data;
  },

  changePassword: async (currentPassword, newPassword) => {
    const response = await api.put('/auth/change-password', {
      currentPassword,
      newPassword
    });
    return response.data;
  } 
};

// Portfolio services
export const portfolioService = {
  getAll: async () => {
    const response = await api.get('/portfolio');
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/portfolio/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/portfolio', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/portfolio/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/portfolio/${id}`);
    return response.data;
  },

  addStock: async (portfolioId, stockData) => {
    const response = await api.post(`/portfolio/${portfolioId}/stocks`, stockData);
    return response.data;
  },

  updateStock: async (portfolioId, stockId, stockData) => {
    const response = await api.put(`/portfolio/${portfolioId}/stocks/${stockId}`, stockData);
    return response.data;
  },

  deleteStock: async (portfolioId, stockId) => {
    const response = await api.delete(`/portfolio/${portfolioId}/stocks/${stockId}`);
    return response.data;
  },

  fetchPrices: async (portfolioId) => {
    const response = await api.post(`/portfolio/${portfolioId}/fetch-prices`);
    return response.data;
  },

  fetchPricesProgress: async (portfolioId) => {
    const response = await api.get(`/portfolio/${portfolioId}/fetch-prices/progress`);
    return response.data;
  }
};

export default api;