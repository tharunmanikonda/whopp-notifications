# Supabase Database Schema - Multi-User Health Analytics Platform

## Overview
Complete database design for a full-scale health tracking platform supporting:
- Multiple users with authentication
- Multiple health data providers (Whoop, Fitbit, Garmin, Apple, Samsung, Oura, etc.)
- Health metrics storage for historical analysis and AI context
- Message generation history
- Secure token management
- Analytics and insights

---

## Core Tables

### 1. `users` - User Management
Stores user authentication and preferences
```sql
CREATE TABLE users (
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
```

**Columns Explained:**
- `id`: Unique user identifier (UUID)
- `email`: Login email (unique)
- `password_hash`: Bcrypt hashed password
- `timezone`: User's timezone for scheduling notifications
- `notification_time`: Time to send daily message (HH:MM format)
- `notification_enabled`: Toggle notifications on/off
- `created_at`: Account creation timestamp
- `updated_at`: Last profile update
- `deleted_at`: Soft delete for data retention

**Why This Structure:**
- Enables multi-user system
- Timezone support for global reach
- Flexible notification scheduling
- Audit trail with timestamps

---

### 2. `user_health_providers` - Connected Health Data Sources
Tracks which providers each user has connected and their API tokens
```sql
CREATE TABLE user_health_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_name VARCHAR(50) NOT NULL, -- 'whoop', 'fitbit', 'garmin', 'apple', 'samsung', 'oura', etc.
  provider_type VARCHAR(50) NOT NULL, -- Type of provider for categorization
  is_primary BOOLEAN DEFAULT false, -- Primary data source for AI generation
  is_active BOOLEAN DEFAULT true,

  -- OAuth & Token Management
  access_token TEXT NOT NULL, -- Encrypted
  refresh_token TEXT, -- Encrypted (if provider uses refresh tokens)
  token_expires_at TIMESTAMP,
  token_last_refreshed_at TIMESTAMP,

  -- Provider-specific info
  provider_user_id VARCHAR(255), -- User ID on the provider's platform
  provider_email VARCHAR(255), -- Email on provider's platform
  device_info JSONB, -- {'model': 'Whoop 4.0', 'serial': '...'}

  -- Metadata
  connected_at TIMESTAMP DEFAULT now(),
  last_synced_at TIMESTAMP,
  sync_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'syncing', 'success', 'error'
  last_error TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),

  UNIQUE(user_id, provider_name),
  CONSTRAINT unique_primary_per_user UNIQUE(user_id, is_primary) WHERE is_primary = true
);
```

**Columns Explained:**
- `provider_name`: Type of wearable ('whoop', 'fitbit', 'garmin', 'apple', 'samsung', 'oura', 'google_fit', 'withings')
- `is_primary`: Only one provider can be primary (for main AI message generation)
- `access_token/refresh_token`: Encrypted API credentials (enable encryption at rest in Supabase)
- `token_expires_at`: When token expires (for auto-refresh scheduling)
- `provider_user_id`: User's ID on that provider's platform
- `device_info`: JSON with device details (model, firmware, etc.)
- `sync_status`: Track if data sync is pending, in-progress, succeeded, or failed
- `last_error`: Store error message for debugging

**Why This Structure:**
- Users can connect multiple providers
- One primary provider for AI generation
- Secure token storage
- Sync tracking and error logging
- Multi-device support per provider

---

