import axios, { AxiosInstance, AxiosError } from 'axios';
import { HealthDataProvider, HealthMetrics } from '../../types/health-provider.js';
import { RateLimiter, getRateLimiter } from '../rate-limiter.js';
import { config } from '../../config/index.js';
import SupabaseClientService from '../supabase-client.js';

const FITBIT_API_BASE = 'https://api.fitbit.com';

/**
 * Fitbit Health Data Provider
 *
 * Features:
 * - Full health data tracking (activity, sleep, heart rate, HRV, SpO2, weight, etc.)
 * - Rate limiting (150 requests/hour per user)
 * - Automatic token refresh (CRITICAL: Fitbit refresh tokens are single-use!)
 * - Error handling with 401 auto-refresh
 */
export class FitbitProvider implements HealthDataProvider {
  private client: AxiosInstance;
  private accessToken: string;
  private refreshToken: string;
  private userId: string;
  private providerId: string;
  private rateLimiter: RateLimiter;
  private requestCount: number = 0;

  /**
   * Create a FitbitProvider instance
   *
   * For database-backed mode (production): Pass all 4 parameters
   * For env-based mode (development/testing): Pass no parameters
   */
  constructor(
    accessToken?: string,
    refreshToken?: string,
    userId?: string,
    providerId?: string
  ) {
    // If no args provided, try to load from environment (for backward compatibility)
    this.accessToken = accessToken || '';
    this.refreshToken = refreshToken || '';
    this.userId = userId || 'env-user';
    this.providerId = providerId || 'env-provider';
    this.rateLimiter = getRateLimiter();

    this.client = axios.create({
      baseURL: FITBIT_API_BASE,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Accept': 'application/json',
      },
    });

