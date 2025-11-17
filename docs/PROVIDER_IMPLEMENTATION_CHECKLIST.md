# Provider Implementation Checklist

Quick reference for implementing each provider's authentication.

---

## Quick Reference Table

| Feature | WHOOP | Fitbit | Garmin | Apple Health | Samsung Health | Oura |
|---------|-------|--------|--------|--------------|----------------|------|
| **Auth Type** | OAuth 2.0 | OAuth 2.0 | OAuth 1.0a | Local (iOS) | Local (Android) | OAuth 2.0 |
| **Approval Needed** | ❌ No | ⚠️ Partial* | ✅ Yes | ✅ Yes (App Store) | ⚠️ Partial** | ❌ No |
| **Cost** | 💰 Free | 💰 Free | 💰 $5,000 | 💰 $99/year | 💰 Free | 💰 Free |
| **Web API** | ✅ Yes | ✅ Yes | ⚠️ Webhooks | ❌ No (iOS only) | ❌ No (Android) | ✅ Yes |
| **Rate Limits** | ❓ Unknown | 150/hr | Throttled | N/A | N/A | 5K/5min |
| **Setup Time** | ⏱️ 15 min | ⏱️ 20 min | ⏱️ 4+ weeks | ⏱️ 1-2 weeks | ⏱️ 1-2 weeks | ⏱️ 10 min |
| **Complexity** | 🟢 Easy | 🟢 Easy | 🔴 Hard | 🟡 Medium | 🟡 Medium | 🟢 Easy |
| **Recommended** | ✅ YES | ✅ YES | ⚠️ Business only | ✅ If iOS | ✅ If Android | ✅ YES |

*Fitbit: Intraday data requires approval form
**Samsung: Write access requires partnership

---

## Phase 1: Quick Start (Weeks 1-2)

Recommended: Implement WHOOP + Oura + Fitbit first

### WHOOP Implementation Checklist

#### Step 1: Get Credentials
- [ ] Register at https://developer-dashboard.whoop.com
- [ ] Create Team
- [ ] Create App
- [ ] Copy Client ID
- [ ] Copy Client Secret
- [ ] Set Redirect URI: `https://yourapp.com/auth/whoop/callback`
- [ ] Add to .env file

#### Step 2: Create Auth Endpoint
- [ ] Create `/api/auth/whoop/login` endpoint
- [ ] Generate state parameter (8+ chars)
- [ ] Redirect to WHOOP OAuth URL
- [ ] Implement OAuth callback handler
- [ ] Exchange auth code for access token
- [ ] Store access token (encrypted)
- [ ] Store refresh token (encrypted)

#### Step 3: Create Data Fetch Endpoint
- [ ] Create `/api/whoop/profile` endpoint
- [ ] Use access token to fetch user profile
- [ ] Create `/api/whoop/cycles` endpoint
- [ ] Create `/api/whoop/sleep` endpoint
- [ ] Create `/api/whoop/recovery` endpoint
- [ ] Create `/api/whoop/workouts` endpoint

#### Step 4: Frontend Integration
- [ ] Add "Connect WHOOP" button to onboarding
- [ ] Implement OAuth redirect flow
- [ ] Show loading state during auth
- [ ] Handle auth errors gracefully
- [ ] Display connected status
- [ ] Add disconnect option

#### Step 5: Testing
- [ ] Test OAuth flow with test account
- [ ] Test data fetching
- [ ] Test error handling
- [ ] Test token refresh
- [ ] Test disconnection

**Estimated Time**: 1 week

---

### Fitbit Implementation Checklist

#### Step 1: Get Credentials
- [ ] Register at https://dev.fitbit.com/apps/new/
- [ ] Select app type (Server recommended)
- [ ] Copy Client ID
- [ ] Copy Client Secret
- [ ] Set Redirect URI to HTTPS: `https://yourapp.com/auth/fitbit/callback`
- [ ] Add to .env file

#### Step 2: Implement PKCE
- [ ] Install crypto library for code challenge generation
- [ ] Generate code_verifier (43-128 characters)
- [ ] Generate code_challenge (SHA256 of verifier)
- [ ] Store code_verifier in session

