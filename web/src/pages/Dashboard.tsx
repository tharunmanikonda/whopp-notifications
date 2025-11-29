import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useProviderStore } from '../store/providerStore';
import Navbar from '../components/Navbar';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

interface DashboardData {
  metrics: {
    today: {
      recovery_score: number | null;
      strain: number | null;
      calories: number | null;
      resting_heart_rate: number | null;
      average_heart_rate: number | null;
      max_heart_rate: number | null;
      hrv: number | null;
      date: string;
    };
  };
  history: Array<{
    date: string;
    recovery_score: number | null;
    strain: number | null;
    calories: number | null;
    resting_heart_rate: number | null;
    hrv: number | null;
  }>;
  summary: {
    average_recovery: number | null;
    average_strain: number | null;
    average_hrv: number | null;
    data_completeness: number;
    days_with_data: number;
  };
  providers: {
    connected_count: number;
    providers: Array<{ name: string; is_primary: boolean; last_synced: string | null }>;
  };
  analytics: {
    insights: Array<{ type: string; message: string; priority: string }>;
  };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, token } = useAuthStore();
  const { connectedProviders, fetchConnectedProviders } = useProviderStore();

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [syncMessage, setSyncMessage] = useState('');

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/dashboard?period=7`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setDashboardData(response.data.dashboard);
      } else {
        setError(response.data.message);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      setSyncMessage('');
      setError('');

      const response = await axios.post(
        `${API_URL}/dashboard/sync`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        setSyncMessage(`Synced ${response.data.synced_count} days of data`);
        await fetchDashboard();
        if (token) {
          await fetchConnectedProviders(token);
        }
      } else {
        setError(response.data.message);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to sync data');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (!user || !token) {
      navigate('/login');
      return;
    }

    fetchDashboard();
    fetchConnectedProviders(token);
  }, [user, token, navigate]);

  const getPriorityColor = (priority: string): string => {
    const colors: Record<string, string> = {
      info: 'border-blue-500',
      warning: 'border-amber-500',
      positive: 'border-emerald-500',
    };
    return colors[priority] || 'border-slate-500';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-6">
        <div className="w-12 h-12 border-4 border-slate-600 border-t-blue-500 rounded-full animate-spin"></div>
        <p className="text-slate-400">Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <Navbar />

      {/* Header */}
      <header className="bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700 px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
              {user && <p className="text-slate-400">Welcome back, {user.full_name}!</p>}
            </div>
            <button
              onClick={handleSync}
              disabled={syncing}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold transition-all duration-200 ${
                syncing
                  ? 'bg-slate-600 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600 hover:-translate-y-0.5'
              } text-white`}
            >
              {syncing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Syncing...
                </>
              ) : (
                <>
                  <span className="text-lg">↻</span>
                  Sync WHOOP Data
                </>
              )}
            </button>
          </div>

          {syncMessage && (
            <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500 rounded-lg text-emerald-300">
              {syncMessage}
            </div>
          )}
          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500 rounded-lg text-red-300">
              {error}
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-10">

        {/* Today's Metrics */}
        {dashboardData?.metrics.today && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6">Today's Metrics</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <MetricCard label="Recovery" value={dashboardData.metrics.today.recovery_score} unit="%" color="emerald" />
              <MetricCard label="Strain" value={dashboardData.metrics.today.strain} unit="" color="red" />
              <MetricCard label="Calories" value={dashboardData.metrics.today.calories} unit="kcal" color="amber" />
              <MetricCard label="Avg HR" value={dashboardData.metrics.today.average_heart_rate} unit="bpm" color="pink" />
              <MetricCard label="Max HR" value={dashboardData.metrics.today.max_heart_rate} unit="bpm" color="rose" />
              <MetricCard label="HRV" value={dashboardData.metrics.today.hrv} unit="ms" color="blue" />
            </div>
          </section>
        )}

        {/* 7-Day Summary */}
        {dashboardData?.summary && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6">7-Day Summary</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <SummaryCard label="Avg Recovery" value={dashboardData.summary.average_recovery} unit="%" />
              <SummaryCard label="Avg Strain" value={dashboardData.summary.average_strain} unit="" />
              <SummaryCard label="Avg HRV" value={dashboardData.summary.average_hrv} unit="ms" />
              <SummaryCard label="Days with Data" value={dashboardData.summary.days_with_data} unit="" />
            </div>
          </section>
        )}

        {/* Recent History */}
        {dashboardData?.history && dashboardData.history.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6">Recent History</h2>
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-blue-500/10">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300 uppercase">Strain</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300 uppercase">Calories</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300 uppercase">Avg HR</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.history.slice(0, 7).map((day, index) => (
                    <tr key={index} className="border-t border-slate-700 hover:bg-blue-500/5 transition-colors">
                      <td className="px-4 py-3 text-slate-100">{new Date(day.date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-slate-100">{day.strain ? day.strain.toFixed(1) : '-'}</td>
                      <td className="px-4 py-3 text-slate-100">{day.calories || '-'}</td>
                      <td className="px-4 py-3 text-slate-100">{day.resting_heart_rate || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Connected Providers */}
        {connectedProviders.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6">Connected Devices</h2>
            <div className="space-y-3">
              {connectedProviders.map((provider) => (
                <div
                  key={provider.id}
                  className="flex items-center justify-between p-4 bg-slate-800 border border-slate-700 rounded-lg hover:border-blue-500 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {provider.provider_name === 'whoop' && '⌚'}
                      {provider.provider_name === 'fitbit' && '📱'}
                      {provider.provider_name === 'garmin' && '⌨️'}
                    </span>
                    <span className="font-semibold text-white">
                      {provider.provider_name.charAt(0).toUpperCase() + provider.provider_name.slice(1)}
                    </span>
                  </div>
                  {provider.is_primary && (
                    <span className="px-2 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-semibold rounded">
                      Primary
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {connectedProviders.length === 0 && (
          <section className="mb-12">
            <div className="p-10 bg-slate-800 border-2 border-dashed border-slate-700 rounded-xl text-center">
              <p className="text-slate-400 text-lg mb-6">No connected devices yet</p>
              <button
                onClick={() => navigate('/onboarding')}
                className="px-6 py-3 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors"
              >
                Connect a Device
              </button>
            </div>
          </section>
        )}

        {/* Insights */}
        {dashboardData?.analytics.insights && dashboardData.analytics.insights.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6">Health Insights</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dashboardData.analytics.insights.map((insight, index) => (
                <div
                  key={index}
                  className={`p-4 bg-slate-800 border border-slate-700 border-l-4 ${getPriorityColor(insight.priority)} rounded-lg`}
                >
                  <p className="text-white font-medium mb-2">{insight.message}</p>
                  <span className="px-2 py-1 bg-blue-500/10 text-blue-300 text-xs font-semibold rounded uppercase">
                    {insight.type}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: number | null;
  unit: string;
  color: 'emerald' | 'red' | 'amber' | 'pink' | 'rose' | 'blue';
}

function MetricCard({ label, value, unit, color }: MetricCardProps) {
  const colorClasses: Record<string, string> = {
    emerald: 'border-t-emerald-500',
    red: 'border-t-red-500',
    amber: 'border-t-amber-500',
    pink: 'border-t-pink-500',
    rose: 'border-t-rose-500',
    blue: 'border-t-blue-500',
  };

  return (
    <div className={`bg-slate-800 border border-slate-700 border-t-4 ${colorClasses[color]} rounded-xl p-5 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/10 transition-all`}>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">{label}</p>
      <div className="flex items-baseline gap-1">
        {value !== null ? (
          <>
            <span className="text-3xl font-bold text-white">{Math.round(value * 10) / 10}</span>
            <span className="text-sm text-slate-400">{unit}</span>
          </>
        ) : (
          <span className="text-slate-500 italic">No data</span>
        )}
      </div>
    </div>
  );
}

interface SummaryCardProps {
  label: string;
  value: number | null;
  unit: string;
}

function SummaryCard({ label, value, unit }: SummaryCardProps) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 text-center hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/10 transition-all">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">{label}</p>
      <p className="text-2xl font-bold text-white">
        {value !== null ? `${Math.round(value * 10) / 10}${unit}` : 'No data'}
      </p>
    </div>
  );
}
