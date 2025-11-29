import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useProviderStore } from '../store/providerStore';

export default function OAuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { token } = useAuthStore();
  const { connectProvider } = useProviderStore();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Extract tokens from URL
        const whoopToken = searchParams.get('whoop_token');
        const whoopRefresh = searchParams.get('whoop_refresh');
        const provider = 'whoop';
        const errorParam = searchParams.get('error');
        const errorMessage = searchParams.get('message');

        // Check for errors from OAuth
        if (errorParam) {
          setError(errorMessage || `OAuth error: ${errorParam}`);
          setTimeout(() => {
            navigate('/onboarding?step=select');
          }, 3000);
          return;
        }

        // Validate we have tokens
        if (!whoopToken) {
          setError('No access token received from provider');
          setTimeout(() => {
            navigate('/onboarding?step=select');
          }, 3000);
          return;
        }

        // Check if user is authenticated
        if (!token) {
          setError('You must be logged in to connect a provider');
          setTimeout(() => {
            navigate('/login');
          }, 3000);
          return;
        }

        // Store tokens via the provider service
        await connectProvider(token, provider, whoopToken, whoopRefresh || undefined);

        // Redirect to onboarding complete page
        navigate('/onboarding?step=complete');
      } catch (err: any) {
        console.error('OAuth callback error:', err);
        setError(err.message || 'Failed to complete OAuth flow');
        setTimeout(() => {
          navigate('/onboarding?step=select');
        }, 3000);
      } finally {
        setLoading(false);
      }
    };

    handleCallback();
  }, [searchParams, token, navigate, connectProvider]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin mx-auto mb-6"></div>
          <h2 className="text-xl font-semibold text-white mb-2">Completing OAuth Flow...</h2>
          <p className="text-slate-400">Please wait while we authenticate you with WHOOP</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">❌</div>
          <h2 className="text-xl font-semibold text-white mb-2">Authentication Failed</h2>
          <p className="text-red-400 mb-4">{error}</p>
          <p className="text-slate-500 text-sm">Redirecting back...</p>
        </div>
      </div>
    );
  }

  return null;
}
