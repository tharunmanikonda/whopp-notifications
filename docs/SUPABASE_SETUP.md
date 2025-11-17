# Supabase Setup Guide

Complete step-by-step guide to set up Supabase for your multi-user health tracking platform.

## Step 1: Create Supabase Account & Project

1. Go to [https://supabase.com](https://supabase.com)
2. Click **Sign Up** and create an account
3. Click **Create Project** in the dashboard
4. Fill in details:
   - **Project name**: `whopp-health-tracker` (or your choice)
   - **Database password**: Create a strong password (save it!)
   - **Region**: Choose closest to your location (e.g., `us-east-1`)
   - **Pricing**: Select **Free** tier
5. Wait for project to be created (2-5 minutes)

## Step 2: Get Your API Keys

1. Once project is created, go to **Settings → API**
2. Copy these three keys:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon key**: `eyJhbGciOiJIUzI1NiIs...` (public, safe to expose)
   - **service_role key**: `eyJhbGciOiJIUzI1NiIs...` (secret, never expose)

## Step 3: Add Keys to `.env`

Add to your `.env` file:

```env
# Supabase Configuration
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
```

## Step 4: Create Database Schema

### Option A: Use SQL Editor (Recommended for first-time setup)

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy the entire SQL schema from `SUPABASE_SCHEMA.sql` (see below)
4. Paste into the editor
5. Click **Run**
6. Verify all tables are created

### Option B: Use Migrations (For production)

```bash
# This would use Supabase migrations (advanced)
# Coming in next update
```

## Step 5: Configure Row Level Security (RLS)

After tables are created, enable RLS for data privacy:

1. Go to **Authentication → Policies**
2. For each table (users, health_metrics, etc.):
   - Click on the table
   - Enable **Row Level Security**
   - Create policies (see policy examples below)

### Example RLS Policy for `health_metrics`:

```sql
-- Allow users to see only their own health metrics
CREATE POLICY "Users can read own metrics" ON health_metrics
FOR SELECT USING (auth.uid() = user_id);

-- Allow users to insert their own metrics
CREATE POLICY "Users can insert own metrics" ON health_metrics
FOR INSERT WITH CHECK (auth.uid() = user_id);
```

## Step 6: Enable Realtime (Optional)

For future real-time dashboards:

1. Go to **Realtime** in left sidebar
2. Click **Enable Realtime**
3. Select tables to enable (e.g., `health_metrics`, `ai_generated_messages`)

## Step 7: Test Connection

Run this command to verify Supabase is connected:

```bash
npm run test:supabase
```

You should see:
```
✅ Supabase connected successfully
✅ Tables verified
✅ RLS policies enabled
```

---

## SQL Schema to Execute

Copy this entire SQL and run in **SQL Editor**:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  timezone VARCHAR(50) DEFAULT 'America/New_York',
  notification_time VARCHAR(5) DEFAULT '08:00',
  notification_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  deleted_at TIMESTAMP NULL
);

-- ============================================================================
-- USER HEALTH PROVIDERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_health_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_name VARCHAR(50) NOT NULL,
  provider_type VARCHAR(50) NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMP,
  token_last_refreshed_at TIMESTAMP,
  provider_user_id VARCHAR(255),
  provider_email VARCHAR(255),
  device_info JSONB,
  connected_at TIMESTAMP DEFAULT now(),
  last_synced_at TIMESTAMP,
  sync_status VARCHAR(50) DEFAULT 'pending',
  last_error TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(user_id, provider_name),
  CONSTRAINT unique_primary_per_user UNIQUE(user_id, is_primary) WHERE is_primary = true
);

-- ============================================================================
-- HEALTH METRICS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS health_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES user_health_providers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  recovery_score NUMERIC(3, 1),
  readiness_score NUMERIC(3, 1),
  sleep_duration NUMERIC(5, 1),
  sleep_score NUMERIC(3, 1),
  sleep_quality VARCHAR(50),
  sleep_stage_summary JSONB,
  strain NUMERIC(4, 2),
  activity_score NUMERIC(3, 1),
  steps INTEGER,
  distance NUMERIC(8, 2),
  calories INTEGER,
  resting_heart_rate INTEGER,
  average_heart_rate INTEGER,
  max_heart_rate INTEGER,
  hrv NUMERIC(6, 2),
  hrv_status VARCHAR(50),
  respiratory_rate NUMERIC(4, 1),
  spo2 NUMERIC(3, 1),
  stress_level NUMERIC(3, 1),
  body_temperature NUMERIC(4, 2),
  skin_temperature NUMERIC(4, 2),
  workout_count INTEGER DEFAULT 0,
  total_workout_strain NUMERIC(4, 2),
  data_completeness NUMERIC(3, 1),
  raw_data JSONB,
  synced_at TIMESTAMP DEFAULT now(),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(user_id, provider_id, date)
);

-- ============================================================================
-- AI GENERATED MESSAGES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_generated_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  message TEXT NOT NULL,
  message_length INTEGER,
  primary_provider_id UUID REFERENCES user_health_providers(id),
  secondary_provider_ids UUID[] DEFAULT '{}',
  recovery_score NUMERIC(3, 1),
  sleep_score NUMERIC(3, 1),
  strain NUMERIC(4, 2),
  resting_heart_rate INTEGER,
  hrv NUMERIC(6, 2),
  steps INTEGER,
  calories INTEGER,
  stress_level NUMERIC(3, 1),
  activity_score NUMERIC(3, 1),
  ai_model VARCHAR(50),
  prompt_version VARCHAR(50),
  generation_time_ms INTEGER,
  confidence_score NUMERIC(3, 2),
  delivered BOOLEAN DEFAULT false,
  delivered_at TIMESTAMP,
  delivery_status VARCHAR(50) DEFAULT 'pending',
  delivery_error TEXT,
  user_liked BOOLEAN,
  user_feedback TEXT,
  data_completeness NUMERIC(3, 1),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(user_id, date)
);

