import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useProviderStore } from '../store/providerStore';
import Navbar from '../components/Navbar';

export default function Devices() {
  const navigate = useNavigate();
  const { user, token } = useAuthStore();
  const {
    availableProviders,
    connectedProviders,
    loading,
    fetchAvailableProviders,
    fetchConnectedProviders
  } = useProviderStore();

  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !token) {
      navigate('/login');
      return;
    }

    fetchAvailableProviders();
    fetchConnectedProviders(token);
  }, [user, token, navigate]);

  const isConnected = (providerName: string) => {
    return connectedProviders.some(p => p.provider_name === providerName);
  };

  const handleConnect = async (providerId: string) => {
    setConnectingProvider(providerId);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/oauth/${providerId}/login`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user?.id }),
        }
      );
      const data = await response.json();
      if (data.success && data.auth_url) {
        window.location.href = data.auth_url;
      }
    } catch (error) {
      console.error('Failed to initiate OAuth:', error);
    } finally {
      setConnectingProvider(null);
    }
  };

  const getProviderIcon = (name: string) => {
    const icons: Record<string, string> = {
      whoop: '⌚',
      fitbit: '💪',
      garmin: '🏃',
      apple: '🍎',
      samsung: '📱',
      oura: '💍',
    };
    return icons[name] || '📊';
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <Navbar />

      <main className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold text-slate-50 mb-2">Connected Devices</h1>
        <p className="text-slate-400 mb-8">Manage your health data sources</p>

        {/* Connected Providers */}
        {connectedProviders.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-slate-200 mb-4">Your Devices</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {connectedProviders.map((provider) => (
                <div
                  key={provider.id}
                  className="bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-emerald-500 transition-colors"
                >
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-3xl">{getProviderIcon(provider.provider_name)}</span>
                    <span className="px-3 py-1 bg-emerald-500 text-white text-xs font-medium rounded-full">
                      Connected
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-50 mb-2">
                    {provider.provider_name.charAt(0).toUpperCase() + provider.provider_name.slice(1)}
                  </h3>
                  <p className="text-slate-500 text-sm">
                    Connected: {new Date(provider.connected_since).toLocaleDateString()}
                  </p>
                  {provider.is_primary && (
                    <span className="inline-block mt-3 px-3 py-1 bg-blue-500 text-white text-xs font-medium rounded-full">
                      Primary Source
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Available Providers */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-slate-200 mb-4">
            {connectedProviders.length > 0 ? 'Add More Devices' : 'Connect a Device'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {availableProviders
              .filter(p => !isConnected(p.id))
              .map((provider) => (
                <div
                  key={provider.id}
                  className="bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-blue-500 transition-colors"
                >
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-3xl">{provider.icon}</span>
                    {provider.status === 'coming_soon' && (
                      <span className="px-3 py-1 bg-indigo-500 text-white text-xs font-medium rounded-full">
                        Coming Soon
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-slate-50 mb-2">{provider.name}</h3>
                  <p className="text-slate-400 text-sm mb-4">{provider.description}</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {provider.metrics.map((metric, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 bg-slate-700 text-slate-400 text-xs rounded"
                      >
                        {metric}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={() => handleConnect(provider.id)}
                    disabled={provider.status === 'coming_soon' || connectingProvider === provider.id}
                    className={`w-full py-3 rounded-lg text-sm font-medium transition-colors ${
                      provider.status === 'coming_soon'
                        ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}
                  >
                    {connectingProvider === provider.id ? 'Connecting...' : 'Connect'}
                  </button>
                </div>
              ))}
          </div>
        </section>

        {/* Loading State */}
        {loading && (
          <div className="text-center text-slate-400 py-12">
            <p>Loading devices...</p>
          </div>
        )}
      </main>
    </div>
  );
}
