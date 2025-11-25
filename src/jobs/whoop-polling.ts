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

// WHOOP v2 API base URL (developer endpoint, not /api/v2)
const WHOOP_API_BASE = 'https://api.prod.whoop.com/developer/v1';

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
    // WHOOP v1 developer API - no /users/-/ prefix needed
    const response = await fetch(`${WHOOP_API_BASE}/cycle?start=${startDate}&end=${endDate}`, {
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
    // WHOOP v1 developer API - /activity/workout endpoint
    const response = await fetch(`${WHOOP_API_BASE}/activity/workout?start=${startDate}&end=${endDate}`, {
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
    // WHOOP v1 developer API - /activity/sleep endpoint
    const response = await fetch(`${WHOOP_API_BASE}/activity/sleep?start=${startDate}&end=${endDate}`, {
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
 * Store fetched cycle data in database
 *
 * Uses upsert to avoid duplicates:
 * - If data already exists (same user + provider + date), update it
 * - If new, insert it
 *
 * Note: health_metrics table has specific columns for each metric type
 */
async function storeCycleMetrics(
  userId: string,
  providerId: string,
  cycles: WhoopDataPoint[]
): Promise<number> {
  if (cycles.length === 0) return 0;

  const supabase = SupabaseClientService.getAdminClient();
  let storedCount = 0;

  for (const cycle of cycles) {
    const date = cycle.created_at?.split('T')[0] || new Date().toISOString().split('T')[0];
    const score = cycle.score || {};

    const metricsToStore = {
      user_id: userId,
      provider_id: providerId,
      date,
      strain: score.strain,
      calories: score.kilojoule ? Math.round(score.kilojoule / 4.184) : null, // Convert kJ to kcal
      average_heart_rate: score.average_heart_rate,
      max_heart_rate: score.max_heart_rate,
      raw_data: cycle,
      synced_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('health_metrics')
      .upsert(metricsToStore, {
        onConflict: 'user_id,provider_id,date',
      });

    if (error) {
      console.error('Error storing cycle metric:', error);
    } else {
      storedCount++;
    }
  }

  return storedCount;
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
    // WHOOP API requires full ISO timestamps, not just YYYY-MM-DD
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    const startStr = startDate.toISOString();
    const endStr = endDate.toISOString();

    console.log(`Polling WHOOP data for user ${userId} (${startStr} to ${endStr})`);

    // Fetch cycles - this is the main data we get from WHOOP v1 API
    // (workout and sleep endpoints return 404, may need different scopes)
    const cycles = await fetchCycles(accessToken, startStr, endStr).catch((error) => {
      result.errors.push(`Cycles: ${error.message}`);
      return [];
    });

    console.log(`Fetched ${cycles.length} cycles for user ${userId}`);

    // Store cycle data
    result.cycles_fetched = await storeCycleMetrics(userId, providerId, cycles).catch((error) => {
      result.errors.push(`Store cycles: ${error.message}`);
      return 0;
    });

    // Note: workout and sleep fetching disabled - they return 404
    // May need to check scopes or use different API version
    result.workouts_fetched = 0;
    result.sleep_fetched = 0;

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
      .select('id, user_id, access_token')
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
