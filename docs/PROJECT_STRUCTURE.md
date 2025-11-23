# WHOOP Notifications Platform - Project Structure & Overview

**Project Name**: WHOOP AI Motivator
**Version**: 1.0.0
**Status**: Production Ready
**Last Updated**: November 23, 2025

---

## 🎯 What Is This Project?

A comprehensive Node.js/React full-stack application that integrates multiple health tracking providers (WHOOP, Fitbit, Oura, Garmin, Apple Health, Samsung Health) with real-time webhook support, backup polling, and AI-powered notifications.

### Key Features

- **Multi-Provider Integration**: Connect with 6+ health tracking platforms
- **Real-Time Data**: Webhooks with HMAC-SHA256 signature verification
- **Reliable Backup**: Daily polling ensures no data is lost
- **OAuth 2.0**: Secure user authentication with token management
- **JWT-Based API**: Protected endpoints with token verification
- **Supabase Database**: PostgreSQL with RLS policies
- **React Frontend**: Modern UI with Vite bundler
- **TypeScript**: Strict type safety across full stack

### Technology Stack

**Backend**:
- Node.js 18+
- TypeScript
- Hono (lightweight web framework)
- Supabase (PostgreSQL + Auth)
- Crypto (HMAC-SHA256, JWT)

**Frontend**:
- React 18
- TypeScript
- React Router v6
- Zustand (state management)
- Vite (build tool)
- Tailwind CSS (styling)

**DevOps**:
- Docker support
- Supabase CLI
- npm/yarn package management
- Environment-based configuration

---

## 📁 Directory Structure

```
whopp-notifications/
├── src/                          # Backend TypeScript source
│   ├── api/                      # API route handlers
│   │   ├── server.ts             # Main Hono app with route mounting
│   │   ├── auth.ts               # Authentication endpoints
│   │   ├── oauth.ts              # OAuth 2.0 flow for WHOOP
│   │   ├── providers.ts          # Provider management (connect/disconnect)
│   │   ├── webhooks.ts           # Webhook receiver (real-time data)
│   │   └── webhook-subscriptions.ts # Subscription management
│   │
│   ├── jobs/                     # Scheduled background jobs
│   │   └── whoop-polling.ts      # Daily backup polling for missed webhooks
│   │
│   ├── services/                 # Business logic & external APIs
│   │   ├── supabase-client.js    # Supabase admin client
│   │   ├── auth-service.ts       # JWT token generation/verification
│   │   ├── metrics-service.ts    # Health metrics processing
│   │   └── twilio-service.ts     # SMS notification sending
│   │
│   ├── config/                   # Configuration management
│   │   └── index.ts              # Environment variables & validation
│   │
│   ├── types/                    # TypeScript type definitions
│   │   └── index.ts              # Global types & interfaces
│   │
│   └── api-server.ts             # Node.js HTTP server wrapper for Hono
│
├── web/                          # React frontend
│   ├── src/
│   │   ├── pages/                # Route pages
│   │   │   ├── Login.tsx         # Login page
│   │   │   ├── Signup.tsx        # User registration
│   │   │   ├── Onboarding.tsx    # Provider connection setup
│   │   │   ├── Dashboard.tsx     # Main app dashboard
│   │   │   └── OAuthCallback.tsx # OAuth redirect handler
│   │   │
│   │   ├── components/           # Reusable React components
│   │   │   ├── ConnectProviderButton.tsx  # Provider auth button
│   │   │   ├── ProviderCard.tsx           # Provider display card
│   │   │   └── ProviderAuthFlow.tsx       # OAuth flow handler
│   │   │
│   │   ├── store/                # Zustand state management
│   │   │   ├── authStore.ts      # User auth state & methods
│   │   │   └── providerStore.ts  # Connected providers state
│   │   │
│   │   ├── services/             # API client functions
│   │   │   └── api.ts            # Axios instance & endpoints
│   │   │
│   │   ├── App.tsx               # Root component with routing
│   │   └── main.tsx              # React entry point
│   │
│   ├── index.html                # HTML template
│   ├── vite.config.ts            # Vite bundler config
│   ├── tsconfig.json             # TypeScript config
│   └── package.json              # Dependencies
│
├── supabase/                     # Database setup & migrations
│   └── migrations/
│       ├── [timestamp]_create_users.sql
│       ├── [timestamp]_create_user_health_providers.sql
│       ├── [timestamp]_create_webhook_subscriptions.sql
│       ├── [timestamp]_create_webhook_logs.sql
│       ├── [timestamp]_create_user_metrics.sql
│       └── ...
│
├── docs/                         # Comprehensive documentation
│   ├── PROJECT_STRUCTURE.md              # This file (project overview)
│   ├── README.md                         # General project info
│   ├── QUICK_START.md                    # Getting started guide
│   ├── DEVELOPER_QUICK_START.md          # Dev environment setup
│   ├── API_DOCUMENTATION.md              # API endpoints reference
│   ├── PROVIDER_AUTHENTICATION.md        # OAuth setup for all providers
│   ├── PROVIDER_IMPLEMENTATION_CHECKLIST.md # Implementation progress
│   ├── PROVIDER_SUMMARY.md               # Provider comparison matrix
│   ├── FITBIT_COMPLETE_GUIDE.md          # Fitbit integration (1500+ lines)
│   ├── WHOOP_WEBHOOKS_COMPLETE_GUIDE.md  # WHOOP webhooks & polling (900+ lines)
│   ├── SUPABASE_SCHEMA.md                # Database schema reference
│   ├── SUPABASE_SETUP.md                 # Database setup instructions
│   ├── SUPABASE_INTEGRATION.md           # Supabase integration guide
│   ├── WEB_APP_SETUP_GUIDE.md            # Frontend setup
│   ├── ANALYTICS_API_DOCUMENTATION.md    # Analytics endpoints
│   └── WORKFLOW_INTEGRATION.md           # API workflows
│
├── .env                          # Environment variables (NOT in git)
│   ├── WHOOP_CLIENT_ID
│   ├── WHOOP_CLIENT_SECRET
│   ├── WHOOP_WEBHOOK_SECRET
│   ├── FITBIT_CLIENT_ID
│   ├── SUPABASE_URL
│   ├── SUPABASE_ANON_KEY
│   ├── SUPABASE_SERVICE_ROLE_KEY
│   ├── JWT_SECRET
│   ├── GEMINI_API_KEY
│   ├── TWILIO_ACCOUNT_SID
│   ├── TWILIO_AUTH_TOKEN
│   └── ... (see docs for full list)
│
├── .gitignore                    # Files excluded from git
├── .prettierrc                   # Code formatting rules
├── tsconfig.json                 # TypeScript configuration
├── package.json                  # Backend dependencies
├── package-lock.json             # Dependency lock file
├── README.md                      # Project overview
├── PRIVACY.md                     # Privacy policy
└── docker-compose.yml            # Docker services (optional)
```

