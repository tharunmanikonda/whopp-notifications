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
    <div style={styles.container}>
      <Navbar />

      <main style={styles.main}>
        <h1 style={styles.title}>Connected Devices</h1>
        <p style={styles.subtitle}>Manage your health data sources</p>

        {/* Connected Providers */}
        {connectedProviders.length > 0 && (
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Your Devices</h2>
            <div style={styles.grid}>
              {connectedProviders.map((provider) => (
                <div key={provider.id} style={styles.card}>
                  <div style={styles.cardHeader}>
                    <span style={styles.icon}>{getProviderIcon(provider.provider_name)}</span>
                    <span style={styles.connectedBadge}>Connected</span>
                  </div>
                  <h3 style={styles.cardTitle}>
                    {provider.provider_name.charAt(0).toUpperCase() + provider.provider_name.slice(1)}
                  </h3>
                  <p style={styles.cardMeta}>
                    Connected: {new Date(provider.connected_since).toLocaleDateString()}
                  </p>
                  {provider.is_primary && (
                    <span style={styles.primaryBadge}>Primary Source</span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Available Providers */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>
            {connectedProviders.length > 0 ? 'Add More Devices' : 'Connect a Device'}
          </h2>
          <div style={styles.grid}>
            {availableProviders
              .filter(p => !isConnected(p.id))
              .map((provider) => (
                <div key={provider.id} style={styles.card}>
                  <div style={styles.cardHeader}>
                    <span style={styles.icon}>{provider.icon}</span>
                    {provider.status === 'coming_soon' && (
                      <span style={styles.comingSoonBadge}>Coming Soon</span>
                    )}
                  </div>
                  <h3 style={styles.cardTitle}>{provider.name}</h3>
                  <p style={styles.cardDescription}>{provider.description}</p>
                  <div style={styles.metrics}>
                    {provider.metrics.map((metric, idx) => (
                      <span key={idx} style={styles.metricTag}>{metric}</span>
                    ))}
                  </div>
                  <button
                    style={{
                      ...styles.connectBtn,
                      ...(provider.status === 'coming_soon' ? styles.disabledBtn : {}),
                    }}
                    onClick={() => handleConnect(provider.id)}
                    disabled={provider.status === 'coming_soon' || connectingProvider === provider.id}
                  >
                    {connectingProvider === provider.id ? 'Connecting...' : 'Connect'}
                  </button>
                </div>
              ))}
          </div>
        </section>

        {/* Empty State */}
        {loading && (
          <div style={styles.loading}>
            <p>Loading devices...</p>
          </div>
        )}
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#0f172a',
  },
  main: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '32px 24px',
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: '8px',
  },
  subtitle: {
    color: '#94a3b8',
    marginBottom: '32px',
  },
  section: {
    marginBottom: '48px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: '16px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px',
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    padding: '24px',
    border: '1px solid #334155',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  icon: {
    fontSize: '32px',
  },
  connectedBadge: {
    backgroundColor: '#10b981',
    color: 'white',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
  },
  comingSoonBadge: {
    backgroundColor: '#6366f1',
    color: 'white',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
  },
  primaryBadge: {
    display: 'inline-block',
    backgroundColor: '#3b82f6',
    color: 'white',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
    marginTop: '12px',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#f8fafc',
    marginBottom: '8px',
  },
  cardDescription: {
    color: '#94a3b8',
    fontSize: '14px',
    marginBottom: '16px',
  },
  cardMeta: {
    color: '#64748b',
    fontSize: '13px',
  },
  metrics: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '16px',
  },
  metricTag: {
    backgroundColor: '#334155',
    color: '#94a3b8',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '12px',
  },
  connectBtn: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  disabledBtn: {
    backgroundColor: '#475569',
    cursor: 'not-allowed',
  },
  loading: {
    textAlign: 'center',
    color: '#94a3b8',
    padding: '48px',
  },
};
