# Developer Quick Start Guide

Get up to speed with the Whoop AI Motivator platform in 15 minutes.

---

## What This Project Does

A multi-provider health tracking platform that:
1. Connects multiple wearables (Whoop, Fitbit, etc.)
2. Aggregates daily health metrics (recovery, sleep, strain, heart rate, HRV)
3. Generates AI motivational messages using Google Gemini
4. Sends daily notifications via WhatsApp/SMS using Twilio
5. Stores everything in Supabase PostgreSQL database
6. Provides APIs for dashboard and analytics

---

## Project Structure

```
whopp-notifications/
├── api/
│   └── routes/
│       ├── auth.ts              # Authentication endpoints
│       ├── analytics.ts         # Analytics endpoints
│       ├── dashboard.ts         # Dashboard endpoint
│       └── providers.ts         # Provider management endpoints
├── src/
│   ├── api/
│   │   ├── auth.ts             # Hono auth routes
│   │   └── server.ts           # Main Hono server
│   ├── cron/
│   │   └── daily-motivation.ts # Daily cron job entry point
│   ├── services/
│   │   ├── auth-service.ts     # JWT & password handling
│   │   ├── health-aggregator.ts # Multi-provider aggregation
│   │   ├── ai-generator-v2.ts  # Gemini AI generation
│   │   ├── sms-service.ts      # Twilio SMS sending
│   │   ├── db/
│   │   │   ├── user-service.ts
│   │   │   ├── provider-service.ts
│   │   │   ├── metrics-service.ts
│   │   │   ├── message-service.ts
│   │   │   ├── analytics-service.ts
│   │   │   └── supabase-client.ts
│   │   └── providers/
│   │       ├── whoop-provider.ts
│   │       └── fitbit-provider.ts
│   ├── types/
│   │   ├── health-provider.ts
│   │   └── index.ts
│   ├── config/
│   │   └── index.ts
│   └── index.ts                # Main workflow function
├── .env                        # Environment variables
└── package.json

Key Documentation:
├── API_DOCUMENTATION.md              # Auth API (5 endpoints)
├── ANALYTICS_API_DOCUMENTATION.md    # Analytics & Provider APIs (13 endpoints)
├── WORKFLOW_INTEGRATION.md           # How the daily workflow works
├── SUPABASE_SCHEMA.md                # Database schema
├── IMPLEMENTATION_SUMMARY.md         # Complete project overview
└── DEVELOPER_QUICK_START.md          # This file
```

---

## Core Concepts

### 1. Health Data Providers

Each provider implements the `HealthDataProvider` interface:

```typescript
interface HealthDataProvider {
  getMetrics(): Promise<HealthMetrics>;
  validateConnection(): Promise<boolean>;
  isConfigured(): boolean;
}

interface HealthMetrics {
  recoveryScore?: number;      // 0-100
  sleepScore?: number;         // 0-100
  strain?: number;             // 0-10
  restingHeartRate?: number;   // bpm
  hrv?: number;                // ms
  provider: string;            // "whoop", "fitbit", etc
}
```

**Current Providers**:
- `WhoopProvider` - Whoop API integration
- `FitbitProvider` - Fitbit API integration

**How to Add a Provider**:
1. Create `src/services/providers/your-provider.ts`
2. Implement `HealthDataProvider` interface
3. Add to `HealthAggregator` in `src/index.ts`

---

### 2. Authentication System

Uses JWT tokens with 24-hour expiration:

```typescript
// Generate token
const token = authService.generateToken(userId, email);

// Verify token
const decoded = authService.verifyToken(token);
// Returns: { userId, email, iat, exp }

// Validate in requests
const isValid = authService.validateToken(token);
const userId = authService.extractUserFromToken(token);
```

**Token Expiration**: 24 hours
**Storage**: Client-side (localStorage, cookies, etc.)

---

### 3. Database Services

Six service classes for database operations:

```typescript
// User management
const userService = new UserService();
const user = await userService.getUserByEmail(email);
const user = await userService.getUserById(userId);

// Provider connections
const providerService = new ProviderService();
const providers = await providerService.getUserProviders(userId);

// Health metrics
const metricsService = new MetricsService();
await metricsService.storeMetrics(metricsData);
const recent = await metricsService.getRecentMetrics(userId, 30);

// Messages
const messageService = new MessageService();
const msg = await messageService.storeMessage(messageData);
await messageService.updateDeliveryStatus(messageId, 'delivered');

// Analytics
const analyticsService = new AnalyticsService();
const stats = await analyticsService.getSummaryStats(userId, 30);
```

---

## API Endpoints