---

## 🔄 Data Flow Architecture

### 1. User Registration & Authentication
```
User registers
    ↓
Password hashed with bcrypt
    ↓
Stored in Supabase users table
    ↓
JWT token generated (expires 24h)
    ↓
Token stored in browser localStorage
    ↓
Included in Authorization header for API calls
```

### 2. Provider Connection (OAuth Flow)
```
User clicks "Connect Provider"
    ↓
Frontend redirects to provider OAuth
    ↓
User authorizes app
    ↓
Provider redirects with auth code
    ↓
Backend exchanges code for access token
    ↓
Token stored in user_health_providers table
    ↓
Webhook subscription registered (if supported)
    ↓
Provider data fetches begin
```

### 3. Real-Time Data (Webhooks)
```
User action (workout, sleep, etc.)
    ↓ (15-20 min)
Device syncs to provider
    ↓ (seconds)
Provider sends webhook to your server
    ↓
POST /api/webhooks/provider
    ↓
Verify HMAC signature
    ↓
Check for duplicates
    ↓
Store in user_metrics table
    ↓
Data ready in app (< 1 second latency)
```

### 4. Reliable Backup (Polling)
```
Daily at 2 AM
    ↓
Poll all active providers
    ↓
Fetch data for last 7 days
    ↓
Compare with stored data
    ↓
Upsert (auto-dedup) to database
    ↓
Catch any missed webhooks
```

---

## 🗄️ Database Schema

### Core Tables

**users**
```
id (UUID, PK)
email (unique)
password_hash
created_at
updated_at
```

