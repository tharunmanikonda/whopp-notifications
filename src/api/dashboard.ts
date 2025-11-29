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
 * Manually sync data from WHOOP
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

    // Get user's WHOOP provider
    const { data: provider } = await supabase
      .from('user_health_providers')
      .select('id, access_token')
      .eq('user_id', userInfo.userId)
      .eq('provider_name', 'whoop')
      .eq('is_active', true)
      .single();

    if (!provider) {
      return c.json({ success: false, message: 'No WHOOP provider connected' }, 404);
    }

    // Fetch cycle data from WHOOP
    const WHOOP_API_BASE = 'https://api.prod.whoop.com/developer/v1';

    // Get last 7 days of cycle data
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const cycleResponse = await fetch(
      `${WHOOP_API_BASE}/cycle?start=${startDate.toISOString()}&end=${new Date().toISOString()}`,
      {
        headers: { Authorization: `Bearer ${provider.access_token}` },
      }
    );

    if (!cycleResponse.ok) {
      const errorText = await cycleResponse.text();
      console.error('WHOOP API error:', cycleResponse.status, errorText);
      return c.json({ success: false, message: 'Failed to fetch WHOOP data' }, 500);
    }

    const cycleData = (await cycleResponse.json()) as any;
    const cycles = cycleData.records || [];

    // Store each cycle
    let syncedCount = 0;
    for (const cycle of cycles) {
      const date = cycle.start?.split('T')[0] || new Date().toISOString().split('T')[0];
      const score = cycle.score || {};

      await supabase.from('health_metrics').upsert(
        {
          user_id: userInfo.userId,
          provider_id: provider.id,
          date,
          strain: score.strain,
          calories: score.kilojoule ? Math.round(score.kilojoule / 4.184) : null,
          average_heart_rate: score.average_heart_rate,
          max_heart_rate: score.max_heart_rate,
          raw_data: cycle,
          synced_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,provider_id,date' }
      );
      syncedCount++;
    }

    // Update last_synced_at on provider
    await supabase
      .from('user_health_providers')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', provider.id);

    return c.json({
      success: true,
      message: `Synced ${syncedCount} days of data`,
      synced_count: syncedCount,
    });
  } catch (error) {
    console.error('Sync error:', error);
    return c.json({ success: false, message: 'Failed to sync data' }, 500);
  }
});

export default app;
