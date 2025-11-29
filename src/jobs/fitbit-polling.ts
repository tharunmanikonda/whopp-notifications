/**
 * Fitbit Polling Job
 *
 * Purpose:
 * - Polls Fitbit API for health data for all active Fitbit users
 * - Uses rate limiting (150 requests/hour per user)
 * - Stores data in health_metrics table with upsert
 *
 * Trigger:
 * - Daily at configured time (e.g., 8 AM for morning summary)
 * - Or on-demand via admin endpoint
 *
 * Strategy:
 * - Fetch data for last 7 days for each user (backfill)
 * - Each day fetch = ~8 API calls (activity, sleep, hr, hrv, weight, spo2, br, temp)
 * - With rate limit of 150/hr, can safely poll ~18 day-requests per user per hour
 */

import SupabaseClientService from '../services/supabase-client.js';
import { FitbitProvider } from '../services/providers/fitbit-provider.js';
import { getRateLimiter } from '../services/rate-limiter.js';
import { HealthMetrics } from '../types/health-provider.js';

interface FitbitPollingResult {
  user_id: string;
  days_fetched: number;
  metrics_stored: number;
  last_polled_at: string;
  errors: string[];
}

interface FitbitDayData {
  activities: any;
  sleep: any;
  heartRate: any;
  hrv: any;
  weight: any;
  spo2: any;
  breathingRate: any;
  temperature: any;
}

const FITBIT_API_BASE = 'https://api.fitbit.com';

/**
 * Fetch all health data for a specific date
 * Returns null if rate limited
 */
async function fetchDayData(
  accessToken: string,
  date: string,
  userId: string
): Promise<FitbitDayData | null> {
  const rateLimiter = getRateLimiter();

  // Check if we have enough requests (need ~8 for full day)
  const remaining = await rateLimiter.getRemainingRequests(userId, 'fitbit');
  if (remaining < 8) {
    console.log(`Rate limit low (${remaining} remaining), skipping day ${date}`);
    return null;
  }

  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Accept': 'application/json',
  };

  const fetchWithCount = async (url: string): Promise<any> => {
    try {
      const response = await fetch(url, { headers });
      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('RATE_LIMITED');
        }
        return null;
      }
      return response.json();
    } catch (error) {
      if (error instanceof Error && error.message === 'RATE_LIMITED') {
        throw error;
      }
      return null;
    }
  };

  try {
    // Fetch all endpoints in parallel
    const [activities, sleep, heartRate, hrv, weight, spo2, breathingRate, temperature] =
      await Promise.all([
        fetchWithCount(`${FITBIT_API_BASE}/1/user/-/activities/date/${date}.json`),
        fetchWithCount(`${FITBIT_API_BASE}/1.2/user/-/sleep/date/${date}.json`),
        fetchWithCount(`${FITBIT_API_BASE}/1/user/-/activities/heart/date/${date}/1d.json`),
        fetchWithCount(`${FITBIT_API_BASE}/1/user/-/hrv/date/${date}.json`),
        fetchWithCount(`${FITBIT_API_BASE}/1/user/-/body/log/weight/date/${date}.json`),
        fetchWithCount(`${FITBIT_API_BASE}/1/user/-/spo2/date/${date}.json`),
        fetchWithCount(`${FITBIT_API_BASE}/1/user/-/br/date/${date}.json`),
        fetchWithCount(`${FITBIT_API_BASE}/1/user/-/temp/skin/date/${date}.json`),
      ]);

    // Record the 8 API calls
    await rateLimiter.recordRequest(userId, 'fitbit', 8);

    return { activities, sleep, heartRate, hrv, weight, spo2, breathingRate, temperature };
  } catch (error) {
    if (error instanceof Error && error.message === 'RATE_LIMITED') {
      console.warn(`Fitbit rate limit hit for user ${userId}`);
    }
    return null;
  }
}

/**
 * Map Fitbit day data to health metrics for storage
 */
