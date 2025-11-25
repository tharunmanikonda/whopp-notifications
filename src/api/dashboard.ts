import { Hono } from 'hono';
import SupabaseClientService from '../services/supabase-client.js';
import { AuthService } from '../services/auth-service.js';

const app = new Hono();
const authService = new AuthService();

/**
 * GET /dashboard
 * Get user's dashboard data including metrics, providers, and insights
 *
 * Query params:
 * - period: number of days (default: 7)
 *
 * Headers:
 * Authorization: Bearer <token>
 */
app.get('/', async (c) => {
  try {
    // Get authorization token
    const authHeader = c.req.header('Authorization');
    const token = authHeader ? authHeader.replace('Bearer ', '') : null;

    if (!token) {
      return c.json({ success: false, message: 'Missing authorization token' }, 401);
    }

    // Validate token
    const userInfo = authService.verifyToken(token);
    if (!userInfo) {
      return c.json({ success: false, message: 'Invalid or expired token' }, 401);
    }

    const period = parseInt(c.req.query('period') || '7');
    const supabase = SupabaseClientService.getAdminClient();

    // Get user's connected providers
    const { data: providers } = await supabase
      .from('user_health_providers')
      .select('id, provider_name, is_primary, is_active, connected_at, last_synced_at')
      .eq('user_id', userInfo.userId)
      .eq('is_active', true);

    // Get user's metrics for the period
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);

    const { data: metrics } = await supabase
      .from('user_metrics')
      .select('*')
      .eq('user_id', userInfo.userId)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: false });

    // Calculate today's metrics
    const today = new Date().toISOString().split('T')[0];
    const todayMetrics = metrics?.filter(m => m.date === today) || [];

    // Calculate averages for the period
    const recoveryScores = metrics?.filter(m => m.metric_type === 'recovery').map(m => m.data?.score) || [];
    const sleepScores = metrics?.filter(m => m.metric_type === 'sleep').map(m => m.data?.score) || [];
    const strainValues = metrics?.filter(m => m.metric_type === 'strain').map(m => m.data?.strain) || [];

    const avgRecovery = recoveryScores.length > 0
      ? recoveryScores.reduce((a, b) => a + b, 0) / recoveryScores.length
      : null;
    const avgSleep = sleepScores.length > 0
      ? sleepScores.reduce((a, b) => a + b, 0) / sleepScores.length
      : null;
    const avgStrain = strainValues.length > 0
      ? strainValues.reduce((a, b) => a + b, 0) / strainValues.length
      : null;

    // Get today's specific values
    const todayRecovery = todayMetrics.find(m => m.metric_type === 'recovery');
    const todaySleep = todayMetrics.find(m => m.metric_type === 'sleep');
    const todayStrain = todayMetrics.find(m => m.metric_type === 'strain');

    // Generate insights based on data
    const insights = [];

    if (avgRecovery !== null) {
      if (avgRecovery >= 67) {
        insights.push({ type: 'recovery', message: 'Your recovery has been excellent this week!', priority: 'positive' });
      } else if (avgRecovery < 33) {
        insights.push({ type: 'recovery', message: 'Focus on rest - your recovery needs attention', priority: 'warning' });
      }
    }

    if (avgSleep !== null && avgSleep < 70) {
      insights.push({ type: 'sleep', message: 'Try to get more quality sleep for better recovery', priority: 'info' });
    }

    if (providers?.length === 0) {
      insights.push({ type: 'setup', message: 'Connect a device to start tracking your health data', priority: 'info' });
    }

    // Calculate data completeness
    const expectedDataPoints = period * 3; // recovery, sleep, strain per day
    const actualDataPoints = metrics?.length || 0;
    const dataCompleteness = expectedDataPoints > 0
      ? Math.round((actualDataPoints / expectedDataPoints) * 100)
      : 0;

    return c.json({
      success: true,
      dashboard: {
        metrics: {
          today: {
            recovery_score: todayRecovery?.data?.score || null,
            sleep_score: todaySleep?.data?.score || null,
            strain: todayStrain?.data?.strain || null,
            resting_heart_rate: todayRecovery?.data?.resting_heart_rate || null,
            hrv: todayRecovery?.data?.hrv || null,
            data_completeness: todayMetrics.length > 0 ? 100 : 0,
          },
        },
        summary: {
          average_recovery: avgRecovery,
          average_sleep: avgSleep,
          average_strain: avgStrain,
          data_completeness: dataCompleteness,
        },
        providers: {
          connected_count: providers?.length || 0,
          providers: providers?.map(p => ({
            name: p.provider_name,
            is_primary: p.is_primary,
          })) || [],
        },
        messages: {
          delivery_rate: 100, // TODO: Calculate from actual message delivery
          recent: [], // TODO: Fetch from messages table
        },
        analytics: {
          insights,
        },
      },
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return c.json({ success: false, message: 'Failed to load dashboard' }, 500);
  }
});

export default app;
