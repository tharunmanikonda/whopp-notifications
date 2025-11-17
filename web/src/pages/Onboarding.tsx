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
  const { connectProvider } = useProviderStore();
  const { token } = useAuthStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [refreshToken, setRefreshToken] = useState('');

  const providerAuthInstructions: Record<string, { title: string; steps: string[] }> = {
    whoop: {
      title: 'Connect Whoop Band',
      steps: [
        'Go to your Whoop account settings',
        'Navigate to "Apps & API" section',
        'Generate a new API token',
        'Copy the access token and paste it below',
      ],
    },
    fitbit: {
      title: 'Connect Fitbit Device',
      steps: [
        'Sign in to your Fitbit account',
        'Go to Settings > API tokens',
        'Generate a new token',
        'Copy the access token and paste it below',
      ],
    },
    garmin: {
      title: 'Connect Garmin Device',
      steps: ['Coming soon. Garmin integration is in development.'],
    },
    apple: {
      title: 'Connect Apple Health',
      steps: ['Coming soon. Apple Health integration is in development.'],
    },
    samsung: {
      title: 'Connect Samsung Health',
      steps: ['Coming soon. Samsung Health integration is in development.'],
    },
    oura: {
      title: 'Connect Oura Ring',
      steps: ['Coming soon. Oura Ring integration is in development.'],
    },
  };

  const instructions = providerAuthInstructions[providerId];

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!accessToken.trim()) {
      setError('Please enter an access token');
      return;
    }

    if (!token) {
      setError('Not authenticated');
      return;
    }

    setLoading(true);
    try {
      await connectProvider(token, providerId, accessToken, refreshToken || undefined);
      onComplete();
    } catch (err: any) {
      setError(err.message || 'Failed to connect provider');
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

        <h2>{instructions?.title || 'Connect Provider'}</h2>

        <div className="auth-instructions">
          <h3>How to get your access token:</h3>
          <ol>
            {instructions?.steps.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleConnect} className="provider-auth-form">
          <div className="form-group">
            <label htmlFor="accessToken">Access Token *</label>
            <input
              id="accessToken"
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="Paste your access token here"
              disabled={loading}
            />
            <small>Your token is stored securely and never shared</small>
          </div>

          <div className="form-group">
            <label htmlFor="refreshToken">Refresh Token (Optional)</label>
            <input
              id="refreshToken"
              type="password"
              value={refreshToken}
              onChange={(e) => setRefreshToken(e.target.value)}
              placeholder="Refresh token (if available)"
              disabled={loading}
            />
            <small>Some providers require this for automatic token renewal</small>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-outline" onClick={onCancel} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? (
                <>
                  <span className="loading"></span> Connecting...
                </>
              ) : (
                'Connect'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