function mapToStorageMetrics(dayData: FitbitDayData, date: string): Partial<HealthMetrics> {
  const activities = dayData.activities;
  const sleep = dayData.sleep;
  const heartRate = dayData.heartRate;
  const hrv = dayData.hrv;
  const weight = dayData.weight;
  const spo2 = dayData.spo2;
  const breathingRate = dayData.breathingRate;
  const temperature = dayData.temperature;

  // Activity metrics
  const activitySummary = activities?.summary || {};
  const steps = activitySummary.steps || null;
  const calories = activitySummary.caloriesOut || null;
  const activeMinutes =
    (activitySummary.fairlyActiveMinutes || 0) + (activitySummary.veryActiveMinutes || 0);

  // Sleep metrics
  const mainSleep = sleep?.sleep?.find((s: any) => s.isMainSleep) || sleep?.sleep?.[0];
  const sleepDuration = mainSleep ? Math.round(mainSleep.duration / 60000) : null; // ms to minutes
  const sleepEfficiency = mainSleep?.efficiency || null;

  // Heart metrics
  const heartData = heartRate?.['activities-heart']?.[0]?.value || {};
  const restingHeartRate = heartData.restingHeartRate || null;
  const heartRateZones = heartData.heartRateZones || [];
  const avgHeartRate = calculateAverageHeartRate(heartRateZones);
  const maxHeartRate = Math.max(...heartRateZones.map((z: any) => z.max || 0), 0) || null;

  // HRV
  const hrvValue = hrv?.hrv?.[0]?.value?.dailyRmssd || null;

  // Weight
  const latestWeight = weight?.weight?.[0];
  const weightKg = latestWeight?.weight || null;

  // SpO2
  const spo2Value = spo2?.value?.avg || null;

  // Breathing rate
  const breathingRateValue = breathingRate?.br?.[0]?.value?.breathingRate || null;

  // Temperature
  const tempValue = temperature?.tempSkin?.[0]?.value?.nightlyRelative || null;

  // Calculate strain from active minutes
  const strain = activeMinutes > 0 ? convertActiveMinutesToStrain(activeMinutes) : null;

  // Calculate sleep score
  const sleepScore = mainSleep ? calculateSleepScore(mainSleep) : null;

  // Calculate recovery score
  const recoveryScore = calculateRecoveryScore(hrvValue, restingHeartRate, sleepScore || 0);

  return {
    steps: steps ?? undefined,
    calories: calories ?? undefined,
    strain: strain ?? undefined,
    sleepDuration: sleepDuration ?? undefined,
    sleepScore: sleepScore ?? undefined,
    restingHeartRate: restingHeartRate ?? undefined,
    averageHeartRate: avgHeartRate ?? undefined,
    maxHeartRate: maxHeartRate ?? undefined,
    hrv: hrvValue ?? undefined,
    spO2: spo2Value ?? undefined,
    respiratoryRate: breathingRateValue ?? undefined,
    weight: weightKg ?? undefined,
    skinTemperature: tempValue ?? undefined,
    recoveryScore: recoveryScore ?? undefined,
  };
}

/**
 * Helper: Calculate average heart rate from zones
 */
function calculateAverageHeartRate(zones: any[]): number | null {
  if (!zones || zones.length === 0) return null;

  let totalMinutes = 0;
  let weightedSum = 0;

  for (const zone of zones) {
    const minutes = zone.minutes || 0;
    const midpoint = ((zone.min || 0) + (zone.max || 0)) / 2;
    weightedSum += midpoint * minutes;
    totalMinutes += minutes;
  }

  return totalMinutes > 0 ? Math.round(weightedSum / totalMinutes) : null;
}

/**
 * Helper: Convert active minutes to strain (0-21 scale like WHOOP)
 */
function convertActiveMinutesToStrain(activeMinutes: number): number {
  if (activeMinutes <= 0) return 0;
  if (activeMinutes <= 30) return Math.round(activeMinutes / 5);
  if (activeMinutes <= 60) return Math.round(6 + (activeMinutes - 30) / 7.5);
  if (activeMinutes <= 120) return Math.round(10 + (activeMinutes - 60) / 12);
  if (activeMinutes <= 180) return Math.round(15 + (activeMinutes - 120) / 15);
  return Math.min(21, Math.round(19 + (activeMinutes - 180) / 30));
}

