import { create } from 'zustand';
import axios from 'axios';

interface User {
  id: string;
  email: string;
  full_name: string;
  timezone: string;
  notification_time: string;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;

  // Auth methods
  signup: (email: string, password: string, fullName: string, timezone?: string, notificationTime?: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  getProfile: () => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  validateToken: () => Promise<boolean>;

  // Storage methods
  loadFromStorage: () => void;
  saveToStorage: () => void;
  clearStorage: () => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'https://whopp-notifications-63tja648u-tharunmanikondas-projects.vercel.app/api';

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  token: null,
  loading: false,
  error: null,

  signup: async (email: string, password: string, fullName: string, timezone = 'America/New_York', notificationTime = '08:00') => {
    set({ loading: true, error: null });
    try {
      const response = await axios.post(`${API_URL}/auth/signup`, {
        email,
        password,
        fullName,
        timezone,
        notificationTime,
      });

      if (response.data.success) {
        set({
          token: response.data.token,
          user: {
            id: response.data.userId,
            email,
            full_name: fullName,
            timezone,
            notification_time: notificationTime,
          },
          loading: false,
        });
        get().saveToStorage();
      } else {
        set({ error: response.data.message, loading: false });
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Signup failed';
      set({ error: message, loading: false });
      throw error;
    }
  },

  login: async (email: string, password: string) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password,
      });

      if (response.data.success) {
        set({
          token: response.data.token,
          loading: false,
        });
        // Fetch profile after login
        await get().getProfile();
        get().saveToStorage();
      } else {
        set({ error: response.data.message, loading: false });
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Login failed';
      set({ error: message, loading: false });
      throw error;
    }
  },

  logout: () => {
    set({ user: null, token: null, error: null });
    get().clearStorage();
  },

  getProfile: async () => {
    const { token } = get();
    if (!token) return;

    set({ loading: true, error: null });
    try {
      const response = await axios.get(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        set({
          user: response.data.user,
          loading: false,
        });
      } else {
        set({ error: response.data.message, loading: false });
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to fetch profile';
      set({ error: message, loading: false });
    }
  },

  changePassword: async (oldPassword: string, newPassword: string) => {
    const { token } = get();
    if (!token) {
      set({ error: 'No token available' });
      throw new Error('No token available');
    }

    set({ loading: true, error: null });
    try {
      const response = await axios.post(
        `${API_URL}/auth/change-password`,
        { oldPassword, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        set({ loading: false });
      } else {
        set({ error: response.data.message, loading: false });
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Password change failed';
      set({ error: message, loading: false });
      throw error;
    }
  },

  validateToken: async () => {
    const { token } = get();
    if (!token) return false;

    try {
      const response = await axios.post(
        `${API_URL}/auth/validate-token`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      return response.data.valid === true;
    } catch (error) {
      return false;
    }
  },

  loadFromStorage: () => {
    const stored = localStorage.getItem('auth');
    if (stored) {
      try {
        const { user, token } = JSON.parse(stored);
        set({ user, token });
      } catch (error) {
        console.error('Failed to load auth from storage:', error);
      }
    }
  },

  saveToStorage: () => {
    const { user, token } = get();
    localStorage.setItem('auth', JSON.stringify({ user, token }));
  },

  clearStorage: () => {
    localStorage.removeItem('auth');
  },
}));
