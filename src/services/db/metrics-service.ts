import SupabaseClientService from '../supabase-client.js';
import { HealthMetrics } from '../../types/health-provider.js';

/**
 * Health Metrics Database Service
 * Handles storage and retrieval of health data
 */
export class MetricsService {
  /**
   * Store health metrics for a user
   */
  async storeMetrics(
    userId: string,
    providerId: string,
    metrics: HealthMetrics,
    rawData?: any
  ): Promise<void> {
    try {
      const supabase = SupabaseClientService.getClient();
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

      const { error } = await supabase
        .from('health_metrics')
        .upsert(
          {
            user_id: userId,
            provider_id: providerId,
            date: today,
            recovery_score: metrics.recoveryScore,
            readiness_score: metrics.readinessScore,
            sleep_duration: metrics.sleepDuration,
            sleep_score: metrics.sleepScore,
            sleep_quality: this.calculateSleepQuality(metrics.sleepScore),
            strain: metrics.strain,
            activity_score: metrics.activityScore,
            steps: metrics.steps,
            distance: metrics.distance,
            calories: metrics.calories,
            resting_heart_rate: metrics.restingHeartRate,
            average_heart_rate: metrics.averageHeartRate,
            max_heart_rate: metrics.maxHeartRate,
            hrv: metrics.hrv,
            hrv_status: this.calculateHRVStatus(metrics.hrv),
            spo2: metrics.spO2,
            stress_level: metrics.stressLevel,
            raw_data: rawData || {},
            synced_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id,provider_id,date',
          }
        );

      if (error) {
        console.error('Failed to store metrics:', error);
        throw error;
      }

      console.log(`✅ Stored metrics for user ${userId} from provider ${providerId}`);
    } catch (error) {
      console.error('Error storing metrics:', error);
      throw error;
    }
  }

  /**
   * Get last 30 days of health metrics for a user
   * Used for AI context and trend analysis
   */
  async getRecentMetrics(userId: string, days: number = 30): Promise<any[]> {
    try {
      const supabase = SupabaseClientService.getClient();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - days);

      const { data, error } = await supabase
        .from('health_metrics')
        .select('*')
        .eq('user_id', userId)
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (error) {
        console.error('Failed to fetch recent metrics:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching recent metrics:', error);
      throw error;
    }
  }

  /**
   * Get today's aggregated metrics for a user (across all providers)
   */
  async getTodayMetrics(userId: string): Promise<any> {
    try {
      const supabase = SupabaseClientService.getClient();
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('health_metrics')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .order('synced_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch today metrics:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching today metrics:', error);
      throw error;
    }
  }

  /**
   * Calculate sleep quality category
   */
  private calculateSleepQuality(score?: number): string {
    if (!score) return 'unknown';
    if (score >= 85) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'fair';
    return 'poor';
  }

  /**
   * Calculate HRV status category
   */
  private calculateHRVStatus(hrv?: number): string {
    if (!hrv) return 'unknown';
    if (hrv >= 50) return 'high';
    if (hrv >= 25) return 'balanced';
    return 'low';
  }

  /**
   * Calculate data completeness percentage
   * How many health metrics we have for a day
   */
  calculateCompleteness(metrics: any): number {
    const fields = [
      'recovery_score',
      'sleep_score',
      'strain',
      'steps',
      'resting_heart_rate',
      'hrv',
      'sleep_duration',
      'calories',
      'activity_score',
      'stress_level',
      'spo2',
    ];

    const filledFields = fields.filter((field) => metrics[field] !== null && metrics[field] !== undefined).length;
    return Math.round((filledFields / fields.length) * 100);
  }

  /**
   * Get health trends for a user
   * Compares current week vs previous week
   */
  async getHealthTrends(userId: string): Promise<{
    recovery_trend: string;
    sleep_trend: string;
    activity_trend: string;
  }> {
    try {
      const supabase = SupabaseClientService.getClient();
      const today = new Date();
      const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const fourteenDaysAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);

      // Current week
      const { data: currentWeek } = await supabase
        .from('health_metrics')
        .select('recovery_score, sleep_score, steps')
        .eq('user_id', userId)
        .gte('date', sevenDaysAgo.toISOString().split('T')[0])
        .lt('date', today.toISOString().split('T')[0]);

      // Previous week
      const { data: previousWeek } = await supabase
        .from('health_metrics')
        .select('recovery_score, sleep_score, steps')
        .eq('user_id', userId)
        .gte('date', fourteenDaysAgo.toISOString().split('T')[0])
        .lt('date', sevenDaysAgo.toISOString().split('T')[0]);

      const avgCurrent = this.averageMetrics(currentWeek || []);
      const avgPrevious = this.averageMetrics(previousWeek || []);

      return {
        recovery_trend: this.compareTrends(avgCurrent.recovery, avgPrevious.recovery),
        sleep_trend: this.compareTrends(avgCurrent.sleep, avgPrevious.sleep),
        activity_trend: this.compareTrends(avgCurrent.steps, avgPrevious.steps),
      };
    } catch (error) {
      console.error('Error fetching health trends:', error);
      return {
        recovery_trend: 'stable',
        sleep_trend: 'stable',
        activity_trend: 'stable',
      };
    }
  }

  /**
   * Helper to average metrics
   */
  private averageMetrics(data: any[]): { recovery: number; sleep: number; steps: number } {
    if (data.length === 0) return { recovery: 0, sleep: 0, steps: 0 };

    const recovery =
      data.reduce((sum, d) => sum + (d.recovery_score || 0), 0) / data.length;
    const sleep =
      data.reduce((sum, d) => sum + (d.sleep_score || 0), 0) / data.length;
    const steps =
      data.reduce((sum, d) => sum + (d.steps || 0), 0) / data.length;

    return { recovery, sleep, steps };
  }

  /**
   * Compare two values to determine trend
   */
  private compareTrends(current: number, previous: number): string {
    if (current > previous * 1.05) return 'improving';
    if (current < previous * 0.95) return 'declining';
    return 'stable';
  }
}
