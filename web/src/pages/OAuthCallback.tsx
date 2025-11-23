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
      <div style={styles.container}>
        <div style={styles.content}>
          <div style={styles.spinner}></div>
          <h2>Completing OAuth Flow...</h2>
          <p>Please wait while we authenticate you with WHOOP</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.content}>
          <div style={styles.errorIcon}>❌</div>
          <h2>Authentication Failed</h2>
          <p style={styles.error}>{error}</p>
          <p style={styles.redirect}>Redirecting back...</p>
        </div>
      </div>
    );
  }

  return null;
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
  },
  content: {
    textAlign: 'center' as const,
    color: '#e2e8f0',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #1e293b',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 24px',
  },
  errorIcon: {
    fontSize: '3rem',
    marginBottom: '16px',
  },
  error: {
    color: '#ef4444',
    marginBottom: '16px',
  },
  redirect: {
    color: '#64748b',
    fontSize: '0.9rem',
  },
};