**user_health_providers**
```
id (UUID, PK)
user_id (FK to users)
provider_name (whoop, fitbit, oura, etc)
access_token (encrypted)
refresh_token (encrypted)
external_user_id (provider's user ID)
is_primary
is_active
last_polled_at
last_webhook_at
created_at
updated_at
```

**webhook_subscriptions**
```
id (UUID, PK)
user_id (FK to users)
provider
provider_id (FK to user_health_providers)
webhook_url
events (text array)
external_subscription_id (provider's subscription ID)
status (active, inactive)
created_at
updated_at
```

**webhook_logs**
```
id (UUID, PK)
user_id (FK to users)
provider
trace_id (UNIQUE, for dedup)
payload (JSONB)
status (received, processing, processed, failed)
error_message
created_at
processed_at
```

**user_metrics**
```
id (UUID, PK)
user_id (FK to users)
provider (whoop, fitbit, etc)
metric_type (cycles, workouts, sleep, heartrate, etc)
date
external_id (provider's data ID)
data (JSONB, full payload)
synced_at
created_at
updated_at
UNIQUE(user_id, provider, metric_type, date)
```

---

## 📡 API Endpoints

### Authentication
```
POST   /api/auth/signup              Register new user
POST   /api/auth/login               Login user
GET    /api/auth/me                  Get current user
POST   /api/auth/logout              Logout
```

### OAuth Flows
```
POST   /api/oauth/whoop/login        Initiate WHOOP OAuth
GET    /api/oauth/whoop/callback     WHOOP OAuth callback
POST   /api/oauth/fitbit/login       Initiate Fitbit OAuth
GET    /api/oauth/fitbit/callback    Fitbit OAuth callback
```

### Provider Management
```
GET    /api/providers/available      List available providers
GET    /api/providers/list           List user's connected providers
POST   /api/providers/connect        Connect a provider
DELETE /api/providers/disconnect     Disconnect a provider
POST   /api/providers/set-primary    Set primary provider
```

### Webhook Management
```
POST   /api/webhook-subscriptions/register     Register webhook
GET    /api/webhook-subscriptions              List subscriptions
GET    /api/webhook-subscriptions/status       Check webhook health
DELETE /api/webhook-subscriptions/:id          Delete subscription
```

### Webhook Receivers (Providers call these)
```
POST   /api/webhooks/whoop           WHOOP webhook receiver
POST   /api/webhooks/fitbit          Fitbit webhook receiver
POST   /api/webhooks/oura            Oura webhook receiver
```

### Metrics
```
GET    /api/metrics/user             Get user's health metrics
GET    /api/metrics/trends           Get metric trends
GET    /api/metrics/compare          Compare metrics
```

---

## 🔐 Security Features

### Authentication
- JWT-based stateless authentication
- 24-hour token expiration
- Refresh token strategy
- Password hashing with bcrypt

### API Security
- Bearer token validation on all endpoints
- CORS enabled for frontend domain
- Input validation on all endpoints
- Rate limiting (to be implemented)

### Webhook Security
- HMAC-SHA256 signature verification
- Constant-time comparison
- Trace ID deduplication
- Audit logging of all webhooks

### Data Security
- Encryption at rest (Supabase)
- HTTPS in production
- Environment variables for secrets
- No hardcoded credentials

### Provider Security
- OAuth 2.0 with state parameter
- PKCE support (Fitbit, etc)
- Secure token storage
- Token refresh before expiration

---

## 🚀 How to Use This Codebase

### For New Developers

1. **Start here**: Read `docs/DEVELOPER_QUICK_START.md`
2. **Understand data flow**: Review this file's "Data Flow Architecture" section
3. **Setup environment**: Follow `.env` setup in docs
4. **Run the app**: `npm install && npm run dev`
5. **Explore code**: Start with `src/api/server.ts` to understand routing

### For Adding New Providers

1. **Check**: `docs/PROVIDER_AUTHENTICATION.md` for provider-specific OAuth
2. **Add OAuth route**: Create `src/api/oauth-[provider].ts`
3. **Add webhook handler**: Create `src/api/webhooks-[provider].ts`
4. **Add polling job**: Add to `src/jobs/` if needed
5. **Update database**: Add provider columns if needed
6. **Document**: Update `docs/PROVIDER_SUMMARY.md`

### For Modifying Webhooks

