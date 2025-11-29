-- Create webhook_logs table for audit trail and deduplication
CREATE TABLE IF NOT EXISTS webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(50) NOT NULL DEFAULT 'whoop',
    provider_id VARCHAR(255) NOT NULL,
    trace_id VARCHAR(255) UNIQUE NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'received',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_webhook_logs_trace_id ON webhook_logs(trace_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_provider_id ON webhook_logs(provider_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_status ON webhook_logs(status);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_type ON webhook_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs(created_at DESC);

-- Create webhook_subscriptions table for tracking active subscriptions
CREATE TABLE IF NOT EXISTS webhook_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL DEFAULT 'whoop',
    provider_id UUID REFERENCES user_health_providers(id) ON DELETE CASCADE,
    webhook_url TEXT NOT NULL,
    events TEXT[] NOT NULL DEFAULT ARRAY['recovery.updated', 'cycle.updated', 'workout.updated', 'sleep.updated'],
    external_subscription_id VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for webhook_subscriptions
CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_user_id ON webhook_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_provider ON webhook_subscriptions(provider);
CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_status ON webhook_subscriptions(status);

-- Enable RLS
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies for webhook_logs (only service role can access)
CREATE POLICY "Service role can manage webhook_logs" ON webhook_logs
    FOR ALL USING (auth.role() = 'service_role');

-- RLS policies for webhook_subscriptions
CREATE POLICY "Users can view their own subscriptions" ON webhook_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage webhook_subscriptions" ON webhook_subscriptions
    FOR ALL USING (auth.role() = 'service_role');

-- Add comment for documentation
COMMENT ON TABLE webhook_logs IS 'Stores all incoming webhooks for audit trail and deduplication using trace_id';
COMMENT ON TABLE webhook_subscriptions IS 'Tracks active webhook subscriptions with WHOOP and other providers';
