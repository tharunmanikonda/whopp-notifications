# Supabase Integration Summary

## What Was Built

A complete TypeScript service layer for managing all database operations with Supabase.

### New Files Created

#### Core Services (`src/services/`)
1. **`supabase-client.ts`** - Singleton client for Supabase connection
   - `getClient()` - For authenticated user operations
   - `getAdminClient()` - For server-side admin operations

#### Database Services (`src/services/db/`)
2. **`user-service.ts`** - User management
   - `createUser()` - Register new user
   - `getUserByEmail()` - Authentication lookup
   - `getUserById()` - Fetch user profile
   - `updateUserPreferences()` - Update timezone, notification time, etc.
   - `deleteUser()` - Soft delete user account
   - `emailExists()` - Check email availability

3. **`provider-service.ts`** - Health provider management
   - `registerProvider()` - Connect new health device (Whoop, Fitbit, etc.)
   - `getUserProviders()` - Get all connected providers for user
   - `getPrimaryProvider()` - Get main data source for AI
   - `updateToken()` - Save refreshed OAuth tokens
   - `setSyncStatus()` - Track provider sync state
   - `deactivateProvider()` - Remove provider connection
   - `setPrimaryProvider()` - Change primary data source
   - `hasProvider()` - Check if provider is connected

4. **`metrics-service.ts`** - Health metrics storage and retrieval
   - `storeMetrics()` - Save daily health data from providers
   - `getRecentMetrics()` - Fetch last 30 days for AI context
   - `getTodayMetrics()` - Get today's aggregated data
   - `calculateCompleteness()` - Quality score of data
   - `getHealthTrends()` - Weekly trend analysis

5. **`message-service.ts`** - AI message history management
   - `storeMessage()` - Save generated message with context
   - `getRecentMessages()` - Fetch past messages for AI memory
   - `getTodayMessage()` - Check if message already generated
   - `updateDeliveryStatus()` - Track message delivery (sent/failed)
   - `storeFeedback()` - Save user reactions to messages
   - `getMessageStats()` - Analytics on message generation

6. **`analytics-service.ts`** - Health analytics and insights
   - `calculateDailyAnalytics()` - Generate daily stats
   - `getLatestAnalytics()` - Current week's analytics
   - `getAnalyticsHistory()` - Historical trends
   - `getSummaryStats()` - High-level overview for dashboard

#### Documentation
7. **`SUPABASE_SCHEMA.md`** - Complete database design
   - 9 tables with detailed explanations
   - Indexes for performance
   - RLS policies for security
   - Data flow diagrams
   - Future enhancement ideas

8. **`SUPABASE_SETUP.md`** - Step-by-step setup guide
   - Account creation walkthrough
   - API key configuration
   - SQL schema to run
   - RLS policy setup
   - Vercel deployment instructions
   - Troubleshooting tips

9. **`SUPABASE_INTEGRATION.md`** - This file

### Updated Files

1. **`src/config/index.ts`** - Added Supabase configuration
2. **`src/types/index.ts`** - Added Supabase Config interface
3. **`src/index.ts`** - Updated to use HealthAggregator (multi-provider support)
4. **`package.json`** - Added @supabase/supabase-js dependency

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Supabase (PostgreSQL)                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────┐   ┌──────────────────┐  ┌────────────┐ │
│  │    users       │   │  health_metrics  │  │ messages   │ │
│  │   (auth)       │───│   (daily data)    │──│ (history)  │ │
│  └────────────────┘   └──────────────────┘  └────────────┘ │
│         │                      │                     │      │
│         │              ┌───────▼────────┐           │      │
│         │              │  analytics     │           │      │
│         │              │  (insights)    │           │      │
│         │              └────────────────┘           │      │
│         │                                           │      │
│  ┌──────▼──────────────┐           ┌──────────────▼──┐   │
│  │ user_health_        │           │ notification_   │   │
│  │ providers           │           │ logs            │   │
│  │ (connected devices) │           │ (delivery)      │   │
│  └─────────────────────┘           └─────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │
                   ┌──────────┴──────────┐
                   │                     │
         ┌─────────▼─────────┐  ┌──────▼─────────┐
         │  TypeScript        │  │  Node.js       │
         │  Service Layer     │  │  Cron Jobs     │
         │  (Database Ops)    │  │  Workflows     │
         └───────────────────┘  └────────────────┘
