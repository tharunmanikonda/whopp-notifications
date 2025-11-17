import React from 'react';
import { Provider } from '../store/providerStore';
import '../styles/provider-card.css';

interface ProviderCardProps {
  provider: Provider;
  isConnected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}

export default function ProviderCard({
  provider,
  isConnected,
  onSelect,
  disabled = false,
}: ProviderCardProps) {
  const getProviderIcon = (id: string) => {
    const icons: Record<string, string> = {
      whoop: '⌚',
      fitbit: '📱',
      garmin: '⌨️',
      apple: '🍎',
      samsung: '📲',
      oura: '💍',
    };
    return icons[id] || '📊';
  };

  return (
    <button
      className={`provider-card ${isConnected ? 'connected' : ''} ${disabled ? 'disabled' : ''}`}
      onClick={onSelect}
      disabled={disabled || isConnected}
      title={disabled ? 'Coming soon' : isConnected ? 'Already connected' : 'Click to connect'}
    >
      <div className="provider-icon">{getProviderIcon(provider.id)}</div>

      <h3 className="provider-name">{provider.name}</h3>

      <p className="provider-description">{provider.description}</p>

      <div className="provider-metrics">
        <p className="metrics-label">Tracks:</p>
        <div className="metrics-list">
          {provider.metrics.slice(0, 3).map((metric, index) => (
            <span key={index} className="metric-badge">
              {metric.replace(/_/g, ' ')}
            </span>
          ))}
          {provider.metrics.length > 3 && <span className="metric-badge">+{provider.metrics.length - 3}</span>}
        </div>
      </div>

      <div className="provider-footer">
        {isConnected ? (
          <span className="status-badge connected-badge">✓ Connected</span>
        ) : disabled ? (
          <span className="status-badge coming-soon-badge">Coming Soon</span>
        ) : (
          <span className="status-badge available-badge">Available</span>
        )}
      </div>
    </button>
  );
}
