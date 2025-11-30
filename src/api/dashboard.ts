import { Hono } from 'hono';
import SupabaseClientService from '../services/supabase-client.js';
import { AuthService } from '../services/auth-service.js';
import { runWhoopPollingForUser } from '../jobs/whoop-polling.js';
import { runFitbitPollingForUser } from '../jobs/fitbit-polling.js';

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

    // Get user's metrics for the period from health_metrics table
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);

    const { data: metrics } = await supabase
      .from('health_metrics')
      .select('*')
      .eq('user_id', userInfo.userId)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: false });

    // Calculate today's metrics
    const today = new Date().toISOString().split('T')[0];
    const todayMetric = metrics?.find(m => m.date === today) || null;

    // Calculate averages for the period
    const recoveryScores = metrics?.filter(m => m.recovery_score != null).map(m => m.recovery_score) || [];
    const strainValues = metrics?.filter(m => m.strain != null).map(m => m.strain) || [];
    const hrvValues = metrics?.filter(m => m.hrv != null).map(m => m.hrv) || [];

    const avgRecovery = recoveryScores.length > 0
      ? recoveryScores.reduce((a: number, b: number) => a + b, 0) / recoveryScores.length
      : null;
    const avgStrain = strainValues.length > 0
      ? strainValues.reduce((a: number, b: number) => a + b, 0) / strainValues.length
      : null;
    const avgHrv = hrvValues.length > 0
      ? hrvValues.reduce((a: number, b: number) => a + b, 0) / hrvValues.length
      : null;

    // Generate insights based on data
    const insights = [];

    if (avgRecovery !== null) {
      if (avgRecovery >= 67) {
        insights.push({ type: 'recovery', message: 'Your recovery has been excellent this week!', priority: 'positive' });
      } else if (avgRecovery < 33) {
        insights.push({ type: 'recovery', message: 'Focus on rest - your recovery needs attention', priority: 'warning' });
      }
    }

    if (avgStrain !== null && avgStrain > 18) {
      insights.push({ type: 'strain', message: 'High strain this week - make sure to prioritize recovery', priority: 'info' });
    }

    if (providers?.length === 0) {
      insights.push({ type: 'setup', message: 'Connect a device to start tracking your health data', priority: 'info' });
    }

    // Calculate data completeness
    const expectedDataPoints = period;
    const actualDataPoints = metrics?.length || 0;
    const dataCompleteness = expectedDataPoints > 0
      ? Math.min(100, Math.round((actualDataPoints / expectedDataPoints) * 100))
      : 0;

    return c.json({
      success: true,
      dashboard: {
        metrics: {
          today: {
            recovery_score: todayMetric?.recovery_score || null,
            strain: todayMetric?.strain || null,
            calories: todayMetric?.calories || null,
            resting_heart_rate: todayMetric?.resting_heart_rate || null,
            average_heart_rate: todayMetric?.average_heart_rate || null,
            max_heart_rate: todayMetric?.max_heart_rate || null,
            hrv: todayMetric?.hrv || null,
            date: todayMetric?.date || today,
          },
        },
        history: metrics?.map(m => ({
          date: m.date,
          recovery_score: m.recovery_score,
          strain: m.strain,
          calories: m.calories,
          resting_heart_rate: m.resting_heart_rate,
          hrv: m.hrv,
        })) || [],
        summary: {
          average_recovery: avgRecovery ? Math.round(avgRecovery) : null,
          average_strain: avgStrain ? Math.round(avgStrain * 10) / 10 : null,
          average_hrv: avgHrv ? Math.round(avgHrv * 10) / 10 : null,
          data_completeness: dataCompleteness,
          days_with_data: actualDataPoints,
        },
        providers: {
          connected_count: providers?.length || 0,
          providers: providers?.map(p => ({
            name: p.provider_name,
            is_primary: p.is_primary,
            last_synced: p.last_synced_at,
          })) || [],
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

/**
 * POST /dashboard/sync
 * Manually sync data from all connected providers
 *
 * Query params (optional):
 * - provider: specific provider to sync ('whoop', 'fitbit') - if not provided, syncs all
 */
app.post('/sync', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const token = authHeader ? authHeader.replace('Bearer ', '') : null;

    if (!token) {
      return c.json({ success: false, message: 'Missing authorization token' }, 401);
    }

    const userInfo = authService.verifyToken(token);
    if (!userInfo) {
      return c.json({ success: false, message: 'Invalid or expired token' }, 401);
    }

    const supabase = SupabaseClientService.getAdminClient();
    const specificProvider = c.req.query('provider');

    // Get user's connected providers
    let query = supabase
      .from('user_health_providers')
      .select('id, provider_name, access_token')
      .eq('user_id', userInfo.userId)
      .eq('is_active', true);

    if (specificProvider) {
      query = query.eq('provider_name', specificProvider);
    }

    const { data: providers, error: providerError } = await query;

    if (providerError || !providers || providers.length === 0) {
      return c.json({
        success: false,
        message: specificProvider
          ? `No ${specificProvider} provider connected`
          : 'No providers connected',
      }, 404);
    }

    // Sync each provider
    const results: { provider: string; success: boolean; data_points?: number; error?: string }[] = [];

    for (const provider of providers) {
      try {
        let result;

        switch (provider.provider_name) {
          case 'whoop':
            result = await runWhoopPollingForUser(userInfo.userId);
            results.push({
              provider: 'whoop',
              success: result.errors.length === 0,
              data_points: result.cycles_fetched,
              error: result.errors.length > 0 ? result.errors.join('; ') : undefined,
            });
            break;

          case 'fitbit':
            result = await runFitbitPollingForUser(userInfo.userId);
            results.push({
              provider: 'fitbit',
              success: result.errors.length === 0,
              data_points: result.metrics_stored,
              error: result.errors.length > 0 ? result.errors.join('; ') : undefined,
            });
            break;

          default:
            results.push({
              provider: provider.provider_name,
              success: false,
              error: `Sync not implemented for ${provider.provider_name}`,
            });
        }
      } catch (syncError) {
        results.push({
          provider: provider.provider_name,
          success: false,
          error: syncError instanceof Error ? syncError.message : 'Unknown error',
        });
      }
    }

    const totalDataPoints = results.reduce((sum, r) => sum + (r.data_points || 0), 0);
    const successfulSyncs = results.filter(r => r.success).length;

    return c.json({
      success: successfulSyncs > 0,
      message: `Synced ${successfulSyncs}/${results.length} providers, ${totalDataPoints} data points`,
      results,
    });
  } catch (error) {
    console.error('Sync error:', error);
    return c.json({ success: false, message: 'Failed to sync data' }, 500);
  }
});

export default app;
