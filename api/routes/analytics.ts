/**
 * Analytics API Routes
 * Provides endpoints for health metrics dashboard and analytics
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { MetricsService } from '../../src/services/db/metrics-service.js';
import { AnalyticsService } from '../../src/services/db/analytics-service.js';
import { MessageService } from '../../src/services/db/message-service.js';
import { AuthService } from '../../src/services/auth-service.js';

const metricsService = new MetricsService();
const analyticsService = new AnalyticsService();
const messageService = new MessageService();
const authService = new AuthService();

/**
 * Handle different HTTP methods
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action } = req.query;

  try {
    switch (action) {
      case 'dashboard':
        return handleDashboard(req, res);
      case 'metrics':
        return handleGetMetrics(req, res);
      case 'trends':
        return handleGetTrends(req, res);
      case 'summary':
        return handleGetSummary(req, res);
      case 'messages':
        return handleGetMessages(req, res);
      case 'health-goals':
        return handleHealthGoals(req, res);
      default:
        return res.status(404).json({
          success: false,
          message: `Unknown analytics action: ${action}`,
        });
    }
  } catch (error) {
    console.error('Analytics handler error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

/**
 * GET /api/routes/analytics?action=dashboard
 * Get comprehensive dashboard data (requires authentication)
 */
async function handleDashboard(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

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
    const days = parseInt(req.query.days as string) || 7;

    // Get recent metrics
    const recentMetrics = await metricsService.getRecentMetrics(userId, days);

    // Get latest analytics
    const latestAnalytics = await analyticsService.getLatestAnalytics(userId);

    // Get summary stats
    const summaryStats = await analyticsService.getSummaryStats(userId, days);

    // Get recent messages (last 10)
    const recentMessages = await messageService.getRecentMessages(userId, 10);

    return res.status(200).json({
      success: true,
      dashboard: {
        period_days: days,
        metrics_count: recentMetrics.length,
        latest_metrics: recentMetrics.length > 0 ? recentMetrics[0] : null,
        analytics: latestAnalytics,
        summary: summaryStats,
        recent_messages: recentMessages,
        generated_at: new Date().toISOString(),
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
 * GET /api/routes/analytics?action=metrics
 * Get health metrics for a specific period (requires authentication)
 */
async function handleGetMetrics(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

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
    const days = parseInt(req.query.days as string) || 30;
    const provider = req.query.provider as string | undefined;

    let metrics = await metricsService.getRecentMetrics(userId, days);

    // Filter by provider if specified
    if (provider) {
      metrics = metrics.filter((m: any) => m.provider === provider);
    }

    return res.status(200).json({
      success: true,
      metrics: {
        count: metrics.length,
        period_days: days,
        provider_filter: provider || 'all',
        data: metrics,
      },
    });
  } catch (error: any) {
    console.error('Get metrics endpoint error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch metrics',
    });
  }
}

/**
 * GET /api/routes/analytics?action=trends
 * Get health trends and analysis (requires authentication)
 */
async function handleGetTrends(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

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
    const days = parseInt(req.query.days as string) || 30;

    // Get analytics history for trend analysis
    const trends = await analyticsService.getAnalyticsHistory(userId, days);

    // Calculate trend indicators
    const trendIndicators = calculateTrendIndicators(trends);

    return res.status(200).json({
      success: true,
      trends: {
        period_days: days,
        data_points: trends.length,
        indicators: trendIndicators,
        history: trends,
      },
    });
  } catch (error: any) {
    console.error('Get trends endpoint error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch trends',
    });
  }
}

/**
 * GET /api/routes/analytics?action=summary
 * Get high-level summary statistics (requires authentication)
 */
async function handleGetSummary(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

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
    const days = parseInt(req.query.days as string) || 30;

    // Get summary stats
    const summary = await analyticsService.getSummaryStats(userId, days);

    return res.status(200).json({
      success: true,
      summary: {
        period_days: days,
        stats: summary,
        generated_at: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Get summary endpoint error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch summary',
    });
  }
}

/**
 * GET /api/routes/analytics?action=messages
 * Get message history and statistics (requires authentication)
 */
async function handleGetMessages(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

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
    const limit = parseInt(req.query.limit as string) || 30;
    const status = req.query.status as string | undefined;

    let messages = await messageService.getRecentMessages(userId, limit);

    // Filter by status if specified
    if (status) {
      messages = messages.filter((m: any) => m.delivery_status === status);
    }

    // Get message statistics
    const stats = await messageService.getMessageStats(userId);

    return res.status(200).json({
      success: true,
      messages: {
        count: messages.length,
        limit,
        status_filter: status || 'all',
        statistics: stats,
        data: messages,
      },
    });
  } catch (error: any) {
    console.error('Get messages endpoint error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch messages',
    });
  }
}

/**
 * GET/POST /api/routes/analytics?action=health-goals
 * Manage user health goals (requires authentication)
 */
async function handleHealthGoals(req: VercelRequest, res: VercelResponse) {
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

  // GET health goals
  if (req.method === 'GET') {
    return res.status(200).json({
      success: true,
      message: 'Health goals endpoint - coming soon',
      feature: 'in_development',
    });
  }

  // POST to update health goals
  if (req.method === 'POST') {
    return res.status(200).json({
      success: true,
      message: 'Health goals update endpoint - coming soon',
      feature: 'in_development',
    });
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}

/**
 * Helper function to calculate trend indicators from analytics data
 */
function calculateTrendIndicators(trends: any[]) {
  if (trends.length < 2) {
    return {
      recovery_trend: 'insufficient_data',
      sleep_trend: 'insufficient_data',
      strain_trend: 'insufficient_data',
    };
  }

  const calculateChange = (metric: string) => {
    const values = trends.map((t: any) => t[metric]).filter((v: any) => v !== null);
    if (values.length < 2) return 'no_data';

    const recent = values.slice(0, Math.floor(values.length / 2));
    const older = values.slice(Math.floor(values.length / 2));

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

    const change = ((recentAvg - olderAvg) / olderAvg) * 100;

    if (change > 5) return 'improving';
    if (change < -5) return 'declining';
    return 'stable';
  };

  return {
    recovery_trend: calculateChange('avg_recovery_score'),
    sleep_trend: calculateChange('avg_sleep_score'),
    strain_trend: calculateChange('avg_strain'),
    message: 'Trends calculated from recent data',
  };
}
