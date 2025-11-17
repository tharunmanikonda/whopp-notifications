# Quick Start: Setting Up Your Multi-User Health Platform

## 🚀 30-Minute Setup Guide

### Step 1: Create Supabase Account (5 minutes)

1. Go to https://supabase.com and sign up
2. Create a new project
   - Name: `whopp-health-tracker`
   - Password: Save this somewhere safe
   - Region: Choose closest to you
3. Wait for project to initialize (2-5 minutes)

### Step 2: Copy API Keys (2 minutes)

In Supabase dashboard:
- Go to **Settings → API**
- Copy these three values:
  ```
  Project URL: https://xxxxx.supabase.co
  anon key: eyJhbGciOi...
  service_role key: eyJhbGciOi...
  ```

### Step 3: Update .env File (2 minutes)

Add to `.env`:
```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
```

### Step 4: Create Database Schema (5 minutes)

1. In Supabase, go to **SQL Editor**
2. Click **New Query**
3. Copy the entire SQL from `SUPABASE_SETUP.md` (SQL Schema section)
4. Paste it into the editor
5. Click **Run**
6. Wait for success message

### Step 5: Verify Installation (2 minutes)

```bash
npm run build
npm run start
```

You should see:
```
✅ Configuration validated
🏥 Setting up health data providers...
✅ Registered health provider: whoop
✅ Provider is connected
```

### Step 6: (Optional) Add to Vercel (5 minutes)

1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to **Settings → Environment Variables**
4. Add three variables:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. Click **Deploy** to apply changes

---

## ✅ What You Now Have

| Component | Status | What It Does |
|-----------|--------|--------------|
| **Supabase Database** | ✅ Ready | Stores users, health data, messages, analytics |
| **User Management** | ✅ Ready | Create accounts, manage profiles, preferences |
| **Provider Management** | ✅ Ready | Connect Whoop, Fitbit, or other wearables |
| **Health Metrics Storage** | ✅ Ready | Save daily health data from all providers |
| **Message Generation** | ✅ Ready | Store AI-generated messages with context |
| **Analytics** | ✅ Ready | Calculate trends, insights, achievements |
| **Notification Logging** | ✅ Ready | Track message delivery status |

---

## 🔧 How to Use Each Service

### 1. Create a New User
```typescript
import { UserService } from './services/db/user-service.js';

const userService = new UserService();
const userId = await userService.createUser(
  'user@example.com',
  passwordHashedWithBcrypt,
  'John Doe',
  'America/New_York',
  '08:00'
);
```

### 2. Connect a Health Provider
```typescript
import { ProviderService } from './services/db/provider-service.js';

const providerService = new ProviderService();
const providerId = await providerService.registerProvider(
  userId,
  'whoop',           // or 'fitbit', 'garmin', etc.
  accessToken,
  refreshToken,
  { model: 'Whoop 4.0' },
  true               // Set as primary provider
);
```

### 3. Store Daily Health Data
```typescript
import { MetricsService } from './services/db/metrics-service.js';

const metricsService = new MetricsService();
await metricsService.storeMetrics(
  userId,
  providerId,
  {
    recoveryScore: 65,
    sleepScore: 78,
    strain: 12.5,
    steps: 8932,
    // ... other metrics
  }
);
```

### 4. Get Data for AI Message Generation
```typescript
const recentMetrics = await metricsService.getRecentMetrics(userId, 30);
// Returns: 30 days of health data for AI context
```

### 5. Store Generated Message
```typescript
import { MessageService } from './services/db/message-service.js';

const messageService = new MessageService();
const messageId = await messageService.storeMessage(
  userId,
  motivationalMessage,  // The actual message text
  aggregatedHealthData, // Health data used for generation
  'gemini-2.0-flash',
  1200,                 // Generation time in ms
  0.92                  // AI confidence score
);
```

### 6. Update Message Delivery Status
```typescript
await messageService.updateDeliveryStatus(
  messageId,
  'sent',              // or 'delivered', 'failed', 'bounced'
  'SM1234567890',      // Twilio message SID
  null                 // error message if failed
);
```

### 7. Calculate Daily Analytics
```typescript
import { AnalyticsService } from './services/db/analytics-service.js';

const analyticsService = new AnalyticsService();
await analyticsService.calculateDailyAnalytics(userId);

// Later, fetch analytics
const analytics = await analyticsService.getLatestAnalytics(userId);
console.log(analytics.avg_recovery_score);  // 65.3
console.log(analytics.recovery_trend);      // 'improving'
console.log(analytics.consecutive_days_tracked); // 42
```

