# Provider Authentication & API Integration Guide

Complete authentication details for all supported health/fitness data providers.

---

## 1. WHOOP Band

### Quick Summary
- **Authentication**: OAuth 2.0 (Authorization Code Grant)
- **Credentials Required**: Yes (Client ID, Client Secret, Redirect URI)
- **Approval Process**: Immediate (no formal approval)
- **Web API**: Yes
- **Rate Limits**: Not documented

### Authentication Flow
```
1. User clicks "Connect WHOOP"
2. Redirect to: https://api.prod.whoop.com/oauth/oauth2/auth
3. User authorizes app in WHOOP
4. WHOOP redirects back with authorization code
5. Exchange code for access token (server-side)
6. Use access token to fetch user data
```

### Getting Credentials
1. Go to https://developer-dashboard.whoop.com
2. Sign in with WHOOP account (or create one)
3. Create a Team
4. Create an App
5. Copy: Client ID, Client Secret
6. Set Redirect URI to your server

### Required Scopes
```
- read:recovery     # Recovery score, HRV, resting heart rate
- read:cycles       # Daily cycles, strain, heart rate
- read:workout      # Workout data, heart rate zones
- read:sleep        # Sleep performance, stages
- read:profile      # User name, email
- read:body_measurement  # Height, weight, max heart rate
- offline           # Required for refresh tokens
```

### API Base URL
```
https://api.prod.whoop.com/api
```

### Token Exchange
```bash
POST https://api.prod.whoop.com/oauth/oauth2/token
Content-Type: application/x-www-form-urlencoded

client_id=YOUR_CLIENT_ID
client_secret=YOUR_CLIENT_SECRET
grant_type=authorization_code
code=AUTHORIZATION_CODE
```

### Example Request
```bash
curl -X GET https://api.prod.whoop.com/api/v2/user/profile/basic \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

### Important Notes
- ⚠️ **Migration Required**: Must migrate to v2 API by October 1, 2025
- State parameter required (8+ characters) for CSRF protection
- Access tokens are short-lived; use refresh tokens for long-term access
- Can create up to 5 apps (request more via typeform)

### Documentation
- https://developer.whoop.com/docs/developing/oauth/
- https://developer.whoop.com/api/

---

## 2. Fitbit

### Quick Summary
- **Authentication**: OAuth 2.0 with PKCE (recommended)
- **Credentials Required**: Yes (Client ID, Client Secret, Redirect URI)
- **Approval Process**: Optional (intraday data requires approval)
- **Web API**: Yes
- **Rate Limits**: 150 requests/hour per user

### Authentication Flow
```
1. User clicks "Connect Fitbit"
2. Generate code_challenge and code_verifier (PKCE)
3. Redirect to: https://www.fitbit.com/oauth2/authorize
4. User authorizes in Fitbit
5. Fitbit redirects with authorization code
6. Exchange code for access token using PKCE verifier
7. Use access token to fetch data
```

### Getting Credentials
1. Go to https://dev.fitbit.com/apps/new/
2. Create a new application
3. Set Application Type:
   - **Server**: Multi-tier, server-side auth (recommended for backends)
   - **Client**: Single-tier, client-side auth
   - **Personal**: Developer-only, automatic intraday approval
4. Copy: Client ID, Client Secret
5. Set Redirect URI (must be HTTPS)

### Available Data Scopes
```
- activity          # Activity logs, steps, calories
- heartrate         # Heart rate time series
- sleep             # Sleep logs and stages
- profile           # User profile info
- settings          # Account settings
- weight            # Body measurements
- nutrition         # Food and water tracking
- breathing_rate    # Breathing rate
- cardio_fitness    # VO2 Max
- temperature       # Skin temperature
- spo2              # Blood oxygen (SpO2)
- irregular_rhythm_notifications  # Notifications
```

### API Base URL
```
https://api.fitbit.com/1.2
```

### Token Exchange
```bash
POST https://api.fitbit.com/oauth2/token
Content-Type: application/x-www-form-urlencoded

