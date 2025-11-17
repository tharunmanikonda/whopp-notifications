import axios, { AxiosInstance } from 'axios';
import { config } from '../config/index.js';
import { TokenStorage } from './token-storage.js';
import {
  WhoopRecovery,
  WhoopSleep,
  WhoopCycle,
  WhoopWorkout,
  DailyHealthData,
} from '../types/index.js';

export class WhoopClient {
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

  /**
   * Refresh the access token using the refresh token
   */
  async refreshAccessToken(): Promise<void> {
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

      if (process.env.NODE_ENV !== 'production') console.log('Access token refreshed successfully');
    } catch (error) {
      console.error('Failed to refresh access token:', error);
      throw error;
    }
  }

  /**
   * Get the latest recovery data
   */
  async getLatestRecovery(): Promise<WhoopRecovery | null> {
    try {
      const response = await this.client.get('/v2/recovery', {
        params: {
          limit: 1,
        },
      });

      const records = response.data.records;
      return records && records.length > 0 ? records[0] : null;
    } catch (error: any) {
      if (error.response?.status === 401) {
        await this.refreshAccessToken();
        return this.getLatestRecovery();
      }
      console.error('Failed to fetch recovery data:', error);
      return null;
    }
  }

  /**
   * Get the latest sleep data
   */
  async getLatestSleep(): Promise<WhoopSleep | null> {
    try {
      const response = await this.client.get('/v2/activity/sleep', {
        params: {
          limit: 1,
        },
      });

      const records = response.data.records;
      return records && records.length > 0 ? records[0] : null;
    } catch (error: any) {
      if (error.response?.status === 401) {
        await this.refreshAccessToken();
        return this.getLatestSleep();
      }
      console.error('Failed to fetch sleep data:', error);
      return null;
    }
  }

  /**
   * Get today's cycle data
   */
  async getTodayCycle(): Promise<WhoopCycle | null> {
    try {
      const response = await this.client.get('/v2/cycle', {
        params: {
          limit: 1,
        },
      });

      const records = response.data.records;
      return records && records.length > 0 ? records[0] : null;
    } catch (error: any) {
      if (error.response?.status === 401) {
        await this.refreshAccessToken();
        return this.getTodayCycle();
      }
      console.error('Failed to fetch cycle data:', error);
      return null;
    }
  }

  /**
   * Get recent workouts (last 3 days)
   */
  async getRecentWorkouts(limit: number = 5): Promise<WhoopWorkout[]> {
    try {
      const response = await this.client.get('/v2/activity/workout', {
        params: {
          limit,
        },
      });

      return response.data.records || [];
    } catch (error: any) {
      if (error.response?.status === 401) {
        await this.refreshAccessToken();
        return this.getRecentWorkouts(limit);
      }
      console.error('Failed to fetch workout data:', error);
      return [];
    }
  }

  /**
   * Get comprehensive daily health data
   */
  async getDailyHealthData(): Promise<DailyHealthData> {
    const [recovery, sleep, todayCycle, recentWorkouts] = await Promise.all([
      this.getLatestRecovery(),
      this.getLatestSleep(),
      this.getTodayCycle(),
      this.getRecentWorkouts(5),
    ]);

    return {
      recovery: recovery || undefined,
      sleep: sleep || undefined,
      todayCycle: todayCycle || undefined,
      recentWorkouts: recentWorkouts.length > 0 ? recentWorkouts : undefined,
      userName: config.user.name,
      timestamp: new Date().toISOString(),
    };
  }
}