/**
 * Helper: Calculate sleep score
 */
function calculateSleepScore(sleepData: any): number {
  if (!sleepData) return 0;

  const efficiency = sleepData.efficiency || 0;
  const minutesAsleep = sleepData.minutesAsleep || 0;

  // Duration score (7-8 hours optimal)
  const durationScore = Math.min(100, (minutesAsleep / 450) * 100);

  // Efficiency score (85%+ is good)
  const efficiencyScore = Math.min(100, (efficiency / 85) * 100);

  // Deep + REM score
  const levels = sleepData.levels?.summary || {};
  const deepMinutes = levels.deep?.minutes || 0;
  const remMinutes = levels.rem?.minutes || 0;
  const totalSleep = minutesAsleep || 1;
  const deepRemRatio = (deepMinutes + remMinutes) / totalSleep;
  const qualityScore = Math.min(100, (deepRemRatio / 0.4) * 100);

  return Math.round(durationScore * 0.4 + efficiencyScore * 0.3 + qualityScore * 0.3);
}

/**
 * Helper: Calculate recovery score
 */
function calculateRecoveryScore(
  hrv: number | null,
  rhr: number | null,
  sleepScore: number
): number {
  if (!hrv) {
    return Math.round(sleepScore * 0.8);
  }

  const hrvScore = Math.min(100, (hrv / 80) * 100);

  let rhrScore = 100;
  if (rhr) {
    if (rhr < 50) rhrScore = 100;
    else if (rhr < 60) rhrScore = 90;
    else if (rhr < 70) rhrScore = 75;
    else if (rhr < 80) rhrScore = 60;
    else rhrScore = 40;
  }

  return Math.round(hrvScore * 0.5 + sleepScore * 0.3 + rhrScore * 0.2);
}

/**
 * Store metrics in database
 */