client_id=YOUR_CLIENT_ID
client_secret=YOUR_CLIENT_SECRET
grant_type=authorization_code
code=AUTHORIZATION_CODE
code_verifier=YOUR_CODE_VERIFIER
redirect_uri=YOUR_REDIRECT_URI
```

### Example Request
```bash
curl -X GET https://api.fitbit.com/1.2/user/-/profile.json \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

### Rate Limit Headers
```
Fitbit-Rate-Limit-Limit: 150
Fitbit-Rate-Limit-Remaining: 145
Fitbit-Rate-Limit-Reset: 1700000000
```

### Important Notes
- ✅ **PKCE Required** for security (especially mobile apps)
- ⚠️ **Intraday data**: Requires separate approval form
- HTTPS redirect URIs only
- OAuth pages must open in dedicated browser (not iframe)
- 150 requests/hour per consented user
- Rate limits reset at top of each hour

### Documentation
- https://dev.fitbit.com/build/reference/web-api/authorization/
- https://dev.fitbit.com/build/reference/web-api/developer-guide/

---

## 3. Garmin

### Quick Summary
- **Authentication**: OAuth 1.0a (push-based model)
- **Credentials Required**: Yes (Consumer Key, Consumer Secret)
- **Approval Process**: Required + $5,000 fee
- **Web API**: Custom (webhook push model)
- **Rate Limits**: Throttled during development (limits not public)

### Authentication Flow (Different from standard OAuth)
```
1. User authorizes in Garmin Connect
2. Garmin pushes data to your registered webhook endpoints
3. Your app processes incoming health data
4. Verify HMAC signature for security
```

### Getting Credentials & Approval
1. Go to https://developer.garmin.com/gc-developer-program/
2. Submit formal application
3. Business vetting process
4. Pay $5,000 administrative fee (covers engineering support)
5. Receive Consumer Key and Consumer Secret
6. Register webhook endpoints

### Available Data
```
INBOUND (Garmin → Your Platform):
- Health API: Heart rate, sleep, steps, stress, Body Battery, Pulse Ox
- Activity API: 30+ activity types with detailed metrics
- Women's Health API: Menstrual cycle, pregnancy tracking

OUTBOUND (Your Platform → Garmin):
- Training API: Push structured workouts to devices
- Courses API: Publish courses for device syncing
```

### Webhook Setup
```
Register endpoints:
- Health: https://your-domain.com/webhooks/garmin/health
- Activity: https://your-domain.com/webhooks/garmin/activity
```

### Example Webhook Payload Verification
```javascript
// Verify HMAC-SHA256 signature
const crypto = require('crypto');
const hmac = crypto.createHmac('sha256', CONSUMER_SECRET);
hmac.update(requestBody);
const signature = hmac.digest('base64');
// Compare with X-OSF-OSF-SIGNATURE-SHA256 header
```

### Important Notes
- 💰 **$5,000 one-time fee** required
- 🔍 **Business approval process** - not for individual developers
- 📤 **Push-based model** - different from standard pull APIs
- State parameter required for CSRF protection
- Must implement secure webhook receivers
- Garmin controls vetting for business use cases

### Documentation
- https://developer.garmin.com/gc-developer-program/
- Request access form required for detailed docs

---

## 4. Apple Health (HealthKit)

### Quick Summary
- **Authentication**: Local device entitlements (no OAuth)
- **Credentials Required**: Apple Developer account ($99/year)
- **Approval Process**: App Store review
- **Web API**: No (iOS only)
- **Rate Limits**: None (local device storage)

### Authentication Flow
```
1. User installs your iOS app
2. App requests HealthKit permission during first run
3. iOS shows permission dialog for each data type
4. User grants/denies access
5. App accesses HealthKit data locally (no server communication)
```

### Getting Started
1. Enroll in Apple Developer Program ($99/year)
2. Create App ID with HealthKit capability
3. In Xcode: Capabilities → HealthKit
4. Add privacy descriptions to Info.plist