1. **Read**: `docs/WHOOP_WEBHOOKS_COMPLETE_GUIDE.md`
2. **Modify**: `src/api/webhooks.ts` for handlers
3. **Modify**: `src/api/webhook-subscriptions.ts` for registration
4. **Test**: Trigger real webhook and verify storage

### For Database Changes

1. **Read**: `docs/SUPABASE_SCHEMA.md`
2. **Create migration**: `supabase migration new [name]`
3. **Write SQL**: Edit migration file
4. **Push**: `npx supabase db push`
5. **Verify**: Check Supabase dashboard

### For Frontend Changes

1. **Components**: Add to `web/src/components/`
2. **Pages**: Add to `web/src/pages/`
3. **State**: Update `web/src/store/` if needed
4. **Types**: Add to `src/types/` for shared types
5. **Build**: `npm run build` in web folder

---

## 📚 Key Files Explained

### Backend Entry Point: `src/api-server.ts`
Creates HTTP server and wraps Hono's fetch-based handler. Handles request body parsing for POST/PUT.

### Main API Router: `src/api/server.ts`
Hono app with all routes mounted. CORS configured, health checks, error handling.

### OAuth Handler: `src/api/oauth.ts`
WHOOP OAuth implementation with state parameter, code exchange, token storage.

### Webhook Handler: `src/api/webhooks.ts`
Receives webhooks from providers, verifies signatures, deduplicates, stores data.

### Subscription Manager: `src/api/webhook-subscriptions.ts`
Register/list/delete webhooks. Calls provider APIs to register subscriptions.

### Polling Job: `src/jobs/whoop-polling.ts`
Fetches last 7 days of data from WHOOP API. Scheduled to run daily at 2 AM.

### Auth Service: `src/services/auth-service.ts`
JWT token generation and verification. Password hashing and comparison.

### Frontend Router: `web/src/App.tsx`
React Router setup with protected routes. Redirects unauthenticated users.

### Auth Store: `web/src/store/authStore.ts`
Zustand state management. Handles login/logout, token storage, validation.

---

## 🔄 Common Workflows

### Workflow 1: User Registers & Connects WHOOP

```
1. User visits app → redirected to Login
2. Clicks "Sign Up"
3. Fills email/password → submitted
4. Backend validates & stores user
5. Frontend redirects to Onboarding
6. User clicks "Connect WHOOP"
7. Redirected to WHOOP OAuth
8. User authorizes
9. WHOOP redirects back with code
10. Backend exchanges code for token
11. Token stored in database
12. Webhook registered with WHOOP
13. User sees "Connected ✅"
14. Can see metrics on Dashboard
```

### Workflow 2: Webhook Received

```
1. User completes workout on WHOOP Band
2. Band syncs to WHOOP (15-20 min)
3. WHOOP sends webhook to your server
4. POST /api/webhooks/whoop received
5. HMAC signature verified ✓
6. Check trace_id - not duplicate ✓
7. Parse event (workout_updated)
8. Fetch user from database
9. Upsert data to user_metrics table
10. Data ready in app (< 1 sec)
11. Dashboard updates
12. Mark webhook as processed
```

### Workflow 3: Daily Polling

```
1. Cron job runs at 2 AM
2. Get all active WHOOP users
3. For each user:
   a. Refresh access token if needed
   b. Fetch cycles (last 7 days)
   c. Fetch workouts (last 7 days)
   d. Fetch sleep (last 7 days)
   e. Upsert all data (auto-dedup)
   f. Update last_polled_at timestamp
4. Log results
5. Send alert if errors
```

---

## 🧪 Testing

### Manual Testing
- Create test account
- Connect test WHOOP device
- Trigger workout/sleep
- Verify webhook received
- Check dashboard updates

### Signature Verification Testing
```
POST /api/webhooks/whoop
X-Whoop-Signature: <compute locally>
Body: {"event": "workout_updated", ...}
```

### Rate Limit Testing
- Make 100+ requests in rapid succession
- Verify backoff logic works
- Check rate limit headers

### Deduplication Testing
- Send same webhook twice
- Verify stored only once
- Check trace_id logic

---

## 🚨 Monitoring & Debugging

### Key Logs to Monitor
```
Webhook received:           Incoming webhook events
HMAC verification failed:   Security issue
Duplicate webhook:          Dedup triggered
Token refresh failed:       Auth issue
API rate limit hit:         Performance issue
Polling job completed:      Job health
```