    // Add response interceptor for token refresh on 401
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401 && !error.config?.headers?.['X-Retry']) {
          console.log('Fitbit token expired, refreshing...');
          try {
            await this.refreshAccessToken();
            // Retry the original request with new token
            const originalRequest = error.config!;
            originalRequest.headers['Authorization'] = `Bearer ${this.accessToken}`;
            originalRequest.headers['X-Retry'] = 'true';
            return this.client(originalRequest);
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            throw refreshError;
          }
        }
        throw error;
      }
    );
  }

  getName(): string {
    return 'fitbit';
  }

  isConfigured(): boolean {
    return !!this.accessToken && !!this.refreshToken;
  }

  /**
   * Validate connection by fetching user profile
   */
  async validateConnection(): Promise<boolean> {
    try {
      const canRequest = await this.rateLimiter.canMakeRequest(this.userId, 'fitbit');
      if (!canRequest) {
        console.warn('Rate limit reached, skipping validation');
        return true; // Assume valid if rate limited
      }

      await this.client.get('/1/user/-/profile.json');
      await this.rateLimiter.recordRequest(this.userId, 'fitbit');
      return true;
    } catch (error) {
      console.error('Fitbit connection validation failed:', error);
      return false;
    }
  }

  /**
   * CRITICAL: Refresh access token
   * Fitbit issues a NEW refresh token on each use - must save immediately!
   */
  async refreshAccessToken(): Promise<void> {
    const basicAuth = Buffer.from(
      `${config.fitbit.clientId}:${config.fitbit.clientSecret}`
    ).toString('base64');

    const response = await fetch(`${FITBIT_API_BASE}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
      }).toString(),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Fitbit token refresh failed:', error);
      throw new Error('Failed to refresh Fitbit token');
    }

    const data = await response.json() as any;

    // BOTH tokens change with Fitbit!
    this.accessToken = data.access_token;
    this.refreshToken = data.refresh_token;

    // Update axios client with new token
    this.client.defaults.headers['Authorization'] = `Bearer ${this.accessToken}`;

    // MUST save to database immediately - refresh token is single-use
    const supabase = SupabaseClientService.getAdminClient();
    const { error: updateError } = await supabase
      .from('user_health_providers')
      .update({
        access_token: this.accessToken,
        refresh_token: this.refreshToken,
        updated_at: new Date().toISOString(),
      })
      .eq('id', this.providerId);

    if (updateError) {
      console.error('Failed to save new Fitbit tokens:', updateError);
      throw new Error('Failed to save refreshed tokens');
    }

    console.log('Fitbit tokens refreshed and saved successfully');
  }

  /**
   * Get all health metrics for today
   */
  async getMetrics(): Promise<HealthMetrics | null> {
    try {
      // Check rate limit first
      const canRequest = await this.rateLimiter.canMakeRequest(this.userId, 'fitbit');
      if (!canRequest) {
        console.warn(`Fitbit rate limit reached for user ${this.userId}`);
        return null;
      }

      const today = new Date().toISOString().split('T')[0];
      this.requestCount = 0;

      // Fetch all data in parallel (counts as multiple requests)
      const [
        activities,
        sleep,
        heartRate,
        hrv,
        weight,
        spo2,
        breathingRate,
        temperature,
      ] = await Promise.all([
        this.fetchActivities(today),
        this.fetchSleep(today),
        this.fetchHeartRate(today),
        this.fetchHRV(today),
        this.fetchWeight(today),
        this.fetchSpO2(today),
        this.fetchBreathingRate(today),
        this.fetchTemperature(today),
      ]);

      // Record all the API calls we made
      await this.rateLimiter.recordRequest(this.userId, 'fitbit', this.requestCount);

      return this.mapToHealthMetrics(
        activities,
        sleep,
        heartRate,
        hrv,
        weight,
        spo2,
        breathingRate,
        temperature
      );
    } catch (error) {
      console.error('Failed to fetch Fitbit metrics:', error);
      return null;
    }
  }

  /**
   * Fetch activity summary for a date
   */
  private async fetchActivities(date: string): Promise<any> {
    try {
      const response = await this.client.get(`/1/user/-/activities/date/${date}.json`);
      this.requestCount++;
      return response.data;
    } catch (error) {
      console.warn('Failed to fetch Fitbit activities:', error);
      return null;
    }
  }

  /**
   * Fetch sleep data for a date
   */
  private async fetchSleep(date: string): Promise<any> {
    try {
      const response = await this.client.get(`/1.2/user/-/sleep/date/${date}.json`);
      this.requestCount++;
      return response.data;
    } catch (error) {
      console.warn('Failed to fetch Fitbit sleep:', error);
      return null;
    }
  }

  /**
   * Fetch heart rate data for a date
   */
  private async fetchHeartRate(date: string): Promise<any> {
    try {
      const response = await this.client.get(`/1/user/-/activities/heart/date/${date}/1d.json`);
      this.requestCount++;
      return response.data;
    } catch (error) {
      console.warn('Failed to fetch Fitbit heart rate:', error);
      return null;
    }
  }

  /**
   * Fetch HRV data for a date
   */
  private async fetchHRV(date: string): Promise<any> {
    try {
      const response = await this.client.get(`/1/user/-/hrv/date/${date}.json`);
      this.requestCount++;
      return response.data;
    } catch (error) {
      console.warn('Failed to fetch Fitbit HRV:', error);
      return null;
    }
  }

  /**
   * Fetch weight data for a date
   */
  private async fetchWeight(date: string): Promise<any> {
    try {
      const response = await this.client.get(`/1/user/-/body/log/weight/date/${date}.json`);
      this.requestCount++;
      return response.data;
    } catch (error) {
      console.warn('Failed to fetch Fitbit weight:', error);
      return null;
    }
  }

  /**
   * Fetch SpO2 data for a date
   */
  private async fetchSpO2(date: string): Promise<any> {
    try {
      const response = await this.client.get(`/1/user/-/spo2/date/${date}.json`);
      this.requestCount++;
      return response.data;
    } catch (error) {
      console.warn('Failed to fetch Fitbit SpO2:', error);
      return null;
    }
  }

  /**
   * Fetch breathing rate for a date
   */
  private async fetchBreathingRate(date: string): Promise<any> {
    try {
      const response = await this.client.get(`/1/user/-/br/date/${date}.json`);
      this.requestCount++;
      return response.data;
    } catch (error) {
      console.warn('Failed to fetch Fitbit breathing rate:', error);
      return null;
    }
  }

  /**
   * Fetch skin temperature for a date
   */
  private async fetchTemperature(date: string): Promise<any> {
    try {
      const response = await this.client.get(`/1/user/-/temp/skin/date/${date}.json`);
      this.requestCount++;
      return response.data;
    } catch (error) {
      console.warn('Failed to fetch Fitbit temperature:', error);
      return null;
    }
  }

  /**
   * Map Fitbit API responses to unified HealthMetrics format
   */
  private mapToHealthMetrics(
    activities: any,
    sleep: any,
    heartRate: any,
    hrv: any,
    weight: any,
    spo2: any,
    breathingRate: any,
    temperature: any
  ): HealthMetrics {
    // Extract activity data
    const activitySummary = activities?.summary || {};
    const steps = activitySummary.steps || 0;
    const calories = activitySummary.caloriesOut || 0;
    const distance = (activitySummary.distances?.find((d: any) => d.activity === 'total')?.distance || 0) * 1000; // km to meters
    const activeMinutes = (activitySummary.fairlyActiveMinutes || 0) + (activitySummary.veryActiveMinutes || 0);

    // Extract sleep data
    const mainSleep = sleep?.sleep?.find((s: any) => s.isMainSleep) || sleep?.sleep?.[0];
    const sleepDuration = mainSleep ? mainSleep.duration / 60000 : 0; // ms to minutes
    const sleepScore = this.calculateSleepScore(mainSleep);
    const sleepQuality = this.getSleepQuality(sleepScore);

    // Extract heart rate data
    const heartData = heartRate?.['activities-heart']?.[0]?.value || {};
    const restingHeartRate = heartData.restingHeartRate || null;
    const heartRateZones = heartData.heartRateZones || [];
    const maxHeartRate = Math.max(...heartRateZones.map((z: any) => z.max || 0), 0) || null;
    const avgHeartRate = this.calculateAverageHeartRate(heartRateZones);

    // Extract HRV
    const hrvValue = hrv?.hrv?.[0]?.value?.dailyRmssd || null;

    // Extract weight data
    const latestWeight = weight?.weight?.[0];
    const weightKg = latestWeight?.weight || null;
    const bmi = latestWeight?.bmi || null;
    const bodyFat = latestWeight?.fat || null;

    // Extract SpO2
    const spo2Value = spo2?.value?.avg || null;

    // Extract breathing rate
    const breathingRateValue = breathingRate?.br?.[0]?.value?.breathingRate || null;

    // Extract temperature (relative to baseline)
    const tempValue = temperature?.tempSkin?.[0]?.value?.nightlyRelative || null;

    // Calculate activity score (0-100 based on goals)
    const activityScore = this.calculateActivityScore(activitySummary);

    return {
      provider: 'fitbit',
      timestamp: new Date().toISOString(),

      // Activity
      steps,
      distance,
      calories,
      activityScore,
      strain: this.convertActiveMinutesToStrain(activeMinutes),

      // Sleep
      sleepDuration,
      sleepScore,
      sleepQuality,

      // Heart
      restingHeartRate,
      averageHeartRate: avgHeartRate ?? undefined,
      maxHeartRate: maxHeartRate ?? undefined,
      hrv: hrvValue,

      // Respiratory
      spO2: spo2Value,
      respiratoryRate: breathingRateValue,

      // Body
      weight: weightKg ?? undefined,
      bmi: bmi ?? undefined,
      bodyFat: bodyFat ?? undefined,

      // Temperature (Fitbit reports relative change from baseline)
      skinTemperature: tempValue ?? undefined,

      // Recovery score based on HRV and RHR
      recoveryScore: this.calculateRecoveryScore(hrvValue, restingHeartRate, sleepScore),
    };
  }

  /**
   * Calculate sleep score from Fitbit sleep data
   */
  private calculateSleepScore(sleepData: any): number {
    if (!sleepData) return 0;

    const duration = sleepData.duration || 0;
    const efficiency = sleepData.efficiency || 0;
    const minutesAsleep = sleepData.minutesAsleep || 0;

    // Optimal sleep is 7-8 hours (420-480 minutes)
    const durationScore = Math.min(100, (minutesAsleep / 450) * 100);

    // Efficiency score (85%+ is good)
    const efficiencyScore = Math.min(100, (efficiency / 85) * 100);

    // Deep + REM sleep should be ~20% each
    const levels = sleepData.levels?.summary || {};
    const deepMinutes = levels.deep?.minutes || 0;
    const remMinutes = levels.rem?.minutes || 0;
    const totalSleep = minutesAsleep || 1;
    const deepRemRatio = (deepMinutes + remMinutes) / totalSleep;
    const qualityScore = Math.min(100, (deepRemRatio / 0.4) * 100);

    // Weighted average
    return Math.round(durationScore * 0.4 + efficiencyScore * 0.3 + qualityScore * 0.3);
  }

  /**
   * Convert sleep score to quality label
   */
  private getSleepQuality(score: number): string {
    if (score >= 85) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'fair';
    return 'poor';
  }

  /**
   * Calculate average heart rate from heart rate zones
   */
  private calculateAverageHeartRate(zones: any[]): number | null {
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
   * Calculate activity score based on goals
   */
  private calculateActivityScore(summary: any): number {
    // Assume default goals if not available
    const stepGoal = 10000;
    const activeMinuteGoal = 30;

    const steps = summary.steps || 0;
    const activeMinutes = (summary.fairlyActiveMinutes || 0) + (summary.veryActiveMinutes || 0);

    const stepScore = Math.min(100, (steps / stepGoal) * 100);
    const activeScore = Math.min(100, (activeMinutes / activeMinuteGoal) * 100);

    return Math.round((stepScore + activeScore) / 2);
  }

  /**
   * Convert active minutes to a WHOOP-like strain score (0-21)
   */
  private convertActiveMinutesToStrain(activeMinutes: number): number {
    // Rough conversion: 60 active minutes = ~10 strain, 120 = ~15, 180+ = ~20
    if (activeMinutes <= 0) return 0;
    if (activeMinutes <= 30) return activeMinutes / 5; // 0-6
    if (activeMinutes <= 60) return 6 + (activeMinutes - 30) / 7.5; // 6-10
    if (activeMinutes <= 120) return 10 + (activeMinutes - 60) / 12; // 10-15
    if (activeMinutes <= 180) return 15 + (activeMinutes - 120) / 15; // 15-19
    return Math.min(21, 19 + (activeMinutes - 180) / 30); // 19-21
  }

  /**
   * Calculate recovery score based on HRV, RHR, and sleep
   */
  private calculateRecoveryScore(
    hrv: number | null,
    rhr: number | null,
    sleepScore: number
  ): number {
    // If no HRV, use sleep score with adjustment
    if (!hrv) {
      return Math.round(sleepScore * 0.8);
    }

    // HRV-based score (higher HRV = better recovery)
    // Assume baseline of 50ms, with 100ms being excellent
    const hrvScore = Math.min(100, (hrv / 80) * 100);

    // RHR-based score (lower is generally better, assuming baseline of 60)
    let rhrScore = 100;
    if (rhr) {
      if (rhr < 50) rhrScore = 100;
      else if (rhr < 60) rhrScore = 90;
      else if (rhr < 70) rhrScore = 75;
      else if (rhr < 80) rhrScore = 60;
      else rhrScore = 40;
    }

    // Combined score
    return Math.round(hrvScore * 0.5 + sleepScore * 0.3 + rhrScore * 0.2);
  }
}