### Available Data Types (100+)
```
Primary:
- HKQuantityTypeIdentifierStepCount
- HKQuantityTypeIdentifierHeartRate
- HKQuantityTypeIdentifierHeartRateVariabilitySDNN
- HKCategoryTypeIdentifierSleepAnalysis
- HKQuantityTypeIdentifierActiveEnergyBurned
- HKQuantityTypeIdentifierBasalEnergyBurned
- HKWorkoutTypeIdentifier
- HKQuantityTypeIdentifierBodyMass
- HKQuantityTypeIdentifierHeight
- HKQuantityTypeIdentifierBloodOxygenSaturation
- HKQuantityTypeIdentifierRespiratoryRate
- HKQuantityTypeIdentifierBloodGlucose
- HKQuantityTypeIdentifierBloodPressure
- HKQuantityTypeIdentifierDietaryEnergyConsumed
- And 85+ more...
```

### Example Implementation (Swift)
```swift
import HealthKit

let healthStore = HKHealthStore()

// Request permissions
let typesToRead = Set([HKObjectType.workoutType(),
                       HKObjectType.quantityType(forIdentifier: .heartRate)!])

healthStore.requestAuthorization(toShare: nil, read: typesToRead) { success, error in
    if success {
        // Query data
        let query = HKSampleQuery(sampleType: quantityType,
                                  predicate: nil,
                                  limit: HKObjectQueryNoLimit,
                                  sortDescriptors: nil) { query, samples, error in
            // Process samples
        }
        healthStore.execute(query)
    }
}
```

### Privacy Requirements
1. Add to Info.plist:
   ```xml
   <key>NSHealthShareUsageDescription</key>
   <string>We need access to your health data to provide personalized insights</string>
   <key>NSHealthUpdateUsageDescription</key>
   <string>We need to write health data with your permission</string>
   ```

2. Privacy Policy must explain:
   - Why you need each data type
   - How data is used
   - Data retention policy
   - No sale to third parties

### Important Notes
- 📱 **iOS/watchOS/macOS only** - No web or Android support
- 🔒 **Local storage only** - Data never leaves device (except what app sends)
- 👥 **Per-data-type permissions** - User grants access individually
- 🚫 **Cannot use for advertising** - App Store review requirement
- 🔐 **Cannot share data** - Without explicit user consent
- 📋 **Mandatory privacy policy** - App Store submission requirement
- ♻️ **User can revoke** - At any time via Settings → Privacy → Health

### Documentation
- https://developer.apple.com/documentation/healthkit
- https://developer.apple.com/documentation/healthkit/authorizing-access-to-health-data

---

## 5. Samsung Health

### Quick Summary
- **Authentication**: Local device SDK (no OAuth)
- **Credentials Required**: Samsung Developer account
- **Approval Process**: Partnership request for write access
- **Web API**: No (Android only)
- **Rate Limits**: None (local device storage)

### Authentication Flow
```
1. User installs your Android app
2. App integrates Samsung Health Data SDK
3. App requests data access permissions
4. User grants/denies via app dialog
5. App accesses Samsung Health locally (no server communication)
```

### Getting Started
1. Register at https://developer.samsung.com/health
2. Download Samsung Health Data SDK
3. Add to Android project:
   ```gradle
   dependencies {
       implementation 'com.samsung.android:health-data-sdk:1.0.0'
   }
   ```
4. Request partnership for write access (if needed)

### Available Data Types (20+ read, 10+ write)

**Read Data:**
```
- STEP_COUNT
- ACTIVE_CALORIES
- ACTIVE_TIME
- BLOOD_GLUCOSE
- BLOOD_OXYGEN
- BLOOD_PRESSURE
- BODY_COMPOSITION
- BODY_TEMPERATURE
- SKIN_TEMPERATURE
- ENERGY_SCORE
- EXERCISE
- FLOORS_CLIMBED
- HEART_RATE
- NUTRITION
- SLEEP
- WATER_INTAKE
- USER_PROFILE
```

**Write Data:**
```
- BLOOD_GLUCOSE
- BLOOD_OXYGEN
- BLOOD_PRESSURE
- BODY_COMPOSITION
- BODY_TEMPERATURE
- EXERCISE
- FLOORS_CLIMBED
- HEART_RATE
- NUTRITION
- WATER_INTAKE
```