---

## 📊 Database Schema Quick Reference

```
users (1 row per user)
├── id, email, password_hash, timezone, notification_time
└── Used for: Authentication, user profiles

user_health_providers (2-3 rows per user)
├── id, user_id, provider_name, access_token, is_primary
└── Used for: OAuth credentials, tracking connected devices

health_metrics (30 rows per user per month)
├── user_id, provider_id, date, recovery_score, sleep_score, strain, steps, ...
└── Used for: Historical data, AI context, trend analysis

ai_generated_messages (1 row per user per day)
├── user_id, date, message, delivery_status, recovery_score, sleep_score, ...
└── Used for: Message history, AI memory, delivery tracking

notification_logs (1-2 rows per message)
├── user_id, message_id, notification_type, status, twilio_sid
└── Used for: Delivery tracking, debugging failed messages

user_analytics (1 row per user per day)
├── user_id, date, avg_recovery_score, recovery_trend, consecutive_days, ...
└── Used for: Dashboard, insights, achievements
```

---

## 🔐 Security Notes

1. **Never** share your `SUPABASE_SERVICE_ROLE_KEY` in public
   - Keep it in `.env` and Vercel environment variables only
   - Use `SUPABASE_ANON_KEY` for client-side code

2. **Row Level Security** is enabled by default
   - Users can only see their own data
   - Enforced at database level, not application level

3. **Token Encryption**
   - OAuth tokens stored encrypted in Supabase
   - Only accessible server-side

4. **Password Hashing**
   - Always hash passwords with bcrypt before storing
   - Never store plain-text passwords

---

## 🚨 Troubleshooting

### "Missing Supabase configuration"
- Check `.env` has `SUPABASE_URL` and `SUPABASE_ANON_KEY`
- Restart your dev server
- Make sure you copied keys correctly (no extra spaces)

### "Permission denied" error
- RLS policy might be blocking you
- Check `Supabase → Authentication → Policies`
- Verify `auth.uid()` is set correctly

### "Table doesn't exist"
- Make sure you ran the SQL schema in SQL Editor
- Check `Supabase → Table Editor` to see all tables
- All 9 tables should be listed

### Tables created but queries fail
- Check RLS policies are enabled for your tables
- Verify `auth.uid()` matches user_id in your data

### Slow database queries
- Check indexes are created
- Go to `Supabase → Database → Performance` to identify slow queries
- Usually a missing index issue

---

## 📈 Next Features to Build

1. **Authentication API**
   - POST `/auth/signup` - Create new user
   - POST `/auth/login` - Authenticate user
   - POST `/auth/logout` - Clear session
   - GET `/auth/me` - Get current user

2. **Provider Management API**
   - GET `/providers` - List all supported providers
   - POST `/providers/connect` - Start OAuth flow
   - GET `/providers/callback` - Handle OAuth callback
   - GET `/providers/connected` - List user's providers
   - DELETE `/providers/:id` - Disconnect provider

3. **Dashboard API**
   - GET `/dashboard` - Get user's dashboard data
   - GET `/analytics` - Get analytics and trends
   - GET `/messages` - Get message history
   - POST `/messages/:id/feedback` - User feedback on message

4. **Health Data API**
   - GET `/health/today` - Today's health snapshot
   - GET `/health/history` - Historical health data
   - GET `/health/goals` - User's health goals
   - POST `/health/goals` - Create new goal

---

## 📞 Support Resources

- **Supabase Docs**: https://supabase.com/docs
- **Supabase Community**: https://github.com/supabase/supabase/discussions
- **TypeScript Docs**: https://www.typescriptlang.org/docs/
- **PostgreSQL Docs**: https://www.postgresql.org/docs/

---

## 🎯 Success Checklist

- [ ] Supabase account created
- [ ] Database schema imported
- [ ] API keys in `.env`
- [ ] `npm install` completed
- [ ] `npm run build` successful
- [ ] `npm run start` shows no Supabase errors
- [ ] Verified tables exist in Supabase dashboard
- [ ] Ready to build authentication!

---

## 🔥 You're Now Ready to Build

The database foundation is complete! The next steps are:

1. Build login/signup endpoints
2. Implement OAuth provider flows
3. Create webhook handlers for provider data sync
4. Build the dashboard UI
5. Integrate daily workflow to store data in Supabase

Good luck! 🚀
