import axios, { AxiosInstance } from 'axios';
import { HealthDataProvider, HealthMetrics } from '../../types/health-provider.js';

/**
 * Fitbit Health Data Provider
 * Requires: FITBIT_ACCESS_TOKEN in environment
 */
export class FitbitProvider implements HealthDataProvider {
  private client: AxiosInstance;
  private accessToken: string;

  constructor(accessToken?: string) {
    this.accessToken = accessToken || process.env.FITBIT_ACCESS_TOKEN || '';

    this.client = axios.create({
      baseURL: 'https://api.fitbit.com/1.1/user/-',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Accept': 'application/json',
      },
    });
  }

  getName(): string {
    return 'fitbit';
  }

  isConfigured(): boolean {
    return !!this.accessToken;
  }

  async validateConnection(): Promise<boolean> {
    try {
      await this.client.get('/profile.json');
      return true;
    } catch {
      return false;
    }
  }

  async getMetrics(): Promise<HealthMetrics | null> {
    try {
      const [stepsRes, heartRateRes, sleepRes] = await Promise.all([
        this.client.get('/activities/date/today.json'),
        this.client.get('/activities/heart/date/today/1d.json'),
        this.client.get('/sleep/date/today.json'),
      ]);

      const steps = stepsRes.data.summary?.steps || 0;
      const distance = stepsRes.data.summary?.distance || 0;
      const calories = stepsRes.data.summary?.caloriesBurned || 0;

      const heartRateData = heartRateRes.data?.['activities-heart']?.[0];
      const resting = heartRateData?.value?.restingHeartRate;
      const maxHR = heartRateData?.value?.heartRateZones?.find((z: any) => z.name === 'Out of Range')?.max || 0;

      const sleepData = sleepRes.data?.sleep?.[0];
      const sleepDuration = sleepData?.duration / 60000 || 0; // Convert milliseconds to minutes
      const sleepScore = this.calculateFitbitSleepScore(sleepData);

      return {
        provider: 'fitbit',
        timestamp: new Date().toISOString(),
        steps,
        distance: distance * 1000, // Convert km to meters
        calories,
        restingHeartRate: resting,
        maxHeartRate: maxHR,
        sleepDuration,
        sleepScore,
      };
    } catch (error) {
      console.error('Failed to fetch Fitbit metrics:', error);
      return null;
    }
  }

  /**
   * Calculate a 0-100 sleep score from Fitbit data
   */
  private calculateFitbitSleepScore(sleepData: any): number {
    if (!sleepData) return 0;

    const duration = sleepData.duration || 0;
    const efficiency = sleepData.efficiency || 0;

    // Score based on duration (7-8 hours optimal) and efficiency (>85% optimal)
    const durationScore = Math.min(100, (duration / (8 * 60000)) * 100);
    const efficiencyScore = efficiency;

    // Average of both factors
    return Math.round((durationScore + efficiencyScore) / 2);
  }
}