### Example Implementation (Kotlin)
```kotlin
import com.samsung.android.sdk.healthdata.*

val healthDataStore = HealthDataStore(context)
val connectionListener = object : HealthDataStore.ConnectionListener {
    override fun onConnected() {
        // Request read permissions
        val permissions = setOf(
            HealthDataTypes.TYPE_HEART_RATE,
            HealthDataTypes.TYPE_STEP_COUNT,
            HealthDataTypes.TYPE_SLEEP
        )
        healthDataStore.requestPermissions(permissions) { result ->
            if (result == HealthDataStore.ConnectionListener.RESULT_SUCCESS) {
                // Read data
                val reader = HealthDataResolver(healthDataStore)
                    .read(HealthDataTypes.TYPE_STEP_COUNT)
                    .setLocalTimeRange(startTime, endTime)
                    .execute()
                // Process results
            }
        }
    }
}
healthDataStore.connectService(connectionListener)
```

### Important Notes
- 📱 **Android 10+ (API 29)** required
- 🔒 **Local storage only** - Data stays on device
- ⚠️ **No emulator support** - Must use real device
- 📋 **Old SDK deprecated** - Must migrate to Samsung Health Data SDK
- 💼 **Partnership for writes** - Need to request access for write operations
- 🔐 **User consent required** - Explicit permission before access

### Documentation
- https://developer.samsung.com/health/data/overview.html
- https://developer.samsung.com/health (new SDK portal)

---

## 6. Oura Ring

### Quick Summary
- **Authentication**: OAuth 2.0 (Server-Side flow recommended)
- **Credentials Required**: Yes (Client ID, Client Secret, Redirect URI)
- **Approval Process**: No formal approval
- **Web API**: Yes
- **Rate Limits**: 5,000 requests per 5-minute period

### Authentication Flow
```
1. User clicks "Connect Oura Ring"
2. Redirect to: https://cloud.ouraring.com/oauth/authorize
3. User authorizes app in Oura
4. Oura redirects back with authorization code
5. Exchange code for access token (server-side)
6. Use access token to fetch user data
```

### Getting Credentials
1. Go to https://cloud.ouraring.com/oauth/applications
2. Sign in with Oura account
3. Click "My Applications"
4. Create new application
5. Copy: Client ID, Client Secret
6. Add Redirect URI(s) to whitelist

### Available Data Scopes
```
- email              # User email address
- personal           # Gender, age, height, weight
- daily              # Sleep, activity, readiness summaries
- heartrate          # Time series heart rate (Gen 3+ only)
- workout            # Workout summaries
- tag                # User-entered tags
- session            # Guided/unguided sessions (meditation, etc.)
- spo2               # Daily SpO2 averages during sleep
```

### API Base URL
```
https://api.ouraring.com
```

### Token Exchange
```bash
POST https://api.ouraring.com/oauth/token
Content-Type: application/x-www-form-urlencoded

client_id=YOUR_CLIENT_ID
client_secret=YOUR_CLIENT_SECRET
grant_type=authorization_code
code=AUTHORIZATION_CODE
redirect_uri=YOUR_REDIRECT_URI
```

