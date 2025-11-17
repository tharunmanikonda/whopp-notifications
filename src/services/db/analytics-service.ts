import SupabaseClientService from '../supabase-client.js';

/**
 * User Analytics Database Service
 * Calculates and stores aggregated analytics for dashboards
 */
export class AnalyticsService {
  /**
   * Calculate and store daily analytics for a user
   * Should be called once daily after health data is synced
   */
  async calculateDailyAnalytics(userId: string): Promise<void> {
    try {
      const supabase = SupabaseClientService.getAdminClient();
      const today = new Date().toISOString().split('T')[0];
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Fetch last 30 days of health metrics
      const { data: metrics, error: metricsError } = await supabase
        .from('health_metrics')
        .select('*')
        .eq('user_id', userId)
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (metricsError) throw metricsError;

      const data = metrics || [];
      if (data.length === 0) {
        console.warn(`No metrics found for user ${userId} to calculate analytics`);
        return;
      }

      // Calculate averages
      const getAverage = (field: string) => {
        const values = data
          .map((m: any) => m[field])
          .filter((v) => v !== null && v !== undefined);
        return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null;
      };

      const avgRecovery = getAverage('recovery_score');
      const avgSleep = getAverage('sleep_score');
      const avgSleepDuration = getAverage('sleep_duration');
      const avgStrain = getAverage('strain');
      const avgRHR = getAverage('resting_heart_rate');
      const avgHRV = getAverage('hrv');
      const avgSteps = getAverage('steps');
      const avgCalories = getAverage('calories');

      // Calculate trends (comparing first half vs second half of period)
      const midpoint = Math.floor(data.length / 2);
      const recentHalf = data.slice(0, midpoint);
      const olderHalf = data.slice(midpoint);

      const getTrend = (field: string, recent: any[], older: any[]): string => {
        const avgRecent =
          recent.length > 0
            ? recent
                .map((m: any) => m[field])
                .filter((v) => v !== null && v !== undefined)
                .reduce((a, b) => a + b, 0) / recent.length
            : 0;

        const avgOlder =
          older.length > 0
            ? older
                .map((m: any) => m[field])
                .filter((v) => v !== null && v !== undefined)
                .reduce((a, b) => a + b, 0) / older.length
            : 0;

        if (avgRecent > avgOlder * 1.05) return 'improving';
        if (avgRecent < avgOlder * 0.95) return 'declining';
        return 'stable';
      };

      const recoveryTrend = getTrend('recovery_score', recentHalf, olderHalf);
      const sleepTrend = getTrend('sleep_score', recentHalf, olderHalf);
      const activityTrend = getTrend('steps', recentHalf, olderHalf);

      // Find best and worst days
      const sortedByRecovery = [...data].sort((a, b) => (b.recovery_score || 0) - (a.recovery_score || 0));
      const sortedBySteps = [...data].sort((a, b) => (b.steps || 0) - (a.steps || 0));

      const bestRecoveryDay = sortedByRecovery[0]?.date || null;
      const worstRecoveryDay = sortedByRecovery[sortedByRecovery.length - 1]?.date || null;
      const highestStepDay = sortedBySteps[0]?.date || null;

      // Calculate consecutive days tracked
      const consecutiveDays = this.calculateConsecutiveDays(data);

      // Upsert analytics record
      const { error } = await supabase
        .from('user_analytics')
        .upsert(
          {
            user_id: userId,
            date: today,
            avg_recovery_score: avgRecovery ? Math.round(avgRecovery * 10) / 10 : null,
            avg_sleep_score: avgSleep ? Math.round(avgSleep * 10) / 10 : null,
            avg_sleep_duration: avgSleepDuration ? Math.round(avgSleepDuration * 10) / 10 : null,
            avg_strain: avgStrain ? Math.round(avgStrain * 100) / 100 : null,
            avg_resting_heart_rate: avgRHR ? Math.round(avgRHR) : null,
            avg_hrv: avgHRV ? Math.round(avgHRV * 100) / 100 : null,
            avg_steps: avgSteps ? Math.round(avgSteps) : null,
            avg_calories: avgCalories ? Math.round(avgCalories) : null,
            recovery_trend: recoveryTrend,
            sleep_trend: sleepTrend,
            activity_trend: activityTrend,
            consecutive_days_tracked: consecutiveDays,
            best_recovery_day: bestRecoveryDay,
            worst_recovery_day: worstRecoveryDay,
            highest_step_day: highestStepDay,
            created_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id,date',
          }
        );

      if (error) {
        console.error('Failed to store analytics:', error);
        throw error;
      }

      console.log(`✅ Calculated daily analytics for user ${userId}`);
    } catch (error) {
      console.error('Error calculating daily analytics:', error);
      throw error;
    }
  }

  /**
   * Get latest analytics for a user
   */
  async getLatestAnalytics(userId: string): Promise<any | null> {
    try {
      const supabase = SupabaseClientService.getClient();

      const { data, error } = await supabase
        .from('user_analytics')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows found
        console.error('Failed to fetch analytics:', error);
        throw error;
      }

      return data || null;
    } catch (error) {
      console.error('Error fetching analytics:', error);
      return null;
    }
  }

  /**
   * Get analytics history for a date range
   */
  async getAnalyticsHistory(userId: string, days: number = 90): Promise<any[]> {
    try {
      const supabase = SupabaseClientService.getClient();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('user_analytics')
        .select('*')
        .eq('user_id', userId)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (error) {
        console.error('Failed to fetch analytics history:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching analytics history:', error);
      return [];
    }
  }

  /**
   * Get summary statistics for a user
   */
  async getSummaryStats(userId: string): Promise<any> {
    try {
      const supabase = SupabaseClientService.getClient();

      // Get latest analytics
      const latestAnalytics = await this.getLatestAnalytics(userId);

      // Get 90-day history
      const { data: history } = await supabase
        .from('user_analytics')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(90);

      const records = history || [];

      // Calculate best and worst weeks
      const sortedByRecovery = [...records].sort(
        (a, b) => (b.avg_recovery_score || 0) - (a.avg_recovery_score || 0)
      );

      return {
        current: latestAnalytics,
        best_week_recovery: sortedByRecovery[0]?.avg_recovery_score,
        worst_week_recovery: sortedByRecovery[sortedByRecovery.length - 1]?.avg_recovery_score,
        days_tracked: records.length,
        consistency: Math.round((records.filter((r) => r.consecutive_days_tracked > 0).length / 90) * 100),
      };
    } catch (error) {
      console.error('Error fetching summary stats:', error);
      return null;
    }
  }

  /**
   * Helper to calculate consecutive days tracked
   * Counts how many recent consecutive days have data
   */
  private calculateConsecutiveDays(data: any[]): number {
    if (data.length === 0) return 0;

    const sortedByDate = [...data].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    let consecutive = 0;
    let currentDate = new Date(sortedByDate[0].date);

    for (const record of sortedByDate) {
      const recordDate = new Date(record.date);

      // Check if this date is consecutive with the previous one
      const expectedDate = new Date(currentDate);
      expectedDate.setDate(expectedDate.getDate() + consecutive);

      if (recordDate.toISOString().split('T')[0] === expectedDate.toISOString().split('T')[0]) {
        consecutive++;
      } else {
        break;
      }
    }

    return consecutive;
  }
}
