# Workflow & Supabase Integration Guide

## Overview

The daily motivation workflow has been refactored to integrate seamlessly with the Supabase database. Every day's health metrics and AI-generated messages are now automatically stored in the database for later analysis, dashboard display, and historical tracking.

---

## Architecture

```
┌─────────────────────┐
│   Daily Cron Job    │
│  (Vercel / Timer)   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────────────────────────┐
│         sendDailyMotivation(userId?)                │
│                                                     │
│  ✓ Validates configuration                         │
│  ✓ Initializes Supabase services                   │
│  ✓ Fetches health data from providers              │
│  ✓ Stores metrics in Supabase                      │
│  ✓ Generates AI message                            │
│  ✓ Stores message in Supabase                      │
│  ✓ Sends WhatsApp notification                     │
│  ✓ Updates delivery status in Supabase             │
└──────────┬──────────────────────────────────────────┘
           │
           ├──────────────────────┬──────────────────┐
           ▼                      ▼                  ▼
    ┌────────────┐        ┌────────────────┐  ┌────────────┐
    │  Metrics   │        │  Messages      │  │ Delivery   │
    │  Table     │        │  Table         │  │ Logs       │
    └────────────┘        └────────────────┘  └────────────┘
           │                      │
           └──────────┬───────────┘
                      ▼
            ┌──────────────────────┐
            │   Dashboard / API    │
            │   Read aggregated    │
            │   data & analytics   │
            └──────────────────────┘
```

---

## Data Flow

### Step 1: Health Data Collection & Storage

```typescript
// Health metrics are fetched from multiple providers
const aggregatedHealthData = await aggregator.getAggregatedMetrics();

// Stored in Supabase health_metrics table
const metricsData = {
  user_id: targetUserId,
  date: "2025-11-16",
  provider: "whoop",
  recovery_score: 65,
  sleep_score: 78,
  strain: 4.2,
  resting_heart_rate: 72,
  hrv: 67.8,
  data_completeness: 95.5,
  raw_data: {...full aggregated data...}
};

await metricsService.storeMetrics(metricsData);
```

**Table: health_metrics**
| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Primary key |
| user_id | UUID | References users(id) |
| date | DATE | When metrics were recorded |
| provider | VARCHAR | Health provider (whoop, fitbit, etc.) |
| recovery_score | INTEGER | Recovery score (0-100) |
| sleep_score | INTEGER | Sleep quality score (0-100) |
| strain | DECIMAL | Daily strain value |
| resting_heart_rate | INTEGER | RHR in bpm |
| hrv | DECIMAL | Heart rate variability in ms |
| data_completeness | DECIMAL | Percentage of data available (0-100) |
| raw_data | JSONB | Full aggregated data for analysis |
| created_at | TIMESTAMP | Record creation time |

---

### Step 2: AI Message Generation & Storage

```typescript
// AI message is generated based on health context
const motivationalMessage = await aiGenerator.generateMotivationalMessage(
  aggregatedHealthData,
  config.user.name
);

// Message is stored in Supabase BEFORE sending
const messageData = {
  user_id: targetUserId,
  message: "You're crushing it! Your recovery score is 65% - keep pushing!",
  message_type: "motivation",
  providers_used: ["whoop"],
  health_context: {...context...},
  delivery_status: "pending",
  sent_at: null
};

const result = await messageService.storeMessage(messageData);
const messageId = result?.id;
```

**Table: ai_generated_messages**
| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Primary key |
| user_id | UUID | References users(id) |
| message | TEXT | The generated message |
| message_type | VARCHAR | Type: "motivation", "reminder", "alert" |
| providers_used | TEXT[] | Which providers contributed data |
| health_context | JSONB | Health metrics context used for generation |
| delivery_status | VARCHAR | "pending", "delivered", "failed" |
| sent_at | TIMESTAMP | When message was actually sent |
| created_at | TIMESTAMP | When message was generated |
| updated_at | TIMESTAMP | Last status update |

---

### Step 3: Delivery & Status Update

```typescript
// Message is sent via WhatsApp/SMS
const sent = await smsService.sendMessage(motivationalMessage);

if (sent) {
  // Status is updated to "delivered"
  await messageService.updateDeliveryStatus(
    messageId,
    "delivered",
    new Date().toISOString()
  );
} else {
  // Status is updated to "failed"
  await messageService.updateDeliveryStatus(
    messageId,
    "failed",
    new Date().toISOString()
  );
}
```

---

## Usage Patterns

### Pattern 1: Running with Default User (Backward Compatible)

If you have a default user email configured in `.env`:

```typescript
import { sendDailyMotivation } from './index.js';

// No userId required - will fetch from default email
await sendDailyMotivation();
```