### Example Request
```bash
curl -X GET https://api.ouraring.com/v2/user/profile \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

### Rate Limits
```
5,000 requests per 5-minute period
Returns HTTP 429 if exceeded
Contact Oura if expecting higher usage
```

### Important Notes
- ✅ **No approval process** - Immediate access
- 🔄 **Two OAuth flows**:
  - **Server-Side** (recommended): Supports refresh tokens
  - **Client-Side**: 30-day token validity, no refresh
- 🔐 **Credentials as URL params or HTTP Basic Auth**
- 📊 **Gen 3+ for heartrate**: Generation 2 rings don't have this data
- 📈 **High rate limit**: 5,000 requests per 5 minutes
- 🔑 **Refresh tokens**: Use server-side flow for automatic token renewal

### Documentation
- https://cloud.ouraring.com/docs/authentication
- https://cloud.ouraring.com/v2/docs
- https://developer.ouraring.com/docs/api/v2/oura-api-documentation

---

## Implementation Priority

### Tier 1: Easiest to Implement (Start Here)
1. **WHOOP** - Standard OAuth 2.0, immediate approval, good documentation
2. **Oura** - Standard OAuth 2.0, no approval needed, high rate limits
3. **Fitbit** - Standard OAuth 2.0 with PKCE, well-documented

### Tier 2: Platform-Specific (Requires Mobile Apps)
4. **Apple Health** - iOS only, requires app development
5. **Samsung Health** - Android only, requires app development

### Tier 3: Requires Business Approval
6. **Garmin** - $5,000 fee, formal approval, push-based model

---

## Common Implementation Patterns

### OAuth 2.0 Authorization Code Flow (WHOOP, Fitbit, Oura)
```
Frontend                    Backend                  Provider
   |                          |                         |
   |--Connect Provider-------->|                         |
   |                          |--Redirect to Auth URL-->|
   |<---Redirect Back---------|                         |
   |                          |<--Auth Code-------------|
   |                          |--Exchange Code--------->|
   |                          |<--Access Token---------|
   |<---Logged In------------|
   |                          |--Fetch Data------------>|
   |<---User Data----------|<--User Data-----------|
```

### Local Device Auth (Apple Health, Samsung Health)
```
Mobile App               HealthKit/Samsung Health
   |                            |
   |--Request Permission------->|
   |<--Permission Dialog--------|
   |--User Grants Access------->|
   |<--Permission Granted-------|
   |--Query Data Local--------->|
   |<--Data Returned----------|
```

### Push-Based (Garmin)
```
Your Server              Garmin Servers
   |                         |
   |--Register Webhook----->|
   |<--Confirmation---------|
   |<--Health Data Push-----|
   |--Verify HMAC--------->|
   |--Store Data---------->|
```

---

## Security Considerations

### Do's ✅
- Store credentials server-side only
- Use HTTPS for all communications
- Implement CSRF protection (state parameter)
- Validate webhook signatures (HMAC)
- Use refresh tokens for long-term access
- Encrypt stored access tokens
- Implement secure token refresh logic

### Don'ts ❌
- Never expose Client Secret in frontend code
- Never store tokens in local storage (use httpOnly cookies)
- Never log full access tokens
- Never commit credentials to git
- Never use hardcoded redirect URIs
- Never trust unverified webhook payloads

---

## Environment Setup

### Required Environment Variables
```env
# WHOOP
WHOOP_CLIENT_ID=xxx
WHOOP_CLIENT_SECRET=xxx
WHOOP_REDIRECT_URI=https://yourapp.com/auth/whoop/callback

# Fitbit
FITBIT_CLIENT_ID=xxx
FITBIT_CLIENT_SECRET=xxx
FITBIT_REDIRECT_URI=https://yourapp.com/auth/fitbit/callback

# Garmin
GARMIN_CONSUMER_KEY=xxx
GARMIN_CONSUMER_SECRET=xxx
GARMIN_WEBHOOK_SECRET=xxx

# Oura
OURA_CLIENT_ID=xxx
OURA_CLIENT_SECRET=xxx
OURA_REDIRECT_URI=https://yourapp.com/auth/oura/callback

# Apple Health (iOS app only - no environment variables needed)
# Samsung Health (Android app only - no environment variables needed)
```

---

## Testing & Development

### Development Redirect URIs
- Localhost: `http://localhost:3000/auth/[provider]/callback`
- Staging: `https://staging.yourapp.com/auth/[provider]/callback`
- Production: `https://yourapp.com/auth/[provider]/callback`

### Testing Accounts
- Create test accounts on each provider's platform
- Most providers allow multiple connected apps for testing
- Some require approval before accessing production data

### Rate Limit Testing
- Fitbit: Test with <150 requests/hour
- Oura: Test with <5,000 requests per 5 minutes
- Others: Check documentation

---

This guide should give you everything needed to implement each provider's authentication!