```

---

## Data Flow: Daily Motivation Workflow

```
1. CRON JOB TRIGGERED
   └─> Vercel cron at user's notification_time

2. FETCH HEALTH DATA
   └─> HealthAggregator
       ├─> WhoopProvider (primary)
       ├─> FitbitProvider (secondary)
       └─> [Other providers]

3. STORE HEALTH METRICS
   └─> MetricsService.storeMetrics()
       └─> INSERT INTO health_metrics (Supabase)

4. FETCH PAST DATA FOR AI CONTEXT
   └─> MetricsService.getRecentMetrics(30 days)
       └─> SELECT * FROM health_metrics WHERE date >= CURRENT_DATE - 30

5. GENERATE AI MESSAGE
   └─> AIMessageGeneratorV2.generateMotivationalMessage()
       ├─> Build prompt with current + recent health data
       ├─> Call Gemini API
       └─> Return personalized message

6. STORE MESSAGE + CONTEXT
   └─> MessageService.storeMessage()
       └─> INSERT INTO ai_generated_messages

7. SEND NOTIFICATION
   └─> SMSService.sendMessage()
       ├─> Call Twilio API (WhatsApp)
       └─> Get message SID

8. LOG DELIVERY STATUS
   └─> MessageService.updateDeliveryStatus()
       └─> UPDATE ai_generated_messages SET delivery_status = 'sent'
       └─> INSERT INTO notification_logs

9. CALCULATE ANALYTICS
   └─> AnalyticsService.calculateDailyAnalytics()
       └─> INSERT INTO user_analytics
           (avg recovery, sleep, trends, consecutive days, etc.)

10. DONE
    └─> User receives motivational message + system tracks all data
```

---

## Database Schema at a Glance

### 1. **users** (100 rows per 100 users)
Stores user accounts, preferences, timezone, notification schedule
```sql
SELECT id, email, full_name, timezone, notification_time FROM users;
```

### 2. **user_health_providers** (avg 2-3 rows per user)
Tracks connected wearables and their OAuth tokens
```sql
SELECT * FROM user_health_providers WHERE user_id = $1 AND is_active = true;
```

### 3. **health_metrics** (30 rows per user per month)
Daily health data from all providers
```sql
SELECT * FROM health_metrics
WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date DESC;
```

### 4. **ai_generated_messages** (1 row per user per day)
Daily motivational messages + metadata
```sql
SELECT * FROM ai_generated_messages
WHERE user_id = $1 AND date = CURRENT_DATE;
```

### 5. **notification_logs** (1-2 rows per message)
Twilio delivery tracking
```sql
SELECT * FROM notification_logs
WHERE user_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '7 days';
```

### 6. **user_analytics** (1 row per user per day)
Pre-calculated daily insights
```sql
SELECT * FROM user_analytics
WHERE user_id = $1 ORDER BY date DESC LIMIT 90;
```

### 7. **health_goals** (avg 2-3 goals per user)
User-defined health targets
```sql
SELECT * FROM health_goals WHERE user_id = $1 AND is_active = true;
```

### 8. **provider_configurations** (9-10 rows total)
Reference data on supported providers (static)
```sql
SELECT * FROM provider_configurations WHERE is_active = true;
```

### 9. **error_logs** (as needed)
System error tracking for debugging
```sql
SELECT * FROM error_logs WHERE user_id = $1 ORDER BY created_at DESC;
```

---

## Service Usage Examples

### Store Health Data
```typescript
import { MetricsService } from './services/db/metrics-service.js';

const metricsService = new MetricsService();

await metricsService.storeMetrics(
  userId,        // UUID of user
  providerId,    // UUID of provider (from user_health_providers)
  metrics,       // HealthMetrics object from provider
  rawData        // Optional: full API response for debugging
);
```

### Register New Provider
```typescript
import { ProviderService } from './services/db/provider-service.js';

const providerService = new ProviderService();

const providerId = await providerService.registerProvider(
  userId,        // User registering provider
  'fitbit',      // Provider name
  accessToken,   // OAuth access token
  refreshToken,  // OAuth refresh token (optional)
  deviceInfo,    // Device details: { model: 'Fitbit Charge 5', ... }
  isPrimary      // true = use for main AI message generation
);
```

### Store Generated Message
```typescript
import { MessageService } from './services/db/message-service.js';