### Debug Mode
Set environment variable:
```
DEBUG=whoop:* npm run dev
```

### Common Issues & Solutions

**Webhook not firing?**
- Check webhook registered in provider dashboard
- Verify webhook_url is HTTPS and accessible
- Check WHOOP_WEBHOOK_SECRET matches

**Token expired?**
- OAuth tokens expire (8 hours)
- Refresh tokens before using
- Check token refresh logic in auth-service

**Data not appearing?**
- Check webhook logged in webhook_logs
- Verify signature matched
- Check user_metrics table has data
- Check frontend is fetching data

---

## 🌍 Environment Variables

### Required for Development
```
# WHOOP OAuth
WHOOP_CLIENT_ID=xxx
WHOOP_CLIENT_SECRET=xxx
WHOOP_REDIRECT_URI=http://localhost:5001/api/oauth/whoop/callback

# WHOOP Webhooks
WHOOP_WEBHOOK_SECRET=xxx

# Database
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# JWT
JWT_SECRET=xxx_random_string

# Optional (for AI features)
GEMINI_API_KEY=xxx
TWILIO_ACCOUNT_SID=xxx
TWILIO_AUTH_TOKEN=xxx
```

See `.env.example` or `docs/DEVELOPER_QUICK_START.md` for full list.

---

## 📈 Scalability Considerations

### Current Limits
- WHOOP: 100 req/min (10,000/day) global
- Fitbit: 150 req/hr per user
- Database: PostgreSQL with RLS

### Scaling Strategy
1. **Webhooks**: Unlimited (provider handles retries)
2. **Polling**: Run workers in parallel for 10k+ users
3. **Database**: Implement partitioning for metrics (by date)
4. **Cache**: Add Redis for frequently accessed metrics
5. **Jobs**: Use BullMQ for reliable job queueing

---

## 📖 Related Documentation

| Document | Purpose |
|----------|---------|
| `README.md` | General project info |
| `DEVELOPER_QUICK_START.md` | Developer setup |
| `PROVIDER_AUTHENTICATION.md` | OAuth setup for providers |
| `WHOOP_WEBHOOKS_COMPLETE_GUIDE.md` | Webhook implementation |
| `FITBIT_COMPLETE_GUIDE.md` | Fitbit integration |
| `SUPABASE_SCHEMA.md` | Database schema |
| `API_DOCUMENTATION.md` | API endpoints reference |

---

## 🤝 Contributing

### Code Style
- TypeScript strict mode enabled
- Prettier for formatting
- ESLint for linting
- Comments on complex logic

### Before Committing
1. Format code: `npm run format`
2. Lint code: `npm run lint`
3. Build: `npm run build`
4. Test manually
5. Document changes

### Git Workflow
1. Create feature branch
2. Make changes with commits
3. Push to origin
4. Create pull request
5. Wait for review

---

## 📞 Support & Questions

**For project structure questions**:
→ Refer to this file (PROJECT_STRUCTURE.md)

**For API questions**:
→ See `docs/API_DOCUMENTATION.md`

**For provider integration**:
→ See `docs/PROVIDER_AUTHENTICATION.md`

**For WHOOP webhooks**:
→ See `docs/WHOOP_WEBHOOKS_COMPLETE_GUIDE.md`

**For database schema**:
→ See `docs/SUPABASE_SCHEMA.md`

---

## 🎓 Learning Path

**New to the project?** Follow this order:

1. Read this file (PROJECT_STRUCTURE.md) - 10 min
2. Read `docs/DEVELOPER_QUICK_START.md` - 15 min
3. Read `docs/API_DOCUMENTATION.md` - 15 min
4. Explore `src/api/server.ts` - understand routing
5. Explore `web/src/App.tsx` - understand frontend
6. Read `docs/PROVIDER_AUTHENTICATION.md` - 20 min
7. Read `docs/WHOOP_WEBHOOKS_COMPLETE_GUIDE.md` - 30 min
8. Run app locally and test
9. Dive into specific features

**Total time to understand**: ~3-4 hours

---

**Last Updated**: November 23, 2025
**Maintained By**: Your Team
**Questions?** Refer to appropriate documentation or code comments.
