import React from 'react';
import { Provider } from '../store/providerStore';

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
      className={`w-full p-6 bg-slate-800 border rounded-xl text-left transition-all duration-200 ${
        isConnected
          ? 'border-emerald-500 bg-emerald-500/5 cursor-default'
          : disabled
          ? 'border-slate-700 opacity-60 cursor-not-allowed'
          : 'border-slate-700 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-1 cursor-pointer'
      }`}
      onClick={onSelect}
      disabled={disabled || isConnected}
      title={disabled ? 'Coming soon' : isConnected ? 'Already connected' : 'Click to connect'}
    >
      <div className="text-4xl mb-4">{getProviderIcon(provider.id)}</div>

      <h3 className="text-lg font-semibold text-white mb-2">{provider.name}</h3>

      <p className="text-sm text-slate-400 mb-4 line-clamp-2">{provider.description}</p>

      <div className="mb-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Tracks:</p>
        <div className="flex flex-wrap gap-1.5">
          {provider.metrics.slice(0, 3).map((metric, index) => (
            <span
              key={index}
              className="px-2 py-0.5 bg-blue-500/10 text-blue-300 text-xs rounded"
            >
              {metric.replace(/_/g, ' ')}
            </span>
          ))}
          {provider.metrics.length > 3 && (
            <span className="px-2 py-0.5 bg-slate-700 text-slate-400 text-xs rounded">
              +{provider.metrics.length - 3}
            </span>
          )}
        </div>
      </div>

      <div className="pt-3 border-t border-slate-700">
        {isConnected ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 text-emerald-300 text-sm font-semibold rounded-lg">
            ✓ Connected
          </span>
        ) : disabled ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 text-amber-300 text-sm font-semibold rounded-lg">
            Coming Soon
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 text-blue-300 text-sm font-semibold rounded-lg">
            Available
          </span>
        )}
      </div>
    </button>
  );
}