async function storeMetrics(
  userId: string,
  providerId: string,
  date: string,
  metrics: Partial<HealthMetrics>
): Promise<boolean> {
  const supabase = SupabaseClientService.getAdminClient();

  const dataToStore = {
    user_id: userId,
    provider_id: providerId,
    date,
    recovery_score: metrics.recoveryScore,
    sleep_score: metrics.sleepScore,
    strain: metrics.strain,
    hrv: metrics.hrv,
    resting_heart_rate: metrics.restingHeartRate,
    average_heart_rate: metrics.averageHeartRate,
    max_heart_rate: metrics.maxHeartRate,
    calories: metrics.calories,
    steps: metrics.steps,
    sleep_duration_minutes: metrics.sleepDuration,
    spo2: metrics.spO2,
    respiratory_rate: metrics.respiratoryRate,
    weight_kg: metrics.weight,
    skin_temp_deviation: metrics.skinTemperature,
    synced_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('health_metrics').upsert(dataToStore, {
    onConflict: 'user_id,provider_id,date',
  });

  if (error) {
    console.error('Failed to store Fitbit metrics:', error);
    return false;
  }

  return true;
}

/**
 * Poll Fitbit data for a single user
 */
async function pollUserData(
  userId: string,
  providerId: string,
  accessToken: string,
  refreshToken: string,
  daysToFetch: number = 7
): Promise<FitbitPollingResult> {
  const result: FitbitPollingResult = {
    user_id: userId,
    days_fetched: 0,
    metrics_stored: 0,
    last_polled_at: new Date().toISOString(),
    errors: [],
  };

  try {
    // Create provider instance for potential token refresh
    const provider = new FitbitProvider(accessToken, refreshToken, userId, providerId);

    // Validate connection first
    const isValid = await provider.validateConnection();
    if (!isValid) {
      result.errors.push('Connection validation failed');
      return result;
    }

    // Fetch data for each day
    for (let i = 0; i < daysToFetch; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      try {
        const dayData = await fetchDayData(accessToken, dateStr, userId);

        if (!dayData) {
          // Rate limited or error - stop fetching more days
          if (i === 0) {
            result.errors.push('Rate limited on first day');
          }
          break;
        }

        const metrics = mapToStorageMetrics(dayData, dateStr);
        const stored = await storeMetrics(userId, providerId, dateStr, metrics);

        if (stored) {
          result.days_fetched++;
          result.metrics_stored++;
        }

        // Small delay between days to be nice to the API
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (dayError) {
        result.errors.push(`Day ${dateStr}: ${dayError instanceof Error ? dayError.message : String(dayError)}`);
      }
    }

    // Update last_polled_at on provider record
    const supabase = SupabaseClientService.getAdminClient();
    await supabase
      .from('user_health_providers')
      .update({ last_polled_at: result.last_polled_at })
      .eq('id', providerId);

    console.log(`✅ Fitbit polling completed for user ${userId}:`, result);

    return result;
  } catch (error) {
    result.errors.push(`Critical: ${error instanceof Error ? error.message : String(error)}`);
    console.error(`❌ Fitbit polling failed for user ${userId}:`, error);
    return result;
  }
}

/**
 * Run Fitbit polling for all active users
 */
export async function runFitbitBackupPolling(): Promise<{
  total_users: number;
  successful: number;
  failed: number;
  total_data_points: number;
  errors: string[];
}> {
  console.log('🔄 Starting Fitbit backup polling job...');

  const supabase = SupabaseClientService.getAdminClient();
  const results = {
    total_users: 0,
    successful: 0,
    failed: 0,
    total_data_points: 0,
    errors: [] as string[],
  };

  try {
    // Get all active Fitbit providers
    const { data: providers, error } = await supabase
      .from('user_health_providers')
      .select('id, user_id, access_token, refresh_token')
      .eq('provider_name', 'fitbit')
      .eq('is_active', true);

    if (error) {
      const errMsg = `Failed to fetch Fitbit providers: ${error.message}`;
      results.errors.push(errMsg);
      console.error(errMsg);
      return results;
    }

    if (!providers || providers.length === 0) {
      console.log('No active Fitbit providers found');
      return results;
    }

    results.total_users = providers.length;

    // Poll each user sequentially to manage rate limits
    // Fitbit: 150 requests/hour per user
    for (const provider of providers) {
      try {
        const result = await pollUserData(
          provider.user_id,
          provider.id,
          provider.access_token,
          provider.refresh_token
        );

        if (result.errors.length === 0) {
          results.successful++;
        } else {
          results.failed++;
          results.errors.push(`User ${provider.user_id}: ${result.errors.join('; ')}`);
        }

        results.total_data_points += result.metrics_stored;

        // Delay between users to be safe
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (userError) {
        results.failed++;
        const errMsg = `User ${provider.user_id}: ${userError instanceof Error ? userError.message : String(userError)}`;
        results.errors.push(errMsg);
        console.error(errMsg);
      }
    }

    console.log(
      `✅ Fitbit backup polling completed: ${results.successful}/${results.total_users} users, ${results.total_data_points} data points fetched`
    );

    return results;
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    results.errors.push(`Critical error: ${errMsg}`);
    console.error('❌ Critical error in Fitbit backup polling:', error);
    return results;
  }
}

/**
 * Run polling for a specific user (on-demand)
 */
export async function runFitbitPollingForUser(
  userId: string,
  daysToFetch: number = 7
): Promise<FitbitPollingResult> {
  const supabase = SupabaseClientService.getAdminClient();

  const { data: provider, error } = await supabase
    .from('user_health_providers')
    .select('id, access_token, refresh_token')
    .eq('user_id', userId)
    .eq('provider_name', 'fitbit')
    .eq('is_active', true)
    .single();

  if (error || !provider) {
    throw new Error('Fitbit provider not found for user');
  }

  return pollUserData(userId, provider.id, provider.access_token, provider.refresh_token, daysToFetch);
}

export default {
  runFitbitBackupPolling,
  runFitbitPollingForUser,
};
