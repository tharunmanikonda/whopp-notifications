/**
 * WHOOP Backup Polling Job
 *
 * Purpose:
 * - Polls WHOOP API for missed webhook events
 * - Runs as scheduled job (cron)
 * - Ensures data is always up-to-date even if webhooks fail
 * - WHOOP retries webhooks 3 times over 3 days, but this provides extra safety
 *
 * Trigger:
 * - Daily at 2 AM for all users
 * - Or on-demand via admin endpoint
 *
 * Strategy:
 * - Fetch data for last 7 days for each user
 * - Compare with stored data
 * - Update only changed records
 */

import SupabaseClientService from '../services/supabase-client.js';

const WHOOP_API_BASE = 'https://api.prod.whoop.com/api/v2';

interface WhoopDataPoint {
  id?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  [key: string]: any;
}

interface PollingResult {
  user_id: string;
  cycles_fetched: number;
  workouts_fetched: number;
  sleep_fetched: number;
  activities_fetched: number;
  last_polled_at: string;
  errors: string[];
}

/**
 * Fetch cycles (daily summaries) from WHOOP API
 *
 * Cycles include: strain, recovery, sleep performance, and other daily metrics
 * Rate limited: 1 request per cycle, so fetching 7 days = 7 requests
 */
async function fetchCycles(
  accessToken: string,
  startDate: string,
  endDate: string
): Promise<WhoopDataPoint[]> {
  try {
    const response = await fetch(`${WHOOP_API_BASE}/users/-/cycles?start=${startDate}&end=${endDate}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Access token expired or invalid');
      }
      throw new Error(`WHOOP API error: ${response.status}`);
    }

    const data = (await response.json()) as any;
    return data.records || [];
  } catch (error) {
    console.error('Error fetching cycles:', error);
    throw error;
  }
}

/**
 * Fetch workouts from WHOOP API
 *
 * Each workout includes: activity type, strain, duration, calories, etc.
 */
async function fetchWorkouts(
  accessToken: string,
  startDate: string,
  endDate: string
): Promise<WhoopDataPoint[]> {
  try {
    const response = await fetch(`${WHOOP_API_BASE}/users/-/workouts?start=${startDate}&end=${endDate}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Access token expired or invalid');
      }
      throw new Error(`WHOOP API error: ${response.status}`);
    }

    const data = (await response.json()) as any;
    return data.records || [];
  } catch (error) {
    console.error('Error fetching workouts:', error);
    throw error;
  }
}

/**
 * Fetch sleep from WHOOP API
 *
 * Sleep includes: stages (light, deep, REM, wake), quality score, HRV, etc.
 */
