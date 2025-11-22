import React, { useState } from 'react';
import '../styles/connect-provider.css';

interface ConnectProviderButtonProps {
  provider: 'whoop' | 'fitbit' | 'oura' | 'garmin' | 'apple' | 'samsung';
  name: string;
  icon: string;
  onSuccess?: (tokens: any) => void;
  onError?: (error: string) => void;
}

export function ConnectProviderButton({
  provider,
  name,
  icon,
  onSuccess,
  onError,
}: ConnectProviderButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Call the OAuth login endpoint
      const response = await fetch(`/api/oauth/${provider}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Optionally pass user_id if already logged in
          user_id: localStorage.getItem('userId'),
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to initiate ${name} login`);
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
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setIsLoading(true);
      // TODO: Implement disconnect endpoint
      console.log(`Disconnecting ${provider}...`);
      setIsConnected(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="connect-provider-button">
      <button
        onClick={isConnected ? handleDisconnect : handleConnect}
        disabled={isLoading}
        className={`provider-btn ${isConnected ? 'connected' : 'disconnected'} ${isLoading ? 'loading' : ''}`}
      >
        <span className="provider-icon">{icon}</span>
        <span className="provider-name">{name}</span>

        {isLoading && <span className="spinner"></span>}
        {isConnected && <span className="connected-badge">✓</span>}
        {!isConnected && !isLoading && <span className="connect-arrow">→</span>}
      </button>

      {error && <div className="error-message">{error}</div>}
    </div>
  );
}

export default ConnectProviderButton;