#### Step 3: Create Auth Endpoint
- [ ] Create `/api/auth/fitbit/login` endpoint
- [ ] Generate and store code_verifier + challenge
- [ ] Redirect to Fitbit OAuth URL with PKCE
- [ ] Implement OAuth callback handler
- [ ] Exchange auth code + verifier for token
- [ ] Store access + refresh tokens (encrypted)

#### Step 4: Create Data Fetch Endpoints
- [ ] Create `/api/fitbit/profile` endpoint
- [ ] Create `/api/fitbit/today/summary` endpoint
- [ ] Create `/api/fitbit/heart-rate` endpoint
- [ ] Create `/api/fitbit/sleep` endpoint
- [ ] Create `/api/fitbit/activities` endpoint
- [ ] Implement rate limit checking (150/hour)

#### Step 5: Frontend Integration
- [ ] Add "Connect Fitbit" button
- [ ] Implement OAuth redirect flow
- [ ] Display user activity summary
- [ ] Show daily metrics (steps, calories, heart rate)
- [ ] Add disconnect option

#### Step 6: Testing
- [ ] Create Fitbit test account
- [ ] Test PKCE flow
- [ ] Test data fetching
- [ ] Test rate limiting
- [ ] Test intraday data (if approved)

**Estimated Time**: 1.5 weeks

---

### Oura Implementation Checklist

#### Step 1: Get Credentials
- [ ] Register at https://cloud.ouraring.com/oauth/applications
- [ ] Create new application
- [ ] Copy Client ID
- [ ] Copy Client Secret
- [ ] Add Redirect URI: `https://yourapp.com/auth/oura/callback`
- [ ] Add to .env file

#### Step 2: Create Auth Endpoint
- [ ] Create `/api/auth/oura/login` endpoint
- [ ] Generate state parameter
- [ ] Redirect to Oura OAuth URL
- [ ] Implement callback handler
- [ ] Exchange code for access token
- [ ] Store tokens (encrypted)

#### Step 3: Create Data Fetch Endpoints
- [ ] Create `/api/oura/personal-info` endpoint
- [ ] Create `/api/oura/daily-summary` endpoint
- [ ] Create `/api/oura/sleep` endpoint
- [ ] Create `/api/oura/heart-rate` endpoint
- [ ] Create `/api/oura/workout` endpoint

#### Step 4: Frontend Integration
- [ ] Add "Connect Oura Ring" button
- [ ] Implement OAuth flow
- [ ] Display ring data (sleep, readiness, activity)
- [ ] Add disconnect option

#### Step 5: Testing
- [ ] Create Oura test account
- [ ] Test OAuth flow
- [ ] Test data fetching
- [ ] Verify 5,000 request/5min rate limit

**Estimated Time**: 1 week

---

## Phase 2: Mobile Integration (Weeks 3-4)

### Apple Health (iOS) Checklist

#### Step 1: Setup
- [ ] Enroll in Apple Developer Program ($99/year)
- [ ] Create App ID with HealthKit capability
- [ ] Open in Xcode and enable HealthKit
- [ ] Add privacy descriptions to Info.plist

#### Step 2: Implement HealthKit Reading
- [ ] Create health data service
- [ ] Request step count permission
- [ ] Request heart rate permission
- [ ] Request sleep data permission
- [ ] Request workout data permission
- [ ] Implement data querying

#### Step 3: Data Syncing
- [ ] Create endpoint to send iOS data to backend
- [ ] Implement daily sync from HealthKit
- [ ] Handle permission denials
- [ ] Sync historical data on first connection

#### Step 4: Testing
- [ ] Test on real iOS device
- [ ] Test permission flows
- [ ] Test data querying
- [ ] Prepare for App Store review

**Estimated Time**: 2 weeks (includes App Store review)

---

### Samsung Health (Android) Checklist

#### Step 1: Setup
- [ ] Register at https://developer.samsung.com/health
- [ ] Download Samsung Health Data SDK
- [ ] Add to gradle dependencies
- [ ] Update AndroidManifest.xml