### Authentication (5 endpoints)
```
POST   /api/routes/auth?action=signup           # Create account
POST   /api/routes/auth?action=login            # Get JWT token
GET    /api/routes/auth?action=me               # Get profile (auth required)
POST   /api/routes/auth?action=change-password  # Update password (auth required)
POST   /api/routes/auth?action=validate-token   # Verify token (auth required)
```

### Dashboard & Analytics (9 endpoints)
```
GET    /api/routes/dashboard                           # Complete dashboard
GET    /api/routes/analytics?action=metrics            # Raw metrics
GET    /api/routes/analytics?action=trends             # Trend analysis
GET    /api/routes/analytics?action=summary            # Summary stats
GET    /api/routes/analytics?action=messages           # Message history
GET    /api/routes/analytics?action=health-goals       # User goals (future)
```

### Provider Management (6 endpoints)
```
GET    /api/routes/providers?action=available          # List available
GET    /api/routes/providers?action=list               # User's providers
GET    /api/routes/providers?action=status             # Connection status
POST   /api/routes/providers?action=connect            # Add provider
POST   /api/routes/providers?action=set-primary        # Set primary
DELETE /api/routes/providers?action=disconnect         # Remove provider
```

---

## Common Tasks

### 1. Test Authentication

```bash
# Signup
curl -X POST http://localhost:3000/api/routes/auth?action=signup \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"Password123","fullName":"John Doe"}'

# Response
# { "success": true, "userId": "...", "token": "..." }

# Save token
export TOKEN="your_token_here"

# Get profile
curl -X GET http://localhost:3000/api/routes/auth?action=me \
  -H "Authorization: Bearer $TOKEN"
```

### 2. Get Dashboard Data

```bash
curl -X GET "http://localhost:3000/api/routes/dashboard?period=7" \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Get Metrics for Last 30 Days

```bash
curl -X GET "http://localhost:3000/api/routes/analytics?action=metrics&days=30" \
  -H "Authorization: Bearer $TOKEN"
```

### 4. List Available Providers

```bash
curl -X GET http://localhost:3000/api/routes/providers?action=available
# No auth required
```

### 5. Connect a Provider

```bash
curl -X POST http://localhost:3000/api/routes/providers?action=connect \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "provider_name": "fitbit",
    "access_token": "your_fitbit_token",
    "refresh_token": "optional_refresh_token"
  }'
```

### 6. Run Daily Workflow

```bash
# Development
npm run workflow

# With user ID
npx ts-node src/cron/daily-motivation.ts
```

### 7. Access Database

```bash
# Using CLI (if configured)
supabase-db -c "SELECT * FROM users;"

# Or use psql directly
psql "postgresql://postgres:Tharun%409381@db.gtdpxovwszdhapszuacs.supabase.co:5432/postgres" \
  -c "SELECT COUNT(*) FROM health_metrics;"
```

---

## Environment Variables

Create `.env` file with:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# JWT
JWT_SECRET=your-super-secret-key-change-this

# Whoop API
WHOOP_CLIENT_ID=your-whoop-client-id
WHOOP_CLIENT_SECRET=your-whoop-secret
WHOOP_ACCESS_TOKEN=your-access-token
WHOOP_REFRESH_TOKEN=your-refresh-token

# Fitbit (optional)
FITBIT_CLIENT_ID=optional
FITBIT_CLIENT_SECRET=optional
FITBIT_ACCESS_TOKEN=optional

# Google Gemini
GEMINI_API_KEY=your-gemini-key

# Twilio
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890
YOUR_PHONE_NUMBER=+1234567890

# User Config
USER_NAME=Tharun
NOTIFICATION_TIME=08:00
TIMEZONE=America/New_York
```

---

## Database Tables Quick Reference

### users
Stores user accounts and preferences.
```sql
SELECT id, email, full_name, timezone FROM users LIMIT 5;
```

### user_health_providers
Stores connected provider credentials per user.
```sql
SELECT user_id, provider_name, is_primary FROM user_health_providers;
```

### health_metrics
Daily health data from providers.
```sql
SELECT date, provider, recovery_score, sleep_score
FROM health_metrics
WHERE user_id = 'user-id'
ORDER BY date DESC LIMIT 10;
```

### ai_generated_messages
AI-generated motivational messages.
```sql
SELECT created_at, message, delivery_status
FROM ai_generated_messages
WHERE user_id = 'user-id'
ORDER BY created_at DESC LIMIT 10;
```

### user_analytics
Pre-calculated daily analytics.
```sql
SELECT date, avg_recovery_score, avg_sleep_score
FROM user_analytics
WHERE user_id = 'user-id'
ORDER BY date DESC;
```

---

