-- Rate limit tracking table for per-user API call limits
CREATE TABLE IF NOT EXISTS api_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- 'fitbit', 'whoop', etc.
    window_start TIMESTAMP WITH TIME ZONE NOT NULL,
    request_count INTEGER NOT NULL DEFAULT 0,
    last_request_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- One record per user per provider per hour window
    UNIQUE(user_id, provider, window_start)
);

-- Index for fast rate limit lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup ON api_rate_limits(user_id, provider, window_start DESC);

-- Index for cleanup of old windows
CREATE INDEX IF NOT EXISTS idx_rate_limits_created ON api_rate_limits(created_at);

-- Add Fitbit-specific columns to user_health_providers
ALTER TABLE user_health_providers
ADD COLUMN IF NOT EXISTS external_user_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS subscription_id VARCHAR(255);

-- Add new health_metrics columns for full Fitbit tracking
ALTER TABLE health_metrics
ADD COLUMN IF NOT EXISTS weight NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS bmi NUMERIC(4,2),
ADD COLUMN IF NOT EXISTS body_fat NUMERIC(4,2),
ADD COLUMN IF NOT EXISTS water_intake INTEGER,
ADD COLUMN IF NOT EXISTS food_calories INTEGER;

-- Enable RLS on rate limits table
ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service role can manage rate limits (backend only)
CREATE POLICY "Service role manages rate_limits" ON api_rate_limits
    FOR ALL USING (auth.role() = 'service_role');

-- Add comments for documentation
COMMENT ON TABLE api_rate_limits IS 'Tracks API request counts per user per provider for rate limiting. Fitbit: 150/hour, WHOOP: 100/min';
COMMENT ON COLUMN api_rate_limits.window_start IS 'Start of the rate limit window (hourly for Fitbit, per-minute for WHOOP)';
COMMENT ON COLUMN api_rate_limits.request_count IS 'Number of requests made in this window';
COMMENT ON COLUMN user_health_providers.external_user_id IS 'Provider-specific user ID (e.g., Fitbit encoded user ID)';
COMMENT ON COLUMN user_health_providers.subscription_id IS 'Webhook subscription ID for this provider';
