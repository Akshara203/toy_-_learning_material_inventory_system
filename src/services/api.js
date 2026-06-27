import axios from 'axios';

// Setup base url points
const API_URL = import.meta.env.VITE_API_URL
  ? (import.meta.env.VITE_API_URL.endsWith('/api') ? import.meta.env.VITE_API_URL : `${import.meta.env.VITE_API_URL}/api`)
  : '/api';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auto grab token from localstorage and inject headers
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('preschool_auth_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const api = {
  // Authentication services
  auth: {
    login: async (username, password) => {
      const res = await apiClient.post('/auth/login', { username, password });
      return res.data;
    },
    getCurrentUser: async () => {
      const res = await apiClient.get('/auth/me');
      return res.data.user;
    },
    listUsers: async () => {
      const res = await apiClient.get('/auth/users');
      return res.data;
    },
    updateProfile: async (payload) => {
      const res = await apiClient.put('/auth/profile', payload);
      return res.data;
    },
    updatePassword: async (payload) => {
      const res = await apiClient.put('/auth/password', payload);
      return res.data;
    },
    registerStaff: async (payload) => {
      const pass = payload.password || 'staff123'; // Default fallback
      const res = await apiClient.post('/auth/register', { ...payload, password: pass });
      return res.data;
    }
  },

  // Inventory services
  inventory: {
    list: async (filters) => {
      const params = {};
      if (filters?.q) params.q = filters.q;
      if (filters?.categoryId) params.categoryId = filters.categoryId;
      const res = await apiClient.get('/inventory', { params });
      return res.data;
    },
    get: async (id) => {
      const res = await apiClient.get(`/inventory/${id}`);
      return res.data;
    },
    create: async (item) => {
      const res = await apiClient.post('/inventory', item);
      return res.data;
    },
    update: async (id, item) => {
      const res = await apiClient.put(`/inventory/${id}`, item);
      return res.data;
    },
    delete: async (id) => {
      const res = await apiClient.delete(`/inventory/${id}`);
      return res.data;
    }
  },

  // Categories services
  categories: {
    list: async () => {
      const res = await apiClient.get('/categories');
      return res.data;
    },
    create: async (category) => {
      const res = await apiClient.post('/categories', category);
      return res.data;
    }
  },

  // Stock tracking operations
  stock: {
    history: async () => {
      const res = await apiClient.get('/stock/history');
      return res.data;
    },
    checkIn: async (payload) => {
      const res = await apiClient.post('/stock/in', payload);
      return res.data;
    },
    checkOut: async (payload) => {
      const res = await apiClient.post('/stock/out', payload);
      return res.data;
    }
  },

  // Damage reporting services
  damage: {
    list: async () => {
      const res = await apiClient.get('/damage');
      return res.data;
    },
    report: async (payload) => {
      const res = await apiClient.post('/damage', payload);
      return res.data;
    },
    updateStatus: async (id, status) => {
      const res = await apiClient.put(`/damage/${id}`, { status });
      return res.data;
    }
  },

  // Dashboard calculations
  dashboard: {
    getSummary: async () => {
      const res = await apiClient.get('/dashboard');
      return res.data;
    }
  },

  // Reports compilation feeds
  reports: {
    inventoryFeed: async () => {
      const res = await apiClient.get('/reports/inventory');
      return res.data;
    },
    damageFeed: async () => {
      const res = await apiClient.get('/reports/damage');
      return res.data;
    }
  }
};
