import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useProviderStore } from '../store/providerStore';
import Navbar from '../components/Navbar';
import axios from 'axios';
import '../styles/dashboard.css';

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
        // Refresh dashboard data
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
      info: '#3b82f6',
      warning: '#f59e0b',
      positive: '#10b981',
    };
    return colors[priority] || '#6b7280';
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Navbar />
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Dashboard</h1>
          <button
            className={`btn btn-sync ${syncing ? 'syncing' : ''}`}
            onClick={handleSync}
            disabled={syncing}
          >
            {syncing ? (
              <>
                <span className="sync-spinner"></span>
                Syncing...
              </>
            ) : (
              <>
                <span className="sync-icon">↻</span>
                Sync WHOOP Data
              </>
            )}
          </button>
        </div>
        {user && <p className="welcome-text">Welcome back, {user.full_name}!</p>}
        {syncMessage && <div className="alert alert-success">{syncMessage}</div>}
        {error && <div className="alert alert-error">{error}</div>}
      </header>

      <main className="dashboard-main">
        {/* Today's Metrics */}
        {dashboardData?.metrics.today && (
          <section className="dashboard-section">
            <h2>Today's Metrics</h2>
            <div className="metrics-grid">
              <MetricCard
                label="Recovery Score"
                value={dashboardData.metrics.today.recovery_score}
                unit="%"
                color="#10b981"
              />
              <MetricCard
                label="Strain"
                value={dashboardData.metrics.today.strain}
                unit=""
                color="#ef4444"
              />
              <MetricCard
                label="Calories"
                value={dashboardData.metrics.today.calories}
                unit="kcal"
                color="#f59e0b"
              />
              <MetricCard
                label="Avg Heart Rate"
                value={dashboardData.metrics.today.average_heart_rate}
                unit="bpm"
                color="#ec4899"
              />
              <MetricCard
                label="Max Heart Rate"
                value={dashboardData.metrics.today.max_heart_rate}
                unit="bpm"
                color="#dc2626"
              />
              <MetricCard
                label="HRV"
                value={dashboardData.metrics.today.hrv}
                unit="ms"
                color="#3b82f6"
              />
            </div>
          </section>
        )}

        {/* 7-Day Summary */}
        {dashboardData?.summary && (
          <section className="dashboard-section">
            <h2>7-Day Summary</h2>
            <div className="summary-grid">
              <SummaryCard
                label="Avg Recovery"
                value={dashboardData.summary.average_recovery}
                unit="%"
              />
              <SummaryCard
                label="Avg Strain"
                value={dashboardData.summary.average_strain}
                unit=""
              />
              <SummaryCard
                label="Avg HRV"
                value={dashboardData.summary.average_hrv}
                unit="ms"
              />
              <SummaryCard
                label="Days with Data"
                value={dashboardData.summary.days_with_data}
                unit=""
              />
            </div>
          </section>
        )}

        {/* History Chart Placeholder */}
        {dashboardData?.history && dashboardData.history.length > 0 && (
          <section className="dashboard-section">
            <h2>Recent History</h2>
            <div className="history-table">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Strain</th>
                    <th>Calories</th>
                    <th>Avg HR</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.history.slice(0, 7).map((day, index) => (
                    <tr key={index}>
                      <td>{new Date(day.date).toLocaleDateString()}</td>
                      <td>{day.strain ? day.strain.toFixed(1) : '-'}</td>
                      <td>{day.calories || '-'}</td>
                      <td>{day.resting_heart_rate || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Connected Providers */}
        {connectedProviders.length > 0 && (
          <section className="dashboard-section">
            <h2>Connected Devices</h2>
            <div className="providers-list">
              {connectedProviders.map((provider) => (
                <div key={provider.id} className="provider-item">
                  <div className="provider-info">
                    <span className="provider-icon">
                      {provider.provider_name === 'whoop' && '⌚'}
                      {provider.provider_name === 'fitbit' && '📱'}
                      {provider.provider_name === 'garmin' && '⌨️'}
                    </span>
                    <span className="provider-name">
                      {provider.provider_name.charAt(0).toUpperCase() + provider.provider_name.slice(1)}
                    </span>
                  </div>
                  {provider.is_primary && <span className="badge primary-badge">Primary</span>}
                </div>
              ))}
            </div>
          </section>
        )}

        {connectedProviders.length === 0 && (
          <section className="dashboard-section">
            <div className="empty-state">
              <p>No connected devices yet</p>
              <button className="btn btn-primary" onClick={() => navigate('/onboarding')}>
                Connect a Device
              </button>
            </div>
          </section>
        )}

        {/* Insights */}
        {dashboardData?.analytics.insights && dashboardData.analytics.insights.length > 0 && (
          <section className="dashboard-section">
            <h2>Health Insights</h2>
            <div className="insights-grid">
              {dashboardData.analytics.insights.map((insight, index) => (
                <div
                  key={index}
                  className="insight-card"
                  style={{ borderLeftColor: getPriorityColor(insight.priority) }}
                >
                  <p className="insight-message">{insight.message}</p>
                  <span className="insight-type">{insight.type}</span>
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
  color: string;
}

function MetricCard({ label, value, unit, color }: MetricCardProps) {
  return (
    <div className="metric-card" style={{ borderTopColor: color }}>
      <p className="metric-label">{label}</p>
      <div className="metric-value">
        {value !== null ? (
          <>
            <span className="metric-number">{Math.round(value * 10) / 10}</span>
            <span className="metric-unit">{unit}</span>
          </>
        ) : (
          <span className="metric-no-data">No data</span>
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
    <div className="summary-card">
      <p className="summary-label">{label}</p>
      <p className="summary-value">
        {value !== null ? `${Math.round(value * 10) / 10}${unit}` : 'No data'}
      </p>
    </div>
  );
}