### 3. `health_metrics` - Daily Health Data Storage
Raw health metrics from all providers for historical analysis and AI context
```sql
CREATE TABLE health_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES user_health_providers(id) ON DELETE CASCADE,
  date DATE NOT NULL, -- For easy daily queries

  -- Recovery & Readiness Metrics
  recovery_score NUMERIC(3, 1), -- 0-100%
  readiness_score NUMERIC(3, 1), -- 0-100%

  -- Sleep Metrics
  sleep_duration NUMERIC(5, 1), -- minutes
  sleep_score NUMERIC(3, 1), -- 0-100%
  sleep_quality VARCHAR(50), -- 'excellent', 'good', 'fair', 'poor'
  sleep_stage_summary JSONB, -- {'deep': 45, 'light': 120, 'rem': 60, 'awake': 15}

  -- Activity & Strain Metrics
  strain NUMERIC(4, 2), -- 0-21 (Whoop), normalized 0-100 (other providers)
  activity_score NUMERIC(3, 1), -- 0-100%
  steps INTEGER,
  distance NUMERIC(8, 2), -- meters
  calories INTEGER, -- kcal

  -- Heart Rate Metrics
  resting_heart_rate INTEGER, -- bpm
  average_heart_rate INTEGER, -- bpm
  max_heart_rate INTEGER, -- bpm
  hrv NUMERIC(6, 2), -- Heart Rate Variability in ms
  hrv_status VARCHAR(50), -- 'low', 'balanced', 'high'

  -- Respiratory & Oxygen
  respiratory_rate NUMERIC(4, 1), -- breaths per minute
  spo2 NUMERIC(3, 1), -- Blood Oxygen %

  -- Stress & Wellness
  stress_level NUMERIC(3, 1), -- 0-100%
  body_temperature NUMERIC(4, 2), -- Celsius
  skin_temperature NUMERIC(4, 2), -- Celsius

  -- Workout Data
  workout_count INTEGER DEFAULT 0,
  total_workout_strain NUMERIC(4, 2),

  -- Data Quality & Metadata
  data_completeness NUMERIC(3, 1), -- 0-100% (what % of expected metrics we have)
  raw_data JSONB, -- Full raw response from provider for debugging
  synced_at TIMESTAMP DEFAULT now(),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),

  UNIQUE(user_id, provider_id, date)
);
```

**Columns Explained:**
- `date`: Easy to query "give me last 30 days of data"
- `recovery_score`, `sleep_score`, etc.: Individual metrics
- `sleep_stage_summary`: JSON breakdown of sleep phases
- `data_completeness`: Indicates data quality (100% = all metrics available)
- `raw_data`: Full provider response for debugging or re-processing
- `synced_at`: When this data was fetched from the provider

**Why This Structure:**
- Historical data for trend analysis
- AI context: past 30 days of health data informs current message
- Per-provider storage: different providers have different metrics
- Data quality tracking
- Raw data for future re-analysis if AI improves

---

### 4. `ai_generated_messages` - Message History & Context
Stores all generated motivational messages for memory and analysis
```sql
CREATE TABLE ai_generated_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,

  -- Message Content
  message TEXT NOT NULL,
  message_length INTEGER,

  -- Context Used for Generation
  primary_provider_id UUID REFERENCES user_health_providers(id),
  secondary_provider_ids UUID[] DEFAULT '{}', -- Array of secondary providers used

  -- Health Data Snapshot Used
  recovery_score NUMERIC(3, 1),
  sleep_score NUMERIC(3, 1),
  strain NUMERIC(4, 2),
  resting_heart_rate INTEGER,
  hrv NUMERIC(6, 2),
  steps INTEGER,
  calories INTEGER,
  stress_level NUMERIC(3, 1),
  activity_score NUMERIC(3, 1),

  -- AI Generation Metadata
  ai_model VARCHAR(50), -- 'gemini-2.0-flash', etc.
  prompt_version VARCHAR(50), -- Version of prompt used
  generation_time_ms INTEGER, -- How long AI took to generate
  confidence_score NUMERIC(3, 2), -- AI's confidence in message (0-1.0)

  -- Message Delivery
  delivered BOOLEAN DEFAULT false,
  delivered_at TIMESTAMP,
  delivery_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'bounced'
  delivery_error TEXT,

  -- User Interaction (future)
  user_liked BOOLEAN,
  user_feedback TEXT,

  -- Data Quality
  data_completeness NUMERIC(3, 1), -- What % of health data was available

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),

  UNIQUE(user_id, date) -- One message per user per day
);
```

