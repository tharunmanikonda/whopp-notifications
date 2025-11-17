import axios, { AxiosInstance } from 'axios';
import { config } from '../../config/index.js';
import { TokenStorage } from '../token-storage.js';
import { HealthDataProvider, HealthMetrics } from '../../types/health-provider.js';

/**
 * Whoop Health Data Provider
 * Implements HealthDataProvider interface for flexible multi-provider support
 */
export class WhoopProvider implements HealthDataProvider {
  private client: AxiosInstance;
  private accessToken: string;
  private refreshToken: string;
  private tokenStorage: TokenStorage;

  constructor() {
    this.tokenStorage = new TokenStorage();

    // Try to load tokens from storage first, fall back to .env
    const storedTokens = this.tokenStorage.loadTokens();
    if (storedTokens) {
      this.accessToken = storedTokens.accessToken;
      this.refreshToken = storedTokens.refreshToken;
    } else {
      this.accessToken = config.whoop.accessToken;
      this.refreshToken = config.whoop.refreshToken;
    }

    this.client = axios.create({
      baseURL: 'https://api.prod.whoop.com/developer',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  getName(): string {
    return 'whoop';
  }

  isConfigured(): boolean {
    return !!this.accessToken && !!this.refreshToken;
  }

  async validateConnection(): Promise<boolean> {
    try {
      await this.client.get('/v2/user/profile/basic');
      return true;
    } catch (error: any) {
      if (error.response?.status === 401) {
        try {
          await this.refreshAccessToken();
          return true;
        } catch {
          return false;
        }
      }
      return false;
    }
  }

  async getMetrics(): Promise<HealthMetrics | null> {
    try {
      const [recoveryRes, sleepRes, cycleRes] = await Promise.all([
        this.fetchWithRetry(() => this.client.get('/v2/recovery', { params: { limit: 1 } })),
        this.fetchWithRetry(() => this.client.get('/v2/activity/sleep', { params: { limit: 1 } })),
        this.fetchWithRetry(() => this.client.get('/v2/cycle', { params: { limit: 1 } })),
      ]);

      const recoveryData = recoveryRes?.data?.records?.[0];
      const sleepData = sleepRes?.data?.records?.[0];
      const cycleData = cycleRes?.data?.records?.[0];

      const recoveryScore = recoveryData?.score?.recovery_score || 0;
      const restingHeartRate = recoveryData?.score?.resting_heart_rate || 0;
      const hrv = recoveryData?.score?.hrv_rmssd_milli || 0;

      const sleepDuration = sleepData?.score?.stage_summary?.total_in_bed_time_milli / 60000 || 0;
      const sleepScore = sleepData?.score?.sleep_performance_percentage || 0;

      const strain = cycleData?.score?.strain || 0;

      return {
        provider: 'whoop',
        timestamp: new Date().toISOString(),
        recoveryScore,
        restingHeartRate,
        hrv,
        sleepDuration,
        sleepScore,
        strain,
      };
    } catch (error) {
      console.error('Failed to fetch Whoop metrics:', error);
      return null;
    }
  }

  /**
   * Fetch with automatic retry on 401 (token refresh)
   */
  private async fetchWithRetry(
    fetch: () => Promise<any>
  ): Promise<any> {
    try {
      return await fetch();
    } catch (error: any) {
      if (error.response?.status === 401) {
        await this.refreshAccessToken();
        return fetch();
      }
      throw error;
    }
  }

  /**
   * Refresh the access token using the refresh token
   */
  private async refreshAccessToken(): Promise<void> {
    try {
      const response = await axios.post(
        'https://api.prod.whoop.com/oauth/oauth2/token',
        {
          grant_type: 'refresh_token',
          refresh_token: this.refreshToken,
          client_id: config.whoop.clientId,
          client_secret: config.whoop.clientSecret,
        },
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );

      this.accessToken = response.data.access_token;
      this.refreshToken = response.data.refresh_token;

      // Update the client headers
      this.client.defaults.headers.common['Authorization'] = `Bearer ${this.accessToken}`;

      // Save tokens to storage for persistence
      this.tokenStorage.saveTokens(this.accessToken, this.refreshToken);

      console.log('✅ Whoop access token refreshed and saved');
    } catch (error) {
      console.error('Failed to refresh Whoop token:', error);
      throw error;
    }
  }
}