async function fetchSleep(
  accessToken: string,
  startDate: string,
  endDate: string
): Promise<WhoopDataPoint[]> {
  try {
    const response = await fetch(`${WHOOP_API_BASE}/users/-/sleep?start=${startDate}&end=${endDate}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Access token expired or invalid');
      }
      throw new Error(`WHOOP API error: ${response.status}`);
    }

    const data = (await response.json()) as any;
    return data.records || [];
  } catch (error) {
    console.error('Error fetching sleep:', error);
    throw error;
  }
}

/**
 * Store fetched data in database
 *
 * Uses upsert to avoid duplicates:
 * - If data already exists (same user + date + metric type), update it
 * - If new, insert it
 */
async function storeMetrics(
  userId: string,
  metricType: 'cycles' | 'workouts' | 'sleep',
  data: WhoopDataPoint[]
): Promise<number> {
  if (data.length === 0) return 0;

  const supabase = SupabaseClientService.getAdminClient();

  const metricsToStore = data.map((point) => ({
    user_id: userId,
    provider: 'whoop',
    metric_type: metricType,
    date: point.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
    external_id: point.id,
    data: point,
    synced_at: new Date().toISOString(),
  }));

  const { error, data: inserted } = await supabase
    .from('user_metrics')
    .upsert(metricsToStore, {
      onConflict: 'user_id,provider,metric_type,date',
    })
    .select();

  if (error) {
    console.error('Error storing metrics:', error);
    throw error;
  }

  return inserted?.length || 0;
}

/**
 * Poll WHOOP data for a single user
 *
 * Steps:
 * 1. Calculate date range (last 7 days)
 * 2. Fetch cycles, workouts, sleep from API
 * 3. Store in database with upsert
 * 4. Update last_polled_at timestamp
 */
async function pollUserData(
  userId: string,
  providerId: string,
  accessToken: string
): Promise<PollingResult> {
  const result: PollingResult = {
    user_id: userId,
    cycles_fetched: 0,
    workouts_fetched: 0,
    sleep_fetched: 0,
    activities_fetched: 0,
    last_polled_at: new Date().toISOString(),
    errors: [],
  };

  try {
    // Calculate date range: last 7 days
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    console.log(`Polling WHOOP data for user ${userId} (${startStr} to ${endStr})`);

    // Fetch data in parallel for efficiency
    const [cycles, workouts, sleep] = await Promise.all([
      fetchCycles(accessToken, startStr, endStr).catch((error) => {
        result.errors.push(`Cycles: ${error.message}`);
        return [];
      }),
      fetchWorkouts(accessToken, startStr, endStr).catch((error) => {
        result.errors.push(`Workouts: ${error.message}`);
        return [];
      }),
      fetchSleep(accessToken, startStr, endStr).catch((error) => {
        result.errors.push(`Sleep: ${error.message}`);
        return [];
      }),
    ]);

    // Store data
    result.cycles_fetched = await storeMetrics(userId, 'cycles', cycles).catch((error) => {
      result.errors.push(`Store cycles: ${error.message}`);
      return 0;
    });

    result.workouts_fetched = await storeMetrics(userId, 'workouts', workouts).catch((error) => {
      result.errors.push(`Store workouts: ${error.message}`);
      return 0;
    });

    result.sleep_fetched = await storeMetrics(userId, 'sleep', sleep).catch((error) => {
      result.errors.push(`Store sleep: ${error.message}`);
      return 0;
    });

    // Update provider's last_polled_at timestamp
    const supabase = SupabaseClientService.getAdminClient();
    await supabase
      .from('user_health_providers')
      .update({
        last_polled_at: result.last_polled_at,
      })
      .eq('id', providerId);

    console.log(`✅ Polling completed for user ${userId}:`, result);

    return result;
  } catch (error) {
    result.errors.push(`Critical: ${error instanceof Error ? error.message : String(error)}`);
    console.error(`❌ Polling failed for user ${userId}:`, error);
    return result;
  }
}

/**
 * Run backup polling for all users
 *
 * Main function called by scheduler
 */
export async function runWhoopBackupPolling(): Promise<{
  total_users: number;
  successful: number;
  failed: number;
  total_data_points: number;
  errors: string[];
}> {
  console.log('🔄 Starting WHOOP backup polling job...');

  const supabase = SupabaseClientService.getAdminClient();
  const results = {
    total_users: 0,
    successful: 0,
    failed: 0,
    total_data_points: 0,
    errors: [] as string[],
  };

  try {
    // Get all active WHOOP providers
    const { data: providers, error } = await supabase
      .from('user_health_providers')
      .select('id, user_id, access_token, external_user_id')
      .eq('provider_name', 'whoop')
      .eq('is_active', true);

    if (error) {
      const errMsg = `Failed to fetch WHOOP providers: ${error.message}`;
      results.errors.push(errMsg);
      console.error(errMsg);
      return results;
    }

    if (!providers || providers.length === 0) {
      console.log('No active WHOOP providers found');
      return results;
    }

    results.total_users = providers.length;

    // Poll each user sequentially to avoid rate limit
    // WHOOP: 100 requests per minute limit
    for (const provider of providers) {
      try {
        const result = await pollUserData(provider.user_id, provider.id, provider.access_token);

        if (result.errors.length === 0) {
          results.successful++;
        } else {
          results.failed++;
          results.errors.push(`User ${provider.user_id}: ${result.errors.join('; ')}`);
        }

        results.total_data_points += result.cycles_fetched + result.workouts_fetched + result.sleep_fetched;

        // Delay to avoid rate limiting (WHOOP: 100 req/min = ~600ms per request)
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (userError) {
        results.failed++;
        const errMsg = `User ${provider.user_id}: ${userError instanceof Error ? userError.message : String(userError)}`;
        results.errors.push(errMsg);
        console.error(errMsg);
      }
    }

    console.log(
      `✅ WHOOP backup polling completed: ${results.successful}/${results.total_users} users, ${results.total_data_points} data points fetched`
    );

    return results;
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    results.errors.push(`Critical error: ${errMsg}`);
    console.error('❌ Critical error in backup polling:', error);
    return results;
  }
}

/**
 * Run polling for a specific user (on-demand)
 */
export async function runWhoopPollingForUser(userId: string): Promise<PollingResult> {
  const supabase = SupabaseClientService.getAdminClient();

  const { data: provider, error } = await supabase
    .from('user_health_providers')
    .select('id, access_token')
    .eq('user_id', userId)
    .eq('provider_name', 'whoop')
    .eq('is_active', true)
    .single();

  if (error || !provider) {
    throw new Error('WHOOP provider not found for user');
  }

  return pollUserData(userId, provider.id, provider.access_token);
}

export default {
  runWhoopBackupPolling,
  runWhoopPollingForUser,
};
