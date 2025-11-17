import { create } from 'zustand';
import axios from 'axios';

export interface Provider {
  id: string;
  name: string;
  icon: string;
  description: string;
  metrics: string[];
  status: 'available' | 'coming_soon';
}

export interface ConnectedProvider {
  id: string;
  provider_name: string;
  is_primary: boolean;
  connected_since: string;
}

interface ProviderStore {
  availableProviders: Provider[];
  connectedProviders: ConnectedProvider[];
  loading: boolean;
  error: string | null;

  // Provider methods
  fetchAvailableProviders: () => Promise<void>;
  fetchConnectedProviders: (token: string) => Promise<void>;
  connectProvider: (token: string, providerName: string, accessToken: string, refreshToken?: string) => Promise<void>;
  disconnectProvider: (token: string, providerId: string) => Promise<void>;
  setPrimaryProvider: (token: string, providerName: string) => Promise<void>;
  isProviderConnected: (providerName: string) => boolean;
  getPrimaryProvider: () => ConnectedProvider | null;
}

const API_URL = import.meta.env.VITE_API_URL || 'https://whopp-notifications-63tja648u-tharunmanikondas-projects.vercel.app/api';

export const useProviderStore = create<ProviderStore>((set, get) => ({
  availableProviders: [],
  connectedProviders: [],
  loading: false,
  error: null,

  fetchAvailableProviders: async () => {
    set({ loading: true, error: null });
    try {
      const response = await axios.get(`${API_URL}/providers/available`);

      if (response.data.success) {
        set({
          availableProviders: response.data.available_providers,
          loading: false,
        });
      } else {
        set({ error: response.data.message, loading: false });
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to fetch providers';
      set({ error: message, loading: false });
    }
  },

  fetchConnectedProviders: async (token: string) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.get(`${API_URL}/providers/list`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        set({
          connectedProviders: response.data.providers.connected,
          loading: false,
        });
      } else {
        set({ error: response.data.message, loading: false });
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to fetch connected providers';
      set({ error: message, loading: false });
    }
  },

  connectProvider: async (token: string, providerName: string, accessToken: string, refreshToken?: string) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.post(
        `${API_URL}/providers/connect`,
        {
          provider_name: providerName,
          access_token: accessToken,
          refresh_token: refreshToken,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        // Refresh connected providers list
        await get().fetchConnectedProviders(token);
        set({ loading: false });
      } else {
        set({ error: response.data.message, loading: false });
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to connect provider';
      set({ error: message, loading: false });
      throw error;
    }
  },

  disconnectProvider: async (token: string, providerId: string) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.delete(`${API_URL}/providers/disconnect`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { provider_id: providerId },
      });

      if (response.data.success) {
        await get().fetchConnectedProviders(token);
        set({ loading: false });
      } else {
        set({ error: response.data.message, loading: false });
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to disconnect provider';
      set({ error: message, loading: false });
      throw error;
    }
  },

  setPrimaryProvider: async (token: string, providerName: string) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.post(
        `${API_URL}/providers/set-primary`,
        { provider_name: providerName },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        await get().fetchConnectedProviders(token);
        set({ loading: false });
      } else {
        set({ error: response.data.message, loading: false });
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to set primary provider';
      set({ error: message, loading: false });
      throw error;
    }
  },

  isProviderConnected: (providerName: string) => {
    const { connectedProviders } = get();
    return connectedProviders.some((p) => p.provider_name === providerName);
  },

  getPrimaryProvider: () => {
    const { connectedProviders } = get();
    return connectedProviders.find((p) => p.is_primary) || null;
  },
}));