The system will:
1. Try to fetch user by email from config
2. If found, use that userId for all database operations
3. If not found, skip database operations and just send message

---

### Pattern 2: Running with Specific User

When you have a specific userId (from your frontend auth):

```typescript
import { sendDailyMotivation } from './index.js';

// Pass userId for direct database operations
await sendDailyMotivation('550e8400-e29b-41d4-a716-446655440000');
```

---

### Pattern 3: Cron Job Integration

In your **Vercel cron configuration** (`vercel.json`):

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-motivation",
      "schedule": "0 8 * * *"
    }
  ]
}
```

Create **api/cron/daily-motivation.ts**:

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sendDailyMotivation } from '../../src/index.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Optional: Get userId from query or header
  const userId = req.query.userId as string | undefined;

  try {
    await sendDailyMotivation(userId);
    return res.status(200).json({
      success: true,
      message: 'Daily motivation sent successfully'
    });
  } catch (error: any) {
    console.error('Cron job error:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}
```

---

## Error Handling

The workflow is designed to be resilient:

### Database Errors (Non-Fatal)

```typescript
if (targetUserId) {
  console.log('💾 Storing health metrics in Supabase...');
  try {
    await metricsService.storeMetrics(metricsData);
    console.log('✅ Health metrics stored successfully');
  } catch (error: any) {
    // Database error doesn't stop the workflow
    console.warn(`⚠️  Failed to store metrics: ${error.message}`);
    // Message still gets sent!
  }
}
```

### Message Delivery Errors (Fatal)

```typescript
const sent = await smsService.sendMessage(motivationalMessage);

if (sent) {
  console.log('✅ WhatsApp message sent successfully');
  // Update status to delivered
  await messageService.updateDeliveryStatus(messageId, 'delivered', sentTime);
} else {
  // Fatal error - notification failed
  console.error('❌ Failed to send WhatsApp message');

  // Try to update status to failed
  try {
    await messageService.updateDeliveryStatus(messageId, 'failed', sentTime);
  } catch (error) {
    console.warn(`Failed to update failed status: ${error.message}`);
  }

  throw new Error('WhatsApp sending failed');
}
```

---

## Database Schema Integration

### health_metrics Table

Stores daily health metrics from providers.

**Indexes:**
- `idx_user_date`: Speed up queries like "get metrics for user for past 30 days"
- `idx_provider_date`: Find data from specific providers across all users
- `idx_created_at`: Recent metrics queries

**RLS Policy:**
```sql
-- Users can only see their own metrics
CREATE POLICY "Users can view own metrics"
  ON health_metrics FOR SELECT
  USING (auth.uid()::text = user_id::text);
```

**Queries:**

```sql
-- Get user's metrics for the past 7 days
SELECT * FROM health_metrics
WHERE user_id = '...'
AND date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY date DESC;

-- Get user's average recovery score for the month
SELECT
  DATE_TRUNC('week', date) as week,
  AVG(recovery_score) as avg_recovery
FROM health_metrics
WHERE user_id = '...'
AND date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE_TRUNC('week', date)
ORDER BY week DESC;

-- Get completeness stats
SELECT
  provider,
  COUNT(*) as records,
  AVG(data_completeness) as avg_completeness
FROM health_metrics
WHERE user_id = '...'
GROUP BY provider;
```

### ai_generated_messages Table

Stores all AI-generated messages with delivery status.

**Indexes:**
- `idx_user_created`: Speed up message history queries
- `idx_delivery_status`: Find undelivered messages for retry logic
- `idx_sent_date`: When messages were sent

**RLS Policy:**
```sql
-- Users can only see their own messages
CREATE POLICY "Users can view own messages"
  ON ai_generated_messages FOR SELECT
  USING (auth.uid()::text = user_id::text);
```

**Queries:**

```sql
-- Get user's message history (past 30 days)
SELECT
  created_at,
  message,
  delivery_status,
  providers_used
FROM ai_generated_messages
WHERE user_id = '...'
AND created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
ORDER BY created_at DESC;

-- Get delivery statistics
SELECT
  delivery_status,
  COUNT(*) as count,
  ROUND(100 * COUNT(*)::numeric /
    (SELECT COUNT(*) FROM ai_generated_messages
     WHERE user_id = '...')::numeric, 2) as percentage
FROM ai_generated_messages
WHERE user_id = '...'
GROUP BY delivery_status;

-- Find undelivered messages for retry
SELECT id, message, created_at
FROM ai_generated_messages
WHERE user_id = '...'
AND delivery_status = 'pending'
AND created_at < NOW() - INTERVAL '1 hour'
ORDER BY created_at ASC;
```

---

## Monitoring & Debugging

### Check Recent Metrics