## Common Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `Invalid or expired token` | JWT expired or wrong format | Login again to get new token |
| `No authentication token provided` | Missing Authorization header | Add `Authorization: Bearer <token>` header |
| `Could not fetch user` | Database connection failed | Check SUPABASE_URL and keys in .env |
| `Failed to store metrics` | Database write error | Check Supabase status, verify schema exists |
| `No active providers` | No health data sources connected | Connect at least one provider first |
| `Invalid email or password` | Wrong credentials | Verify email/password or signup first |

---

## Performance Tips

1. **Caching**: Dashboard endpoint aggregates 6 queries. Cache for 5 minutes.
2. **Batch Queries**: Get last 30 days instead of daily calls.
3. **Pagination**: Implement for message history (currently returns all).
4. **Indexes**: Database uses indexes on user_id and date for fast queries.

---

## Security Reminders

⚠️ **Do NOT**:
- Commit `.env` file to git
- Log user tokens or passwords
- Use hardcoded secrets in code
- Allow CORS from all origins in production
- Return password hashes in API responses

✅ **DO**:
- Use environment variables for all secrets
- Validate all user inputs
- Use HTTPS in production
- Restrict CORS to your domain
- Keep JWT_SECRET secure
- Hash passwords with bcrypt (10+ rounds)

---

## Development Workflow

1. **Make Changes**: Edit TypeScript files in `src/`
2. **Build**: `npm run build`
3. **Test Locally**: `npm run workflow` or `npm run dev`
4. **Verify Database**: Check Supabase data
5. **Commit**: `git commit -m "Description"`
6. **Deploy**: Push to Vercel (auto-deploys)

---

## File Organization by Feature

### Authentication
- `src/services/auth-service.ts` - Core logic
- `api/routes/auth.ts` - API endpoints
- `API_DOCUMENTATION.md` - API reference

### Daily Workflow
- `src/index.ts` - Main workflow
- `src/cron/daily-motivation.ts` - Cron entry point
- `WORKFLOW_INTEGRATION.md` - Integration guide

### Database
- `src/services/db/*.ts` - Database services
- `SUPABASE_SCHEMA.md` - Schema documentation
- `SUPABASE_CLI_QUICK_REFERENCE.md` - CLI commands

### Analytics
- `api/routes/analytics.ts` - Analytics endpoints
- `api/routes/dashboard.ts` - Dashboard endpoint
- `ANALYTICS_API_DOCUMENTATION.md` - API reference

### Providers
- `src/services/providers/*.ts` - Provider implementations
- `api/routes/providers.ts` - Provider API endpoints
- `src/types/health-provider.ts` - Provider interface

---

## Next Steps

1. **Read IMPLEMENTATION_SUMMARY.md** - Get full project overview
2. **Review API_DOCUMENTATION.md** - Understand authentication
3. **Check SUPABASE_SCHEMA.md** - See database structure
4. **Test the APIs** - Use curl examples from this guide
5. **Build Frontend** - Create web dashboard using the APIs
6. **Deploy** - Push to Vercel when ready

---

## Useful Commands

```bash
# Install dependencies
npm install

# Build project
npm run build

# Run daily workflow
npm run workflow

# Run tests (when added)
npm run test

# Deploy to Vercel
vercel

# View Supabase database
supabase-db

# List database tables
supabase-tables

# Check TypeScript compilation
tsc --noEmit
```

---

## Getting Help

1. **API Issues**: Check `API_DOCUMENTATION.md` or `ANALYTICS_API_DOCUMENTATION.md`
2. **Database Issues**: Check `SUPABASE_SCHEMA.md` or `SUPABASE_CLI_QUICK_REFERENCE.md`
3. **Workflow Issues**: Check `WORKFLOW_INTEGRATION.md`
4. **General Overview**: Read `IMPLEMENTATION_SUMMARY.md`
5. **Setup Issues**: Follow `SUPABASE_SETUP.md` step by step

---

## Architecture at a Glance

```
User Request
    ↓
Authentication (JWT)
    ↓
API Endpoint Handler
    ↓
Database Service
    ↓
Supabase PostgreSQL
    ↓
Response (JSON)
```

---

## What Was Built

✅ Complete user authentication system (5 endpoints)
✅ Dashboard API with aggregated health data
✅ Analytics API with trends and statistics
✅ Provider management (connect/disconnect/list)
✅ Daily workflow with automatic data storage
✅ 9-table PostgreSQL database with RLS
✅ Multi-provider health data aggregation
✅ AI message generation and delivery tracking

---

## What's Next

🔄 Build web dashboard to display APIs
📱 Create mobile app
🔐 Implement OAuth provider flows
📊 Add advanced analytics (ML predictions)
🎯 Add health goals feature
📧 Add email notifications
🏃 Add social features (compare with friends)

---

Good luck! Start by testing the auth API, then explore the dashboard endpoint. 🚀