-- ============================================================================
-- NOTIFICATION LOGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES ai_generated_messages(id) ON DELETE CASCADE,
  notification_type VARCHAR(50),
  phone_number VARCHAR(20),
  email_address VARCHAR(255),
  status VARCHAR(50),
  twilio_sid VARCHAR(100),
  twilio_status VARCHAR(50),
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- ============================================================================
-- USER HEALTH GOALS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS health_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goal_type VARCHAR(50) NOT NULL,
  target_value NUMERIC(5, 2),
  unit VARCHAR(20),
  priority VARCHAR(20) DEFAULT 'medium',
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- ============================================================================
-- USER ANALYTICS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  avg_recovery_score NUMERIC(3, 1),
  avg_sleep_score NUMERIC(3, 1),
  avg_sleep_duration NUMERIC(5, 1),
  avg_strain NUMERIC(4, 2),
  avg_resting_heart_rate INTEGER,
  avg_hrv NUMERIC(6, 2),
  avg_steps INTEGER,
  avg_calories INTEGER,
  recovery_trend VARCHAR(50),
  sleep_trend VARCHAR(50),
  activity_trend VARCHAR(50),
  consecutive_days_tracked INTEGER,
  best_recovery_day DATE,
  worst_recovery_day DATE,
  highest_step_day DATE,
  key_insight TEXT,
  recommendation TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(user_id, date)
);

-- ============================================================================
-- PROVIDER CONFIGURATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS provider_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  description TEXT,
  api_endpoint VARCHAR(255),
  oauth_auth_url VARCHAR(255),
  oauth_token_url VARCHAR(255),
  required_scopes TEXT[],
  supported_metrics TEXT[],
  logo_url VARCHAR(255),
  documentation_url VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now()
);

-- ============================================================================
-- ERROR LOGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  error_type VARCHAR(100),
  error_message TEXT,
  error_stack TEXT,
  context JSONB,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now()
);

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Health Providers
CREATE INDEX IF NOT EXISTS idx_user_health_providers_user_id ON user_health_providers(user_id);
CREATE INDEX IF NOT EXISTS idx_user_health_providers_active ON user_health_providers(user_id, is_active);

-- Health Metrics
CREATE INDEX IF NOT EXISTS idx_health_metrics_user_date ON health_metrics(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_health_metrics_provider ON health_metrics(user_id, provider_id, date DESC);

-- AI Messages
CREATE INDEX IF NOT EXISTS idx_ai_messages_user_date ON ai_generated_messages(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_ai_messages_delivery ON ai_generated_messages(user_id, delivered, delivered_at DESC);

-- Notification Logs
CREATE INDEX IF NOT EXISTS idx_notification_logs_user ON notification_logs(user_id, created_at DESC);

-- Analytics
CREATE INDEX IF NOT EXISTS idx_user_analytics_user_date ON user_analytics(user_id, date DESC);

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

-- Users Table RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own profile" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

-- Health Providers Table RLS
ALTER TABLE user_health_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own providers" ON user_health_providers
  FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert own providers" ON user_health_providers
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Health Metrics Table RLS
ALTER TABLE health_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own metrics" ON health_metrics
  FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert own metrics" ON health_metrics
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- AI Messages Table RLS
ALTER TABLE ai_generated_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own messages" ON ai_generated_messages
  FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert own messages" ON ai_generated_messages
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Notification Logs Table RLS
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own logs" ON notification_logs
  FOR SELECT USING (auth.uid()::text = user_id::text);

-- Health Goals Table RLS
ALTER TABLE health_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own goals" ON health_goals
  FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert own goals" ON health_goals
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Analytics Table RLS
ALTER TABLE user_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own analytics" ON user_analytics
  FOR SELECT USING (auth.uid()::text = user_id::text);
```

## Step 8: Verify Setup

1. In Supabase dashboard, go to **Table Editor**
2. Verify all tables exist:
   - [ ] `users`
   - [ ] `user_health_providers`
   - [ ] `health_metrics`
   - [ ] `ai_generated_messages`
   - [ ] `notification_logs`
   - [ ] `health_goals`
   - [ ] `user_analytics`
   - [ ] `provider_configurations`
   - [ ] `error_logs`

3. Check **Authentication → Policies** to see RLS policies are enabled

## Step 9: Add to Vercel Environment Variables

When deploying to Vercel, add these to your project settings:

```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
```

## Troubleshooting

### "Missing Supabase configuration"
- Check `.env` file has `SUPABASE_URL` and `SUPABASE_ANON_KEY`
- Restart the development server after updating `.env`

### "Permission denied" errors
- Check RLS policies are enabled for your user
- Verify auth.uid() matches user_id in database

### Slow queries
- Check indexes are created (see Step 4)
- Use Supabase **Database → Performance** to identify slow queries

### Tokens not being saved
- Check `service_role_key` is in environment variables (required for admin operations)
- Verify table structure matches schema

## Next Steps

1. ✅ Set up Supabase project
2. ✅ Create database schema
3. Create authentication endpoints
4. Integrate with existing workflow
5. Build provider management UI
6. Create dashboard

---

**Questions?** Check [Supabase Docs](https://supabase.com/docs)