#### Step 2: Implement Samsung Health SDK
- [ ] Create health data service
- [ ] Initialize HealthDataStore
- [ ] Request step count permission
- [ ] Request heart rate permission
- [ ] Request sleep permission
- [ ] Implement data reading

#### Step 3: Data Syncing
- [ ] Create endpoint to send Android data to backend
- [ ] Implement daily sync
- [ ] Handle permission flows
- [ ] Sync historical data on connection

#### Step 4: Testing
- [ ] Test on real Android device (API 29+)
- [ ] Test with Samsung device (preferred)
- [ ] Test permission flows
- [ ] Verify data accuracy

**Estimated Time**: 2 weeks

---

## Phase 3: Advanced Integration (Week 5+)

### Garmin Implementation Checklist (For Later)

#### Step 1: Business Setup
- [ ] Apply to Garmin Developer Program
- [ ] Complete business vetting
- [ ] Pay $5,000 administrative fee
- [ ] Receive Consumer Key & Secret
- [ ] Request detailed documentation access

#### Step 2: Webhook Setup
- [ ] Register webhook endpoints
- [ ] Implement HMAC verification
- [ ] Handle health data webhooks
- [ ] Handle activity data webhooks

#### Step 3: Data Storage
- [ ] Store webhook payloads in database
- [ ] Parse Garmin data format
- [ ] Create endpoints for accessing stored data
- [ ] Implement data aggregation

#### Step 4: Testing
- [ ] Test webhook delivery
- [ ] Verify HMAC signatures
- [ ] Test error handling
- [ ] Monitor incoming data

**Estimated Time**: 4 weeks+ (includes approval)

---

## Implementation Order Recommendation

### Week 1-2: Foundation (WHOOP + Oura)
```
Day 1-3: Setup WHOOP credentials + basic OAuth
Day 4-5: Implement WHOOP data endpoints
Day 6: Setup Oura credentials
Day 7: Implement Oura OAuth + basic endpoints
```

### Week 3: Expand (Add Fitbit)
```
Day 8-9: Setup Fitbit + PKCE implementation
Day 10-12: Implement Fitbit OAuth + endpoints
Day 13-14: Testing and bug fixes
```

### Week 4: Polish
```
Day 15: Frontend integration for all three
Day 16-18: Testing across platforms
Day 19-20: Documentation and cleanup
```

### Weeks 5+: Mobile (If needed)
```
Week 5-6: iOS HealthKit implementation
Week 7-8: Android Samsung Health implementation
Week 9+: Garmin (business approval process)
```

---

## Database Schema for Providers

```sql
-- User providers (connections)
CREATE TABLE user_providers (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  provider_name VARCHAR(50) NOT NULL,
  access_token TEXT NOT NULL ENCRYPTED,
  refresh_token TEXT ENCRYPTED,
  token_expires_at TIMESTAMP,
  is_primary BOOLEAN DEFAULT false,
  is_connected BOOLEAN DEFAULT true,
  connected_at TIMESTAMP DEFAULT now(),
  last_synced_at TIMESTAMP,
  metadata JSONB,
  UNIQUE(user_id, provider_name)
);

-- Health data (cached from providers)
CREATE TABLE health_metrics (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  provider_name VARCHAR(50) NOT NULL,
  metric_type VARCHAR(100) NOT NULL,
  metric_date DATE NOT NULL,
  metric_value FLOAT NOT NULL,
  unit VARCHAR(50),
  raw_data JSONB,
  synced_at TIMESTAMP DEFAULT now(),
  UNIQUE(user_id, provider_name, metric_type, metric_date)
);

-- OAuth state management
CREATE TABLE oauth_states (
  state VARCHAR(255) PRIMARY KEY,
  provider VARCHAR(50) NOT NULL,
  user_id UUID,
  code_verifier VARCHAR(128), -- For PKCE
  created_at TIMESTAMP DEFAULT now(),
  expires_at TIMESTAMP
);
```

---

## API Endpoints to Implement

### Authentication Endpoints
```
POST /api/auth/{provider}/login        # Initiate OAuth flow
GET  /api/auth/{provider}/callback     # OAuth callback handler
POST /api/auth/{provider}/disconnect   # Revoke provider access
```

