import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useProviderStore } from '../store/providerStore';
import ProviderCard from '../components/ProviderCard';

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, token, logout } = useAuthStore();
  const { availableProviders, connectedProviders, fetchAvailableProviders, fetchConnectedProviders } = useProviderStore();

  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [step, setStep] = useState<'select' | 'auth' | 'complete'>('select');

  useEffect(() => {
    // Redirect if not logged in
    if (!user || !token) {
      navigate('/login');
      return;
    }

    // Fetch available providers
    fetchAvailableProviders();
    fetchConnectedProviders(token);
  }, [user, token, navigate]);

  const handleProviderSelect = (providerId: string) => {
    setSelectedProvider(providerId);
    setStep('auth');
  };

  const handleAuthComplete = async () => {
    if (token) {
      await fetchConnectedProviders(token);
      setStep('complete');
    }
  };

  const handleContinueToDashboard = () => {
    navigate('/dashboard');
  };

  const handleSkip = () => {
    navigate('/dashboard');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isProviderConnected = (providerId: string) => {
    return connectedProviders.some((p) => p.provider_name === providerId);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700 px-6 py-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-white">Let's Get Started</h1>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 text-white text-sm font-semibold rounded-lg hover:bg-red-600 transition-colors"
            >
              Logout
            </button>
          </div>
          {user && (
            <p className="text-slate-400 mt-2">Welcome, {user.full_name}! Let's connect your health tracker.</p>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-10">
        {step === 'select' && (
          <div className="animate-fadeIn">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-bold text-white mb-3">Select Your Wearable Device</h2>
              <p className="text-slate-400">Choose the health tracker you want to connect first. You can add more devices later.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
              {availableProviders.map((provider) => (
                <ProviderCard
                  key={provider.id}
                  provider={provider}
                  isConnected={isProviderConnected(provider.id)}
                  onSelect={() => handleProviderSelect(provider.id)}
                  disabled={provider.status === 'coming_soon'}
                />
              ))}
            </div>

            <div className="flex justify-center">
              <button
                onClick={handleSkip}
                className="px-6 py-3 bg-transparent text-blue-400 border-2 border-blue-500 font-semibold rounded-lg hover:bg-blue-500/10 transition-all"
              >
                Skip for Now
              </button>
            </div>
          </div>
        )}

        {step === 'auth' && selectedProvider && (
          <ProviderAuthFlow
            providerId={selectedProvider}
            onComplete={handleAuthComplete}
            onCancel={() => setStep('select')}
          />
        )}

        {step === 'complete' && (
          <div className="animate-fadeIn text-center">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 mx-auto mb-6 bg-emerald-500/20 border-2 border-emerald-500 rounded-full flex items-center justify-center">
                <span className="text-4xl text-emerald-400">✓</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Setup Complete!</h2>
              <p className="text-slate-400 mb-8">Your health tracker has been connected successfully.</p>

              {connectedProviders.length > 0 && (
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-8">
                  <h3 className="text-lg font-semibold text-white mb-4">Connected Devices:</h3>
                  <ul className="space-y-3">
                    {connectedProviders.map((provider) => (
                      <li key={provider.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                        <span className="text-slate-200 font-medium">
                          {provider.provider_name.charAt(0).toUpperCase() + provider.provider_name.slice(1)}
                        </span>
                        {provider.is_primary && (
                          <span className="px-2 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-semibold rounded">
                            Primary
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={handleSkip}
                  className="px-6 py-3 bg-violet-500 text-white font-semibold rounded-lg hover:bg-violet-600 transition-colors"
                >
                  Add Another Device
                </button>
                <button
                  onClick={handleContinueToDashboard}
                  className="px-6 py-3 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Go to Dashboard
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

interface ProviderAuthFlowProps {
  providerId: string;
  onComplete: () => void;
  onCancel: () => void;
}

function ProviderAuthFlow({ providerId, onComplete, onCancel }: ProviderAuthFlowProps) {
  const { token } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const providerInfo: Record<string, { title: string; icon: string; description: string }> = {
    whoop: {
      title: 'Connect Whoop Band',
      icon: '🏃',
      description: 'Get insights from your Whoop band data',
    },
    fitbit: {
      title: 'Connect Fitbit Device',
      icon: '⌚',
      description: 'Sync data from your Fitbit tracker',
    },
    garmin: {
      title: 'Connect Garmin Device',
      icon: '🗺️',
      description: 'Coming soon. Garmin integration is in development.',
    },
    apple: {
      title: 'Connect Apple Health',
      icon: '🍎',
      description: 'Coming soon. Apple Health integration is in development.',
    },
    samsung: {
      title: 'Connect Samsung Health',
      icon: '📱',
      description: 'Coming soon. Samsung Health integration is in development.',
    },
    oura: {
      title: 'Connect Oura Ring',
      icon: '💍',
      description: 'Coming soon. Oura Ring integration is in development.',
    },
  };

  const provider = providerInfo[providerId];

  const handleOAuthConnect = async () => {
    try {
      setLoading(true);
      setError('');

      // Call the OAuth login endpoint
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
      const response = await fetch(`${API_URL}/oauth/${providerId}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: token ? undefined : undefined, // Will be obtained from auth context on backend
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to initiate ${providerId} login`);
      }

      const data = await response.json();

      if (data.success && data.auth_url) {
        // Redirect to provider's OAuth page
        window.location.href = data.auth_url;
      } else {
        throw new Error(data.message || 'Failed to get auth URL');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fadeIn">
      <button
        onClick={onCancel}
        className="text-slate-400 hover:text-white mb-6 flex items-center gap-2 transition-colors"
      >
        ← Back
      </button>

      <div className="max-w-md mx-auto text-center">
        <div className="w-24 h-24 mx-auto mb-6 bg-blue-500/20 border-2 border-blue-500 rounded-2xl flex items-center justify-center">
          <span className="text-5xl">{provider?.icon}</span>
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">{provider?.title || 'Connect Provider'}</h2>
        <p className="text-slate-400 mb-6">{provider?.description}</p>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-8">
          <p className="text-slate-300">
            You'll be securely redirected to {providerId === 'whoop' ? 'Whoop' : providerId} to authorize access to your health data.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-6 py-3 bg-transparent text-slate-300 border-2 border-slate-600 font-semibold rounded-lg hover:bg-slate-700/50 transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleOAuthConnect}
            disabled={loading}
            className="px-6 py-3 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Redirecting...
              </>
            ) : (
              `Connect to ${providerId.charAt(0).toUpperCase() + providerId.slice(1)}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
