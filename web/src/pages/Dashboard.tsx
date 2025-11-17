import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useProviderStore } from '../store/providerStore';
import axios from 'axios';
import '../styles/dashboard.css';

interface DashboardData {
  metrics: {
    today: {
      recovery_score: number | null;
      sleep_score: number | null;
      strain: number | null;
      resting_heart_rate: number | null;
      hrv: number | null;
      data_completeness: number;
    };
  };
  summary: {
    average_recovery: number | null;
    average_sleep: number | null;
    average_strain: number | null;
    data_completeness: number;
  };
  providers: {
    connected_count: number;
    providers: Array<{ name: string; is_primary: boolean }>;
  };
  messages: {
    delivery_rate: number;
    recent: Array<{ message: string; status: string }>;
  };
  analytics: {
    insights: Array<{ type: string; message: string; priority: string }>;
  };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, token, logout } = useAuthStore();
  const { connectedProviders, fetchConnectedProviders } = useProviderStore();

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Redirect if not logged in
    if (!user || !token) {
      navigate('/login');
      return;
    }

    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL || 'https://whopp-notifications-63tja648u-tharunmanikondas-projects.vercel.app/api'}/dashboard?period=7`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

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

    fetchDashboard();
    fetchConnectedProviders(token);
  }, [user, token, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

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

  if (error) {
    return (
      <div className="dashboard-error">
        <div className="alert alert-error">{error}</div>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Dashboard</h1>
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
        {user && <p className="welcome-text">Welcome back, {user.full_name}!</p>}
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
                label="Sleep Score"
                value={dashboardData.metrics.today.sleep_score}
                unit="%"
                color="#8b5cf6"
              />
              <MetricCard label="Strain" value={dashboardData.metrics.today.strain} unit="" color="#ef4444" />
              <MetricCard
                label="Resting Heart Rate"
                value={dashboardData.metrics.today.resting_heart_rate}
                unit="bpm"
                color="#f59e0b"
              />
              <MetricCard label="HRV" value={dashboardData.metrics.today.hrv} unit="ms" color="#3b82f6" />
              <MetricCard
                label="Data Completeness"
                value={dashboardData.metrics.today.data_completeness}
                unit="%"
                color="#6366f1"
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
                label="Avg Sleep"
                value={dashboardData.summary.average_sleep}
                unit="%"
              />
              <SummaryCard label="Avg Strain" value={dashboardData.summary.average_strain} unit="" />
              <SummaryCard
                label="Data Completeness"
                value={dashboardData.summary.data_completeness}
                unit="%"
              />
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

        {/* Message Stats */}
        {dashboardData?.messages && (
          <section className="dashboard-section">
            <h2>Message Statistics</h2>
            <div className="stats-card">
              <div className="stat-item">
                <span className="stat-label">Delivery Rate</span>
                <span className="stat-value">{dashboardData.messages.delivery_rate}%</span>
              </div>
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

        {/* Recent Messages */}
        {dashboardData?.messages.recent && dashboardData.messages.recent.length > 0 && (
          <section className="dashboard-section">
            <h2>Recent Motivational Messages</h2>
            <div className="messages-list">
              {dashboardData.messages.recent.map((msg, index) => (
                <div key={index} className="message-item">
                  <p className="message-text">"{msg.message.substring(0, 100)}..."</p>
                  <span className={`message-status ${msg.status}`}>{msg.status}</span>
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