### Provider Data Endpoints
```
GET  /api/providers/{provider}/profile        # User profile
GET  /api/providers/{provider}/today          # Today's summary
GET  /api/providers/{provider}/date-range     # Historical data
GET  /api/providers/{provider}/heart-rate     # Heart rate data
GET  /api/providers/{provider}/sleep          # Sleep data
GET  /api/providers/{provider}/activity       # Activity data
POST /api/providers/{provider}/sync           # Force sync
```

### Admin/Dashboard Endpoints
```
GET  /api/providers/list               # List connected providers
GET  /api/providers/status             # Sync status
POST /api/providers/{provider}/refresh # Refresh data
GET  /api/dashboard/metrics            # Aggregated metrics
```

---

## Environment Variables Template

```env
# WHOOP
WHOOP_CLIENT_ID=your_client_id
WHOOP_CLIENT_SECRET=your_client_secret
WHOOP_REDIRECT_URI=https://yourapp.com/auth/whoop/callback

# Fitbit
FITBIT_CLIENT_ID=your_client_id
FITBIT_CLIENT_SECRET=your_client_secret
FITBIT_REDIRECT_URI=https://yourapp.com/auth/fitbit/callback

# Oura
OURA_CLIENT_ID=your_client_id
OURA_CLIENT_SECRET=your_client_secret
OURA_REDIRECT_URI=https://yourapp.com/auth/oura/callback

# Garmin (when ready)
GARMIN_CONSUMER_KEY=your_consumer_key
GARMIN_CONSUMER_SECRET=your_consumer_secret
GARMIN_WEBHOOK_SECRET=your_webhook_secret

# Token encryption
ENCRYPTION_KEY=your_encryption_key_for_tokens

# Sync settings
SYNC_INTERVAL_MINUTES=60
MAX_RETRY_ATTEMPTS=3
```

---

## Testing Checklist

- [ ] Test OAuth flow for each provider
- [ ] Test data fetching
- [ ] Test error handling (invalid tokens, network errors)
- [ ] Test token refresh
- [ ] Test rate limiting
- [ ] Test concurrent provider connections
- [ ] Test data synchronization
- [ ] Test disconnection
- [ ] Security: Verify tokens are encrypted at rest
- [ ] Security: Verify no tokens in logs
- [ ] Performance: Test with large data sets
- [ ] Integration: Test frontend-to-backend flow

---

## Common Gotchas

### WHOOP
- ❌ Forget state parameter for CSRF → Add 8+ char random state
- ❌ Use old v1 API → Migrate to v2 before Oct 2025
- ❌ Store secret in frontend → Always server-side only

### Fitbit
- ❌ Forget PKCE for mobile → Always use PKCE
- ❌ Use HTTP redirect URI → Must be HTTPS
- ❌ Embed OAuth in iframe → Open dedicated browser

### Garmin
- ❌ Expect $0 cost → Budget $5,000 per app
- ❌ Pull data immediately → Webhooks are push-based
- ❌ Skip HMAC verification → Always verify signatures

### Apple Health
- ❌ Request all permissions at once → Ask per-data-type
- ❌ Use simulator for testing → Must use real device
- ❌ Forget privacy policy → App Store requirement

### Samsung Health
- ❌ Use emulator → Only real devices supported
- ❌ Use old SDK → Must migrate to new SDK
- ❌ Assume all data available → May need partnership approval

### Oura
- ❌ Use client-side flow for production → Server-side only
- ❌ Ignore refresh tokens → Implement refresh logic
- ❌ Expect Gen 2 heart rate data → Gen 3+ only

---

## Monitoring & Logging

### What to Log
```javascript
// ✅ DO LOG
- Provider authentication status
- Data sync completion/errors
- Rate limit warnings
- Failed attempts with retry count

// ❌ DON'T LOG
- Full access tokens
- Refresh tokens
- User health data
- Credentials
```

### Monitoring Metrics
- OAuth flow success rate
- Data sync success rate per provider
- Average sync duration
- Rate limit usage
- Token refresh failures
- Provider API error rates

---

This checklist provides everything needed to implement all providers systematically!