**Columns Explained:**
- `message`: The actual motivational text sent
- `primary_provider_id` + `secondary_provider_ids`: Which providers were used
- Health data snapshot: The exact metrics used to generate this message
- `ai_model`: Track which AI model generated this (for quality analysis)
- `prompt_version`: If you improve prompts, track which version generated which messages
- `generation_time_ms`: Monitor AI performance
- `confidence_score`: AI's own confidence in the message
- `delivered_at`: When message was actually sent
- `data_completeness`: If message was generated with 40% data, that matters for analysis
- `user_liked`, `user_feedback`: Enables feedback loop to improve messages

**Why This Structure:**
- **AI Memory**: AI can reference past messages when generating new ones
- **Quality Analysis**: Track which prompts/models generate best messages
- **Delivery Tracking**: Confirm messages were actually sent
- **Performance Analytics**: Monitor generation time, confidence
- **User Feedback Loop**: Learn what messages resonate
- **Compliance**: Audit trail of what was communicated

---

### 5. `health_goals` - User Health Targets & Preferences
User-defined health targets for personalized messages
```sql
CREATE TABLE health_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goal_type VARCHAR(50) NOT NULL, -- 'recovery', 'sleep', 'activity', 'stress'

  -- Goal Definition
  target_value NUMERIC(5, 2),
  unit VARCHAR(20), -- '%', 'hours', 'steps', 'kcal'
  priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high'

  -- Timeframe
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

**Why:** AI can adapt messages to emphasize user's personal goals

---

### 6. `notification_logs` - Delivery Tracking
Detailed logs of all notifications (SMS/WhatsApp/Email/Push)
```sql
CREATE TABLE notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES ai_generated_messages(id) ON DELETE CASCADE,

  notification_type VARCHAR(50), -- 'whatsapp', 'sms', 'email', 'push', 'in_app'
  phone_number VARCHAR(20),
  email_address VARCHAR(255),

  status VARCHAR(50), -- 'queued', 'sent', 'delivered', 'failed', 'bounced'
  twilio_sid VARCHAR(100), -- Twilio message ID
  twilio_status VARCHAR(50), -- Twilio status

  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  error_message TEXT,

  created_at TIMESTAMP DEFAULT now()
);
```

**Why:** Track which messages actually reached users

---

### 7. `user_analytics` - Aggregated Insights
Pre-calculated analytics for dashboards
```sql
CREATE TABLE user_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,

  -- 30-day Averages
  avg_recovery_score NUMERIC(3, 1),
  avg_sleep_score NUMERIC(3, 1),
  avg_sleep_duration NUMERIC(5, 1),
  avg_strain NUMERIC(4, 2),
  avg_resting_heart_rate INTEGER,
  avg_hrv NUMERIC(6, 2),
  avg_steps INTEGER,
  avg_calories INTEGER,

  -- Trends
  recovery_trend VARCHAR(50), -- 'improving', 'stable', 'declining'
  sleep_trend VARCHAR(50),
  activity_trend VARCHAR(50),

  -- Badges/Achievements
  consecutive_days_tracked INTEGER,
  best_recovery_day DATE,
  worst_recovery_day DATE,
  highest_step_day DATE,

  -- Insights
  key_insight TEXT, -- AI-generated insight (e.g., "Your HRV has improved 15% this month")
  recommendation TEXT, -- AI-generated recommendation

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

**Why:** Dashboard queries are fast, pre-calculated insights

---

## Supporting Tables

### 8. `provider_configurations` - Provider API Details
Metadata about supported health data providers (static reference)
```sql
CREATE TABLE provider_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  description TEXT,
  api_endpoint VARCHAR(255),
  oauth_auth_url VARCHAR(255),
  oauth_token_url VARCHAR(255),
  required_scopes TEXT[], -- Array of OAuth scopes needed
  supported_metrics TEXT[], -- Array of metrics this provider can provide
  logo_url VARCHAR(255),
  documentation_url VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now()
);
```

**Why:** Centralized configuration for supported providers

---

