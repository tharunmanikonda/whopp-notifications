/**
 * Dashboard API Route
 * Provides comprehensive dashboard data endpoint
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { MetricsService } from '../../src/services/db/metrics-service.js';
import { AnalyticsService } from '../../src/services/db/analytics-service.js';
import { MessageService } from '../../src/services/db/message-service.js';
import { ProviderService } from '../../src/services/db/provider-service.js';
import { AuthService } from '../../src/services/auth-service.js';

const metricsService = new MetricsService();
const analyticsService = new AnalyticsService();
const messageService = new MessageService();
const providerService = new ProviderService();
const authService = new AuthService();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  // Validate authentication
  const authHeader = req.headers.authorization;
  const token = authService.extractTokenFromHeader(authHeader);

  if (!token || !authService.validateToken(token)) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }

  const decoded = authService.verifyToken(token);
  if (!decoded) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
    });
  }

  try {
    const userId = decoded.userId;
    const period = parseInt(req.query.period as string) || 7; // days

    // Fetch all dashboard data in parallel
    const [
      recentMetrics,
      latestAnalytics,
      summaryStats,
      recentMessages,
      connectedProviders,
      messageStats,
    ] = await Promise.all([
      metricsService.getRecentMetrics(userId, period),
      analyticsService.getLatestAnalytics(userId),
      analyticsService.getSummaryStats(userId, period),
      messageService.getRecentMessages(userId, 20),
      providerService.getUserProviders(userId),
      messageService.getMessageStats(userId),
    ]);

    // Calculate key metrics
    const currentMetrics = recentMetrics.length > 0 ? recentMetrics[0] : null;
    const previousMetrics = recentMetrics.length > 1 ? recentMetrics[1] : null;

    const keyMetrics = {
      today: {
        recovery_score: currentMetrics?.recovery_score || null,
        sleep_score: currentMetrics?.sleep_score || null,
        strain: currentMetrics?.strain || null,
        resting_heart_rate: currentMetrics?.resting_heart_rate || null,
        hrv: currentMetrics?.hrv || null,
        data_completeness: currentMetrics?.data_completeness || 0,
      },
      comparison: {
        recovery_change:
          currentMetrics && previousMetrics
            ? currentMetrics.recovery_score - previousMetrics.recovery_score
            : null,
        sleep_change:
          currentMetrics && previousMetrics
            ? currentMetrics.sleep_score - previousMetrics.sleep_score
            : null,
      },
    };

    // Prepare dashboard response
    return res.status(200).json({
      success: true,
      dashboard: {
        user_id: userId,
        period_days: period,
        generated_at: new Date().toISOString(),

        // Key metrics
        metrics: keyMetrics,

        // Summary statistics
        summary: {
          total_metrics_recorded: recentMetrics.length,
          average_recovery:
            summaryStats.avg_recovery_score !== undefined
              ? Math.round(summaryStats.avg_recovery_score)
              : null,
          average_sleep:
            summaryStats.avg_sleep_score !== undefined
              ? Math.round(summaryStats.avg_sleep_score)
              : null,
          average_strain:
            summaryStats.avg_strain !== undefined
              ? Math.round(summaryStats.avg_strain * 10) / 10
              : null,
          data_completeness:
            summaryStats.avg_data_completeness !== undefined
              ? Math.round(summaryStats.avg_data_completeness)
              : null,
        },

        // Health providers
        providers: {
          connected_count: connectedProviders.length,
          providers: connectedProviders.map((p: any) => ({
            id: p.id,
            name: p.provider_name,
            is_primary: p.is_primary,
            connected_since: p.created_at,
          })),
        },

        // Message insights
        messages: {
          total_messages: messageStats?.total_messages || 0,
          delivered: messageStats?.delivered || 0,
          pending: messageStats?.pending || 0,
          failed: messageStats?.failed || 0,
          delivery_rate:
            messageStats?.total_messages > 0
              ? Math.round((messageStats?.delivered / messageStats?.total_messages) * 100)
              : 0,
          recent: recentMessages.slice(0, 5).map((m: any) => ({
            id: m.id,
            message: m.message.substring(0, 100) + '...',
            status: m.delivery_status,
            sent_at: m.sent_at,
          })),
        },

        // Analytics
        analytics: {
          latest: latestAnalytics,
          insights: generateInsights(keyMetrics, summaryStats),
        },

        // Historical data (for charts)
        historical: {
          metrics: recentMetrics.slice(0, 14).map((m: any) => ({
            date: m.date,
            recovery: m.recovery_score,
            sleep: m.sleep_score,
            strain: m.strain,
          })),
        },
      },
    });
  } catch (error: any) {
    console.error('Dashboard endpoint error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch dashboard data',
    });
  }
}

/**
 * Generate actionable insights from health data
 */
function generateInsights(
  keyMetrics: any,
  summaryStats: any
): Array<{ type: string; message: string; priority: string }> {
  const insights = [];

  // Recovery insights
  if (keyMetrics.today.recovery_score !== null) {
    if (keyMetrics.today.recovery_score >= 80) {
      insights.push({
        type: 'recovery',
        message: 'Excellent recovery! Your body is ready for intense activity.',
        priority: 'info',
      });
    } else if (keyMetrics.today.recovery_score >= 50) {
      insights.push({
        type: 'recovery',
        message: 'Good recovery. You can do moderate to intense activity.',
        priority: 'info',
      });
    } else if (keyMetrics.today.recovery_score < 33) {
      insights.push({
        type: 'recovery',
        message: 'Low recovery. Consider rest or light activity.',
        priority: 'warning',
      });
    }
  }

  // Sleep insights
  if (keyMetrics.today.sleep_score !== null) {
    if (keyMetrics.today.sleep_score < 70) {
      insights.push({
        type: 'sleep',
        message: 'Sleep quality was below average. Consider sleep optimization.',
        priority: 'warning',
      });
    } else if (keyMetrics.today.sleep_score >= 85) {
      insights.push({
        type: 'sleep',
        message: 'Great sleep quality! Continue your sleep routine.',
        priority: 'info',
      });
    }
  }

  // Strain insights
  if (keyMetrics.today.strain !== null) {
    if (keyMetrics.today.strain > 5) {
      insights.push({
        type: 'strain',
        message: 'High daily strain. Plan lighter activities for tomorrow.',
        priority: 'warning',
      });
    } else if (keyMetrics.today.strain < 2) {
      insights.push({
        type: 'strain',
        message: 'Low strain. Good opportunity for training.',
        priority: 'info',
      });
    }
  }

  // Heart rate insights
  if (keyMetrics.today.resting_heart_rate !== null) {
    if (keyMetrics.today.resting_heart_rate > 70) {
      insights.push({
        type: 'heart_rate',
        message: 'Elevated resting heart rate. Ensure adequate recovery and hydration.',
        priority: 'info',
      });
    }
  }

  // Trend insights
  if (keyMetrics.comparison.recovery_change !== null) {
    if (keyMetrics.comparison.recovery_change >= 10) {
      insights.push({
        type: 'trend',
        message: 'Recovery is improving! Keep up your current routine.',
        priority: 'positive',
      });
    } else if (keyMetrics.comparison.recovery_change <= -10) {
      insights.push({
        type: 'trend',
        message: 'Recovery is declining. Increase rest and recovery focus.',
        priority: 'warning',
      });
    }
  }

  return insights.length > 0
    ? insights
    : [
        {
          type: 'general',
          message: 'Insufficient data. Continue logging to get personalized insights.',
          priority: 'info',
        },
      ];
}
