import SupabaseClientService from './supabase-client.js';

/**
 * Rate limit configuration per provider
 */
interface RateLimitConfig {
  requests: number;    // Max requests allowed
  windowMs: number;    // Window size in milliseconds
}

/**
 * Provider-specific rate limits
 * - Fitbit: 150 requests per hour per user
 * - WHOOP: 100 requests per minute (global, but we track per user for safety)
 */
const PROVIDER_LIMITS: Record<string, RateLimitConfig> = {
  fitbit: { requests: 150, windowMs: 3600000 },   // 150/hour
  whoop: { requests: 100, windowMs: 60000 },      // 100/min
  garmin: { requests: 100, windowMs: 60000 },     // TBD - placeholder
  oura: { requests: 100, windowMs: 60000 },       // TBD - placeholder
};

/**
 * Rate Limiter Service
 *
 * Manages API rate limits per user per provider using Supabase.
 * Uses a sliding window approach with hourly buckets.
 */
export class RateLimiter {
  private supabase = SupabaseClientService.getAdminClient();

  /**
   * Get the start of the current rate limit window for a provider
   */
  private getWindowStart(provider: string): Date {
    const now = new Date();
    const config = PROVIDER_LIMITS[provider];

    if (!config) {
      // Default to hourly windows for unknown providers
      now.setMinutes(0, 0, 0);
      return now;
    }

    if (config.windowMs >= 3600000) {
      // Hourly window - align to hour
      now.setMinutes(0, 0, 0);
    } else if (config.windowMs >= 60000) {
      // Per-minute window - align to minute
      now.setSeconds(0, 0);
    }

    return now;
  }

  /**
   * Check if a request can be made without exceeding rate limits
   */
  async canMakeRequest(userId: string, provider: string): Promise<boolean> {
    const config = PROVIDER_LIMITS[provider];
    if (!config) {
      console.warn(`No rate limit config for provider: ${provider}`);
      return true; // Allow if no config
    }

    const windowStart = this.getWindowStart(provider);

    const { data, error } = await this.supabase
      .from('api_rate_limits')
      .select('request_count')
      .eq('user_id', userId)
      .eq('provider', provider)
      .eq('window_start', windowStart.toISOString())
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found, which is fine
      console.error('Rate limit check error:', error);
      return true; // Allow on error to avoid blocking users
    }

    const currentCount = data?.request_count || 0;
    return currentCount < config.requests;
  }

  /**
   * Record an API request for rate limiting
   */
  async recordRequest(userId: string, provider: string, count: number = 1): Promise<void> {
    const windowStart = this.getWindowStart(provider);

    // Upsert: increment count if exists, insert if not
    const { error } = await this.supabase.rpc('increment_rate_limit', {
      p_user_id: userId,
      p_provider: provider,
      p_window_start: windowStart.toISOString(),
      p_count: count,
    });

    if (error) {
      // Fallback: try direct upsert if RPC doesn't exist
      console.warn('RPC increment_rate_limit not found, using fallback');
      await this.recordRequestFallback(userId, provider, windowStart, count);
    }
  }

  /**
   * Fallback method to record request without RPC
   */
  private async recordRequestFallback(
    userId: string,
    provider: string,
    windowStart: Date,
    count: number
  ): Promise<void> {
    // First, try to get existing record
    const { data: existing } = await this.supabase
      .from('api_rate_limits')
      .select('id, request_count')
      .eq('user_id', userId)
      .eq('provider', provider)
      .eq('window_start', windowStart.toISOString())
      .single();

    if (existing) {
      // Update existing record
      await this.supabase
        .from('api_rate_limits')
        .update({
          request_count: existing.request_count + count,
          last_request_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      // Insert new record
      await this.supabase.from('api_rate_limits').insert({
        user_id: userId,
        provider,
        window_start: windowStart.toISOString(),
        request_count: count,
        last_request_at: new Date().toISOString(),
      });
    }
  }

  /**
   * Get remaining requests in current window
   */
  async getRemainingRequests(userId: string, provider: string): Promise<number> {
    const config = PROVIDER_LIMITS[provider];
    if (!config) return 999; // No limit

    const windowStart = this.getWindowStart(provider);

    const { data } = await this.supabase
      .from('api_rate_limits')
      .select('request_count')
      .eq('user_id', userId)
      .eq('provider', provider)
      .eq('window_start', windowStart.toISOString())
      .single();

    const currentCount = data?.request_count || 0;
    return Math.max(0, config.requests - currentCount);
  }

  /**
   * Get the time until rate limit resets
   */
  getResetTime(provider: string): Date {
    const config = PROVIDER_LIMITS[provider];
    const windowStart = this.getWindowStart(provider);

    return new Date(windowStart.getTime() + (config?.windowMs || 3600000));
  }

  /**
   * Wait until rate limit resets (useful for retrying)
   */
  async waitForReset(provider: string): Promise<void> {
    const resetTime = this.getResetTime(provider);
    const waitMs = Math.max(0, resetTime.getTime() - Date.now());

    if (waitMs > 0) {
      console.log(`Rate limit reached for ${provider}, waiting ${Math.ceil(waitMs / 1000)}s`);
      await new Promise(resolve => setTimeout(resolve, waitMs));
    }
  }

  /**
   * Clean up old rate limit records (older than 24 hours)
   * Call this periodically (e.g., daily cron)
   */
  async cleanupOldRecords(): Promise<number> {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

    const { data, error } = await this.supabase
      .from('api_rate_limits')
      .delete()
      .lt('created_at', cutoff.toISOString())
      .select('id');

    if (error) {
      console.error('Failed to cleanup rate limit records:', error);
      return 0;
    }

    return data?.length || 0;
  }

  /**
   * Get rate limit status for a user (useful for debugging/monitoring)
   */
  async getStatus(userId: string, provider: string): Promise<{
    current: number;
    limit: number;
    remaining: number;
    resetsAt: Date;
    isLimited: boolean;
  }> {
    const config = PROVIDER_LIMITS[provider] || { requests: 100, windowMs: 3600000 };
    const windowStart = this.getWindowStart(provider);

    const { data } = await this.supabase
      .from('api_rate_limits')
      .select('request_count')
      .eq('user_id', userId)
      .eq('provider', provider)
      .eq('window_start', windowStart.toISOString())
      .single();

    const current = data?.request_count || 0;
    const remaining = Math.max(0, config.requests - current);

    return {
      current,
      limit: config.requests,
      remaining,
      resetsAt: this.getResetTime(provider),
      isLimited: remaining === 0,
    };
  }
}

// Singleton instance
let rateLimiterInstance: RateLimiter | null = null;

export function getRateLimiter(): RateLimiter {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new RateLimiter();
  }
  return rateLimiterInstance;
}

export default RateLimiter;