### 9. `error_logs` - System Error Tracking
Track errors for debugging and monitoring
```sql
CREATE TABLE error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  error_type VARCHAR(100),
  error_message TEXT,
  error_stack TEXT,
  context JSONB, -- {'provider': 'whoop', 'step': 'token_refresh', ...}
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now()
);
```

---

## Database Indexes (Performance)

```sql
-- Fast user lookups
CREATE INDEX idx_users_email ON users(email);

-- Fast provider lookups
CREATE INDEX idx_user_health_providers_user_id ON user_health_providers(user_id);
CREATE INDEX idx_user_health_providers_active ON user_health_providers(user_id, is_active);

-- Fast health metrics queries
CREATE INDEX idx_health_metrics_user_date ON health_metrics(user_id, date DESC);
CREATE INDEX idx_health_metrics_provider ON health_metrics(user_id, provider_id, date DESC);
CREATE INDEX idx_health_metrics_date_range ON health_metrics(user_id, date DESC) WHERE date >= CURRENT_DATE - INTERVAL '30 days';

-- Fast message queries
CREATE INDEX idx_ai_messages_user_date ON ai_generated_messages(user_id, date DESC);
CREATE INDEX idx_ai_messages_delivery ON ai_generated_messages(user_id, delivered, delivered_at DESC);

-- Fast notification queries
CREATE INDEX idx_notification_logs_user ON notification_logs(user_id, created_at DESC);
CREATE INDEX idx_notification_logs_status ON notification_logs(status, created_at DESC);
```

---

## Row Level Security (RLS) Policies

Important for multi-user security:

```sql
-- Users can only see their own data
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY users_own_profile ON users
  FOR SELECT USING (auth.uid() = id);

ALTER TABLE user_health_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY users_own_providers ON user_health_providers
  FOR SELECT USING (auth.uid() = user_id);

ALTER TABLE health_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY users_own_metrics ON health_metrics
  FOR SELECT USING (auth.uid() = user_id);

ALTER TABLE ai_generated_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY users_own_messages ON ai_generated_messages
  FOR SELECT USING (auth.uid() = user_id);

-- Similar policies for all other user-specific tables
```

---

## Data Flow & Integration Points

### Daily Health Data Sync Flow:
```
1. Cron job runs at user's notification_time
2. Fetch from all active providers (user_health_providers)
3. Store raw metrics in health_metrics table
4. Calculate data_completeness
5. Generate AI message using last 30 days of health_metrics
6. Store message + context in ai_generated_messages
7. Send notification (WhatsApp/SMS/Email)
8. Log delivery in notification_logs
9. Update last_synced_at in user_health_providers
```

### AI Context Building:
```
SELECT * FROM health_metrics
WHERE user_id = ? AND date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date DESC
-- This data informs the AI prompt for personalized messages
```

### Analytics Generation (daily):
```
SELECT AVG(recovery_score), AVG(sleep_score), ...
FROM health_metrics
WHERE user_id = ? AND date >= CURRENT_DATE - INTERVAL '30 days'
-- Store in user_analytics for dashboard
```

---

## Security Considerations

1. **Token Encryption**: Enable Supabase encryption at rest for `access_token` and `refresh_token` columns
2. **RLS Policies**: All tables have Row Level Security enabled
3. **Audit Trail**: `created_at`, `updated_at`, `deleted_at` timestamps track all changes
4. **Data Retention**: Implement cleanup policy (e.g., delete error logs after 90 days)
5. **Password Hashing**: Use bcrypt or similar, never store plain passwords
6. **API Keys**: Secure Gemini API key and Twilio credentials in Vercel environment variables

---

## Future Enhancements

1. **Social Features**: `user_friends`, `shared_goals`, `competitions`
2. **Wearable Device Management**: `user_devices` table to track multiple devices per provider
3. **Medication & Food Logs**: Track what affects health metrics
4. **Doctor Integration**: Share data with healthcare providers
5. **Advanced Analytics**: ML-driven insights and predictions
6. **Mobile App**: Push notifications, offline sync
7. **Integration Marketplace**: Let users add custom data sources