const messageService = new MessageService();

const messageId = await messageService.storeMessage(
  userId,           // User who got message
  motivationalMsg,  // MotivationalMessage object
  healthData,       // AggregatedHealthData used for generation
  'gemini-2.0-flash', // AI model used
  1245,             // Generation time in ms
  0.92              // Confidence score (0-1.0)
);

// Later, update delivery status
await messageService.updateDeliveryStatus(
  messageId,
  'sent',           // Status: pending, sent, delivered, failed
  'SM1234567890',   // Twilio SID
  null              // Error message (if failed)
);
```

### Get Analytics
```typescript
import { AnalyticsService } from './services/db/analytics-service.js';

const analyticsService = new AnalyticsService();

// Calculate today's analytics
await analyticsService.calculateDailyAnalytics(userId);

// Fetch latest analytics
const latestAnalytics = await analyticsService.getLatestAnalytics(userId);
console.log(latestAnalytics.recovery_trend); // 'improving' | 'stable' | 'declining'
console.log(latestAnalytics.avg_recovery_score); // 65.3
```

---

## Security Features

### 1. Row Level Security (RLS)
- Users can only access their own data
- Database enforces at table level, not app level
- Example: `SELECT * FROM health_metrics WHERE auth.uid() = user_id`

### 2. Token Encryption
- OAuth tokens stored with Supabase encryption at rest
- Never exposed in API responses
- Only accessible server-side

### 3. Soft Deletes
- Users can be deleted but data is retained
- `deleted_at` timestamp tracks deletion time
- Enables account recovery

### 4. Audit Trail
- `created_at`, `updated_at`, `deleted_at` on all tables
- `error_logs` table tracks system issues
- `notification_logs` tracks all communications

---

## Next Steps

### Phase 1: Authentication
- [ ] Create login/signup endpoints
- [ ] Hash passwords securely (bcrypt)
- [ ] Issue JWT tokens for API access
- [ ] Build provider OAuth flow UI

### Phase 2: Provider Management
- [ ] Web form to connect new providers
- [ ] OAuth flow handlers for each provider
- [ ] Token refresh automation
- [ ] Provider disconnect/remove functionality

### Phase 3: Workflow Integration
- [ ] Update cron job to use UserService
- [ ] Store daily health data in Supabase
- [ ] Fetch AI context from database
- [ ] Track message delivery in database

### Phase 4: Dashboard
- [ ] Build analytics dashboard
- [ ] Display health trends
- [ ] Show message history
- [ ] Provider status page

### Phase 5: Advanced Features
- [ ] Health goal setting
- [ ] User feedback on messages
- [ ] AI model improvement based on feedback
- [ ] Social sharing & leaderboards

---

## Deployment Checklist

- [ ] Create Supabase project
- [ ] Run SQL schema in SQL Editor
- [ ] Copy API keys to `.env`
- [ ] Install @supabase/supabase-js
- [ ] Build authentication endpoints
- [ ] Test database connections
- [ ] Add Supabase env vars to Vercel
- [ ] Deploy to Vercel
- [ ] Enable cron jobs in Vercel
- [ ] Test end-to-end workflow

---

## Monitoring & Maintenance

### View Database Size
Supabase Dashboard → Settings → Database

### Monitor API Usage
Supabase Dashboard → Logs → API Requests

### Check Slow Queries
Supabase Dashboard → Database → Performance

### View RLS Issues
Supabase Dashboard → Logs → Postgres Logs

---

## Cost Estimate (Free Tier)

| Item | Free Tier | Notes |
|------|-----------|-------|
| Storage | 500 MB | ~100 users x 30 days = 30 MB |
| API Requests | Unlimited | Pay after 50k/day |
| Real-time | Unlimited | Good for future dashboards |
| Auth Users | Unlimited | Users per project |
| Database Connections | 100 concurrent | Sufficient for Vercel functions |

**Total Cost: $0/month** (for first 100-1000 users)

---

## Resources

- **Supabase Docs**: https://supabase.com/docs
- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **Row Level Security**: https://supabase.com/docs/guides/auth/row-level-security
- **API Reference**: https://supabase.com/docs/reference/javascript
