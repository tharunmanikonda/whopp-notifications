import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useProviderStore } from '../store/providerStore';
import ProviderCard from '../components/ProviderCard';
import '../styles/onboarding.css';

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
    <div className="onboarding-container">
      <header className="onboarding-header">
        <div className="header-content">
          <h1>Let's Get Started</h1>
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
        {user && (
          <p className="welcome-text">Welcome, {user.full_name}! Let's connect your health tracker.</p>
        )}
      </header>

      <main className="onboarding-main">
        {step === 'select' && (
          <div className="onboarding-step select-step">
            <div className="step-content">
              <h2>Select Your Wearable Device</h2>
              <p>Choose the health tracker you want to connect first. You can add more devices later.</p>

              <div className="providers-grid">
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

              <div className="onboarding-actions">
                <button className="btn btn-outline" onClick={handleSkip}>
                  Skip for Now
                </button>
              </div>
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
          <div className="onboarding-step complete-step">
            <div className="step-content">
              <div className="complete-icon">✓</div>
              <h2>Setup Complete!</h2>
              <p>Your health tracker has been connected successfully.</p>

              {connectedProviders.length > 0 && (
                <div className="connected-providers">
                  <h3>Connected Devices:</h3>
                  <ul className="providers-list">
                    {connectedProviders.map((provider) => (
                      <li key={provider.id}>
                        <span>{provider.provider_name.charAt(0).toUpperCase() + provider.provider_name.slice(1)}</span>
                        {provider.is_primary && <span className="badge">Primary</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="onboarding-actions">
                <button className="btn btn-secondary" onClick={handleSkip}>
                  Add Another Device
                </button>
                <button className="btn btn-primary" onClick={handleContinueToDashboard}>
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
    <div className="onboarding-step auth-step">
      <div className="step-content">
        <button className="back-btn" onClick={onCancel}>
          ← Back
        </button>

        <div className="oauth-connect-container">
          <div className="oauth-icon">{provider?.icon}</div>
          <h2>{provider?.title || 'Connect Provider'}</h2>
          <p className="oauth-description">{provider?.description}</p>

          {error && <div className="alert alert-error">{error}</div>}

          <div className="oauth-info">
            <p>You'll be securely redirected to {providerId === 'whoop' ? 'Whoop' : providerId} to authorize access to your health data.</p>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-outline" onClick={onCancel} disabled={loading}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleOAuthConnect}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="loading"></span> Redirecting...
                </>
              ) : (
                `Connect to ${providerId.charAt(0).toUpperCase() + providerId.slice(1)}`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