```bash
# Connect to Supabase
supabase-db

# Get latest metrics for a user
SELECT
  date,
  provider,
  recovery_score,
  sleep_score,
  data_completeness
FROM health_metrics
WHERE user_id = 'USER_ID_HERE'
ORDER BY date DESC
LIMIT 10;
```

### Check Message Delivery

```bash
# Get message history with delivery status
SELECT
  created_at,
  message,
  delivery_status,
  sent_at
FROM ai_generated_messages
WHERE user_id = 'USER_ID_HERE'
ORDER BY created_at DESC
LIMIT 20;

# Count messages by status
SELECT delivery_status, COUNT(*)
FROM ai_generated_messages
WHERE user_id = 'USER_ID_HERE'
GROUP BY delivery_status;
```

### Check for Errors

```bash
# Get recent errors (from error_logs table)
SELECT
  created_at,
  error_type,
  error_message,
  user_id
FROM error_logs
ORDER BY created_at DESC
LIMIT 20;
```

---

## Performance Considerations

### Metrics Storage
- Daily metrics per user: ~1 KB
- For 1,000 users: ~1 MB per day, ~365 MB per year
- Queries are indexed by user_id and date for fast lookups

### Message Storage
- Each message: ~500 bytes + health context JSON
- For 1,000 users (1 per day): ~500 KB per day, ~180 MB per year
- Queries are indexed for quick message history retrieval

### Recommendations
1. **Archive old data**: After 2+ years, move metrics to archive table
2. **Batch operations**: If processing multiple users, batch database writes
3. **Connection pooling**: Use connection pooling in production (Supabase supports this)

---

## Future Enhancements

### Analytics Dashboard
```typescript
// Fetch last 7 days of metrics
const sevenDaysMetrics = await metricsService.getRecentMetrics(userId, 7);

// Calculate weekly averages
const weeklyAnalytics = await analyticsService.calculateDailyAnalytics(userId);

// Get trend data for charts
const trends = await analyticsService.getAnalyticsHistory(userId, 30);
```

### Predictive Alerts
```typescript
// Store health goals
await userService.updateUserHealthGoals(userId, {
  min_recovery: 50,
  min_sleep: 7,
  max_strain: 5
});

// Check if metrics meet goals
if (metrics.recovery_score < goals.min_recovery) {
  // Send alert to user
}
```

### Message Feedback
```typescript
// Store user feedback on messages
await messageService.storeFeedback(messageId, {
  helpful: true,
  sentiment: 'positive',
  user_note: 'This motivated me!'
});

// Analyze feedback to improve AI generation
```

---

## Testing

### Test with Mock Data

```bash
# Run the workflow locally
npm run workflow:test

# Check what would be stored (dry run)
npm run workflow:dry-run
```

### Test Database Connectivity

```bash
# Verify database connection
supabase-db -c "SELECT 1;"

# Check if tables exist
supabase-tables
```

### Manual Test

```bash
# Run workflow with logging
NODE_DEBUG=* npx ts-node src/cron/daily-motivation.ts

# Check stored data
supabase-db -c "SELECT * FROM health_metrics WHERE user_id = 'YOUR_ID';"
```

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| "Could not fetch default user from Supabase" | No user exists with config email | Create user via auth API first |
| "Failed to store metrics" | Database connection error | Check SUPABASE_URL and keys in .env |
| "Delivery status update failed" | Message ID is null | Ensure messageService.storeMessage returns id |
| Metrics not appearing in DB | userId is undefined | Pass userId or configure default user email |
| Old metrics accumulating | No archival process | Manually archive data older than 2 years |

---

## Summary of Changes

### Modified Files

**src/index.ts**
- Added Supabase service imports (MetricsService, MessageService, UserService)
- Added optional `userId` parameter to `sendDailyMotivation()`
- Implemented user lookup from default email
- Added metrics storage after health data collection
- Added message storage before sending
- Added delivery status update on successful send
- Added error handling for database operations (non-fatal)

### New Capabilities

✅ Health metrics automatically stored daily
✅ AI messages tracked with delivery status
✅ Historical data available for analytics
✅ Message delivery logging for debugging
✅ Per-user data isolation with RLS
✅ Error resilience - DB errors don't stop notifications
✅ Backward compatible - works with or without userId
✅ Ready for dashboard and analytics features

---

## Next Steps

1. **Test with Real Data**: Run the refactored workflow and verify data appears in Supabase
2. **Create Provider Connection Endpoints**: Build API routes for connecting Whoop/Fitbit OAuth
3. **Build Analytics Dashboard**: Create API endpoints for dashboard queries
4. **Add Message Feedback**: Allow users to rate messages and improve AI
5. **Implement Health Goals**: Let users set targets and receive alerts when metrics deviate

