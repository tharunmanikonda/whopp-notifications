import React, { useState } from 'react';

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
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
      const response = await fetch(`${API_URL}/oauth/${provider}/login`, {
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
    <div className="w-full">
      <button
        onClick={isConnected ? handleDisconnect : handleConnect}
        disabled={isLoading}
        className={`w-full flex items-center justify-between px-5 py-4 rounded-xl border transition-all duration-200 ${
          isConnected
            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300'
            : 'bg-slate-800 border-slate-700 text-slate-200 hover:border-blue-500 hover:bg-slate-700/50'
        } ${isLoading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <span className="font-medium">{name}</span>
        </div>

        <div className="flex items-center gap-2">
          {isLoading && (
            <div className="w-5 h-5 border-2 border-slate-500 border-t-blue-500 rounded-full animate-spin"></div>
          )}
          {isConnected && (
            <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-semibold rounded">
              ✓ Connected
            </span>
          )}
          {!isConnected && !isLoading && (
            <span className="text-blue-400 text-lg">→</span>
          )}
        </div>
      </button>

      {error && (
        <div className="mt-2 p-3 bg-red-500/10 border border-red-500 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}

export default ConnectProviderButton;
