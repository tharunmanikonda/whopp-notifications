# Fitbit Integration: Complete Implementation Guide

Comprehensive documentation for integrating Fitbit as a health data provider. This guide covers OAuth setup, API endpoints, webhooks, rate limiting, and production-ready code examples.

---

## Table of Contents

1. [Authentication & OAuth 2.0](#authentication--oauth-20)
2. [API Endpoints](#api-endpoints)
3. [Webhook System](#webhook-system)
4. [Rate Limiting & Scaling](#rate-limiting--scaling)
5. [Data Types & Freshness](#data-types--freshness)
6. [Code Examples](#code-examples)
7. [vs WHOOP Comparison](#vs-whoop-comparison)
8. [Production Checklist](#production-checklist)

---

## Authentication & OAuth 2.0

### Getting Fitbit Credentials

1. **Register as Developer**
   - Visit https://dev.fitbit.com
   - Create Fitbit account (if needed)
   - Navigate to "Manage My Apps"

2. **Create New Application**
   - Click "Register an App"
   - Fill required fields:
     - **Application Name**: Your app name
     - **Description**: Brief description
     - **Application Type**: Choose one:
       - **Server**: Multi-tier, server-side token exchange (recommended for backends)
       - **Client**: Single-tier, client-side auth
       - **Personal**: Developer-only app with automatic intraday approval

3. **Copy Credentials**
   - Save: **Client ID**
   - Save: **Client Secret**
   - Note: Application Credentials (different from User ID)

4. **Configure Redirect URI**
   - Must be HTTPS (localhost HTTP allowed for development)
   - Example: `https://yourdomain.com/api/oauth/fitbit/callback`
   - Add exact URI to app settings
   - Can add multiple URIs for different environments

### OAuth 2.0 Authorization Code Flow with PKCE

Fitbit recommends PKCE (Proof Key for Code Exchange) for enhanced security, especially for mobile apps.

**Step 1: Generate PKCE Parameters**

```typescript
import crypto from 'crypto';

function generateCodeVerifier(): string {
  // Generate 128-character random string
  return crypto.randomBytes(96).toString('base64url');
}

function generateCodeChallenge(verifier: string): string {
  // SHA256 hash of verifier
  const hash = crypto.createHash('sha256').update(verifier).digest();
  return hash.toString('base64url');
}

const codeVerifier = generateCodeVerifier();
const codeChallenge = generateCodeChallenge(codeVerifier);
```

**Step 2: Generate Authorization URL**

```typescript
function generateFitbitAuthUrl(codeChallenge: string): string {
  const params = new URLSearchParams({
    client_id: process.env.FITBIT_CLIENT_ID!,
    response_type: 'code',
    scope: [
      'activity',
      'heartrate',
      'sleep',
      'profile',
      'nutrition',
      'weight',
      'temperature',
      'spo2',
      'breathing_rate',
      'cardio_fitness',
    ].join(' '),
    redirect_uri: process.env.FITBIT_REDIRECT_URI!,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256', // PKCE method
  });

  return `https://www.fitbit.com/oauth2/authorize?${params.toString()}`;
}
```

**Step 3: Exchange Authorization Code**

```typescript
async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const response = await fetch('https://api.fitbit.com/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(
        `${process.env.FITBIT_CLIENT_ID}:${process.env.FITBIT_CLIENT_SECRET}`
      ).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.FITBIT_REDIRECT_URI!,
      code_verifier: codeVerifier,
    }).toString(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Token exchange failed: ${error.error_description}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in, // Usually 28800 seconds (8 hours)
  };
}
```

**Step 4: Refresh Expired Tokens**

```typescript
async function refreshAccessToken(refreshToken: string): Promise<string> {
  const response = await fetch('https://api.fitbit.com/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(
        `${process.env.FITBIT_CLIENT_ID}:${process.env.FITBIT_CLIENT_SECRET}`
      ).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }).toString(),
  });

  if (!response.ok) {
    const error = await response.json();
    if (error.error === 'invalid_grant') {
      throw new Error('Refresh token expired - user must re-authenticate');
    }
    throw new Error(`Token refresh failed: ${error.error_description}`);
  }

  const data = await response.json();
  return data.access_token;
}
```

### Key Authentication Details

| Parameter | Value | Notes |
|-----------|-------|-------|
| **OAuth Version** | 2.0 | Authorization Code Grant |
| **PKCE Support** | Required | S256 (SHA256) method |
| **Scopes** | See below | Requested on initial consent |
| **Token Lifetime** | 8 hours | Access token expiration |
| **Refresh Lifetime** | ~365 days | Estimated, exact duration not documented |
| **Token Type** | Bearer | Use in Authorization header |
| **Consent Revocation** | User-controlled | Via Fitbit account settings |

### Available Scopes

```
activity             # Activity logs, exercise logs
heartrate            # Heart rate measurements
sleep                # Sleep logs and sleep stages
profile              # User profile information
settings             # Account settings
weight               # Body weight, body composition
nutrition            # Food intake, nutrition data
breathing_rate       # Breathing rate measurements
cardio_fitness       # VO2 Max, aerobic base
temperature          # Skin temperature
spo2                 # Blood oxygen saturation (SpO2)
irregular_rhythm_notifications  # AFib notifications
```

---

## API Endpoints

### Base URL
```
https://api.fitbit.com/1.2
```

### Heart Rate Endpoints

**Get Intraday Heart Rate (1-minute intervals)**
```
GET /user/{user-id}/activities/heart/date/{date}/1min.json
GET /user/{user-id}/activities/heart/date/{date}/1min/time/{start-time}/{end-time}.json
```

Response:
```json
{
  "activities-heart-intraday": {
    "datapoints": [
      {
        "time": "00:00:00",
        "value": 62
      },
      {
        "time": "00:01:00",
        "value": 63
      }
    ]
  },
  "activities-heart": [
    {
      "dateTime": "2025-11-22",
      "value": {
        "customHeartRateZones": [],
        "heartRateZones": [
          {
            "name": "Out of Range",
            "min": 0,
            "max": 104,
            "minutes": 1350
          },
          {
            "name": "Fat Burn",
            "min": 104,
            "max": 135,
            "minutes": 60
          }
        ],
        "restingHeartRate": 62
      }
    }
  ]
}
```

**Requires**: `heartrate` scope + intraday data approval

**Get Daily Heart Rate**
```
GET /user/{user-id}/activities/heart/date/{date}.json
GET /user/{user-id}/activities/heart/date/{start-date}/{end-date}.json
```

**Requires**: `heartrate` scope

### Sleep Endpoints

**Get Sleep Logs**
```
GET /user/{user-id}/sleep/date/{date}.json
GET /user/{user-id}/sleep/date/{start-date}/{end-date}.json
```

Response:
```json
{
  "sleep": [
    {
      "dateOfSleep": "2025-11-22",
      "startTime": "2025-11-21T22:30:00.000",
      "endTime": "2025-11-22T06:45:00.000",
      "duration": 29100000,
      "efficiency": 92,
      "levels": {
        "summary": {
          "deep": {
            "count": 5,
            "minutes": 75
          },
          "light": {
            "count": 15,
            "minutes": 195
          },
          "rem": {
            "count": 3,
            "minutes": 90
          },
          "wake": {
            "count": 2,
            "minutes": 15
          }
        },
        "data": [
          {
            "dateTime": "2025-11-21T22:30:00.000",
            "level": "wake",
            "seconds": 180
          }
        ]
      },
      "type": "stages",
      "mainSleep": true
    }
  ]
}
```

**Requires**: `sleep` scope

### Activity Endpoints

**Get Activity Logs**
```
GET /user/{user-id}/activities/date/{date}.json
GET /user/{user-id}/activities/date/{start-date}/{end-date}.json
```

Response:
```json
{
  "activities": [
    {
      "activityId": 12345,
      "activityName": "Run",
      "activityTypeId": 90009,
      "calories": 250,
      "duration": 1800000,
      "startTime": "10:30",
      "steps": 2500,
      "distance": 2.5,
      "activityLevel": [
        {
          "name": "Sedentary",
          "minutes": 0
        },
        {
          "name": "Lightly Active",
          "minutes": 0
        },
        {
          "name": "Fairly Active",
          "minutes": 30
        },
        {
          "name": "Very Active",
          "minutes": 0
        }
      ]
    }
  ],
  "summary": {
    "steps": 8000,
    "distance": 5.5,
    "floors": 20,
    "elevation": 150,
    "caloriesBurned": 500,
    "activityCalories": 200,
    "veryActiveMinutes": 45,
    "fairlyActiveMinutes": 60,
    "lightlyActiveMinutes": 120,
    "sedentaryMinutes": 1020
  }
}
```

**Requires**: `activity` scope

### Body Metrics Endpoints

**Get Weight**
```
GET /user/{user-id}/body/weight/date/{date}.json
GET /user/{user-id}/body/weight/date/{start-date}/{end-date}.json
```

**Get Body Composition**
```
GET /user/{user-id}/body/fat/date/{date}.json
GET /user/{user-id}/body/fat/date/{start-date}/{end-date}.json
```

**Requires**: `weight` scope

### SpO2 Endpoint

**Get Blood Oxygen**
```
GET /user/{user-id}/spo2/date/{date}.json
GET /user/{user-id}/spo2/date/{start-date}/{end-date}.json
```

Response:
```json
{
  "dateTime": "2025-11-22",
  "value": {
    "avg": 97,
    "min": 94,
    "max": 99
  }
}
```

**Requires**: `spo2` scope

### Profile Endpoint

**Get User Profile**
```
GET /user/-/profile.json
```

Response:
```json
{
  "user": {
    "aboutMe": "Health enthusiast",
    "age": 30,
    "avatar": "https://platform.slack-edge.com/...",
    "avatar150": "https://...",
    "city": "New York",
    "clockTimeDisplayFormat": "12hour",
    "country": "US",
    "dateOfBirth": "1995-01-15",
    "displayName": "John Doe",
    "distanceUnit": "en_US",
    "encodedId": "ABC123",
    "firstName": "John",
    "foodsLocale": "en_US",
    "fullName": "John Doe",
    "gender": "MALE",
    "height": 180,
    "heightUnit": "cm",
    "lastName": "Doe",
    "locale": "en_US",
    "offsetFromUTCMillis": -18000000,
    "state": "NY",
    "strideLengthRunning": 0.84,
    "strideLengthWalking": 0.72,
    "timezone": "America/New_York",
    "topBadges": [],
    "weight": 75,
    "weightUnit": "kg"
  }
}
```

**Requires**: `profile` scope

### Parameter Reference

| Parameter | Format | Example |
|-----------|--------|---------|
| `{user-id}` | String or "-" | `-` (current user) or `ABC123DEF` |
| `{date}` | YYYY-MM-DD | `2025-11-22` |
| `{start-date}` | YYYY-MM-DD | `2025-11-01` |
| `{end-date}` | YYYY-MM-DD | `2025-11-22` |
| `{start-time}` | HH:mm | `10:30` |
| `{end-time}` | HH:mm | `14:45` |

### Using "-" for Current User

Always use `"-"` instead of hardcoding user ID:

```typescript
async function getHeartRate(accessToken: string, date: string) {
  const response = await fetch(
    `https://api.fitbit.com/1.2/user/-/activities/heart/date/${date}/1min.json`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );
  return response.json();
}
```

---

## Webhook System

### Webhook Overview

Fitbit webhooks deliver near real-time notifications when user data is synchronized to Fitbit servers.

**Important**: Unlike WHOOP, Fitbit **does NOT retry failed webhook deliveries**. You must implement a backup polling mechanism.

### Supported Collection Types

| Type | Triggered When | Payload Size |
|------|----------------|--------------|
| `activities` | Activity synced | ~2KB |
| `sleep` | Sleep session synced | ~1KB |
| `heartrate` | Heart rate data synced | ~500B |
| `profile` | User profile changed | ~500B |
| `body` | Body metrics (weight) synced | ~500B |
| `foods` | Food entry recorded | ~1KB |
| `nutrition` | Nutrition data updated | ~1KB |
| `water` | Water logged | ~500B |
| `weeklySummary` | Weekly summary generated | ~2KB |
| `meals` | Meal entry recorded | ~1KB |
| `weights` | Weight scale reading | ~500B |
| `fat` | Body fat measured | ~500B |
| `calories` | Calorie data updated | ~500B |

### Register Webhook

**Request:**
```bash
POST https://api.fitbit.com/1.2/user/-/notifications/subscriptions/collectionType/{collection-type}/subscriptionId/{subscription-id}.json

Authorization: Bearer ACCESS_TOKEN
Content-Type: application/x-www-form-urlencoded

subscriberId=YOUR_SUBSCRIBER_ID
callbackUrl=https://your-domain.com/webhooks/fitbit/{collection-type}
```

**Example:**
```bash
curl -X POST \
  https://api.fitbit.com/1.2/user/-/notifications/subscriptions/collectionType/activities/subscriptionId/123.json \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d "subscriberId=YOUR_SUBSCRIBER_ID&callbackUrl=https://yourapp.com/webhooks/fitbit/activities"
```

**Response:**
```json
{
  "subscriptionId": "123",
  "collectionType": "activities",
  "requesterId": "YOUR_SUBSCRIBER_ID",
  "subscriberId": "YOUR_SUBSCRIBER_ID",
  "callbackUrl": "https://yourapp.com/webhooks/fitbit/activities",
  "creationTime": 1700000000000,
  "status": "ACTIVE"
}
```

### List Subscriptions

```bash
GET https://api.fitbit.com/1.2/user/-/notifications/subscriptions.json
Authorization: Bearer ACCESS_TOKEN
```

Response shows all active webhook subscriptions.

### Remove Subscription

```bash
DELETE https://api.fitbit.com/1.2/user/-/notifications/subscriptions/collectionType/{collection-type}/subscriptionId/{subscription-id}.json
Authorization: Bearer ACCESS_TOKEN
```

### Webhook Payload

**Example Webhook Request from Fitbit:**

```json
[
  {
    "collectionType": "activities",
    "date": "2025-11-22",
    "ownerId": "ABC123DEF",
    "ownerType": "USER",
    "subscriptionId": "456"
  }
]
```

**Key Points:**
- Webhook **does NOT contain actual data**, only notification
- Must call API endpoint to fetch actual data
- `ownerId` = user's encoded Fitbit ID
- `subscriptionId` = matches your registration

### Webhook Signature Verification

Fitbit uses **HMAC-SHA1** (not SHA256) for signature verification.

```typescript
import crypto from 'crypto';

function verifyFitbitWebhookSignature(
  payload: string,
  xFitbitSignatureHeader: string,
  consumerSecret: string
): boolean {
  // Fitbit uses HMAC-SHA1
  const hmac = crypto
    .createHmac('sha1', consumerSecret)
    .update(payload)
    .digest('base64');

  return hmac === xFitbitSignatureHeader;
}

// In your webhook handler:
app.post('/webhooks/fitbit/activities', async (c) => {
  const payload = await c.req.text();
  const signature = c.req.header('X-Fitbit-Signature-SHA1');

  if (!signature || !verifyFitbitWebhookSignature(payload, signature, process.env.FITBIT_CLIENT_SECRET!)) {
    console.error('Invalid webhook signature');
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // Process webhook
  const data = JSON.parse(payload);
  // ... fetch actual data from API
  return c.json({ status: 'ok' });
});
```

### Webhook Handler Pattern

```typescript
import { Hono } from 'hono';
import crypto from 'crypto';

const app = new Hono();

async function fetchActivityData(
  userId: string,
  date: string,
  accessToken: string
): Promise<any> {
  const response = await fetch(
    `https://api.fitbit.com/1.2/user/${userId}/activities/date/${date}.json`,
    {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    }
  );
  return response.json();
}

app.post('/webhooks/fitbit/activities', async (c) => {
  try {
    const payload = await c.req.text();
    const signature = c.req.header('X-Fitbit-Signature-SHA1');

    // Verify signature
    const hmac = crypto
      .createHmac('sha1', process.env.FITBIT_CLIENT_SECRET!)
      .update(payload)
      .digest('base64');

    if (signature !== hmac) {
      return c.json({ error: 'Invalid signature' }, 401);
    }

    // Parse webhook events
    const events = JSON.parse(payload) as Array<{
      collectionType: string;
      date: string;
      ownerId: string;
      subscriptionId: string;
    }>;

    for (const event of events) {
      // Get user's access token from database
      const { accessToken } = await db.query(
        'SELECT access_token FROM user_health_providers WHERE provider_name = ? AND fitbit_id = ?',
        ['fitbit', event.ownerId]
      );

      // Fetch actual activity data from API
      const activityData = await fetchActivityData(
        event.ownerId,
        event.date,
        accessToken
      );

      // Store in database
      await db.query(
        'INSERT INTO user_metrics (user_id, provider, date, data) VALUES (?, ?, ?, ?)',
        [event.ownerId, 'fitbit', event.date, JSON.stringify(activityData)]
      );
    }

    return c.json({ status: 'processed' });
  } catch (error) {
    console.error('Webhook error:', error);
    return c.json({ error: 'Processing failed' }, 500);
  }
});

export default app;
```

---

## Rate Limiting & Scaling

### Rate Limit Tiers

Fitbit uses **per-user rate limiting** (different from WHOOP's global limit):

| Tier | Requests per Hour | Scope |
|------|------------------|-------|
| **Default** | 150 | Per authenticated user |
| **Premium** | 300 | Per authenticated user (available upon request) |
| **Enterprise** | Custom | Contact Fitbit |

### Rate Limit Headers

Every Fitbit API response includes rate limit info:

```
Fitbit-Rate-Limit-Limit: 150
Fitbit-Rate-Limit-Remaining: 145
Fitbit-Rate-Limit-Reset: 1700000000
```

### Rate Limit Reset

- Rate limits reset at the **top of each hour** (not a sliding window)
- Example: If you hit limit at 10:45, you must wait until 11:00 (15 min)
- `Fitbit-Rate-Limit-Reset` = Unix timestamp when limit resets

### Scaling Analysis

**Scenario: 10,000 users, daily data fetch**

```
Endpoints needed:
- Heart rate (1 call): 150 req/user × 10,000 users = 1.5M req/day
- Sleep (1 call): 150 req/user × 10,000 users = 1.5M req/day
- Activity (1 call): 150 req/user × 10,000 users = 1.5M req/day
- Profile (1 call): 150 req/user × 10,000 users = 1.5M req/day

Total: 6M requests/day
Per-user allocation: 150 req/hour × 24 hours = 3,600 req/user/day ✅

Conclusion: Each user can make 3,600 requests/day with 150/hr limit
With webhooks as primary, polling 1x/day is feasible
```

**Benefits vs WHOOP:**
- WHOOP: 10,000 req/min globally = 14.4M req/day for entire app
- Fitbit: 150 req/user = 3,600 req/user/day (distributed load)
- Fitbit scales better: each user has dedicated quota

### Implementation Strategy

**Recommended for 1-10k users:**

1. **Use webhooks as primary data source**
   - Register for: `activities`, `sleep`, `heartrate`, `body`
   - Fetch data immediately when notified

2. **Implement backup polling**
   - Since Fitbit doesn't retry webhooks, missed notifications must be caught
   - Poll each user once daily: ~24 hours after previous sync
   - Stagger polling across all users evenly

3. **Batch API calls**
   - Use date ranges to reduce request count:
     ```
     GET /user/-/activities/date/2025-11-01/2025-11-22.json
     ```
   - Fetches all activities in range with 1 request

4. **Cache responses aggressively**
   - Cache for 15-20 minutes (Fitbit's typical sync interval)
   - After webhook, update cache immediately
   - Reduces duplicate API calls

### Rate Limit Tracking Code

```typescript
interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
}

function extractRateLimit(response: Response): RateLimitInfo {
  return {
    limit: parseInt(response.headers.get('Fitbit-Rate-Limit-Limit') || '150'),
    remaining: parseInt(response.headers.get('Fitbit-Rate-Limit-Remaining') || '0'),
    reset: parseInt(response.headers.get('Fitbit-Rate-Limit-Reset') || '0'),
  };
}

async function makeRateLimitedRequest(
  userId: string,
  endpoint: string,
  accessToken: string
): Promise<{ data: any; rateLimit: RateLimitInfo }> {
  const response = await fetch(`https://api.fitbit.com/1.2${endpoint}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });

  const rateLimit = extractRateLimit(response);

  // Store rate limit info in database
  await db.query(
    'UPDATE user_health_providers SET rate_limit_remaining = ?, rate_limit_reset = ? WHERE user_id = ?',
    [rateLimit.remaining, rateLimit.reset, userId]
  );

  // If approaching limit, queue next request for after reset
  if (rateLimit.remaining < 10) {
    const resetTime = new Date(rateLimit.reset * 1000);
    console.warn(`User ${userId} approaching rate limit. Reset at ${resetTime}`);
    // Add to queue for retry after reset
  }

  if (!response.ok) {
    throw new Error(`Fitbit API error: ${response.status}`);
  }

  return {
    data: await response.json(),
    rateLimit,
  };
}
```

---

## Data Types & Freshness

### Data Synchronization Timeline

Fitbit devices sync data to Fitbit servers on various schedules:

| Device Type | Typical Sync Frequency |
|-------------|----------------------|
| Fitbit Watch | 15-20 minutes |
| Fitbit Tracker | 15-20 minutes |
| Fitbit Scale | Immediately |
| Manual Entry | Immediate |

### Data Availability

After device syncs → Fitbit processes → API returns within **15-20 minutes**

**Example Timeline:**
- 10:30 - User completes workout
- 10:35 - Device syncs data to Fitbit servers
- 10:40 - Data available via API
- 10:45 - Your webhook fires (if registered)

### Heart Rate Granularity

Heart rate data available at different resolutions:

**1-minute intervals** (intraday):
```
GET /user/-/activities/heart/date/{date}/1min.json
GET /user/-/activities/heart/date/{date}/1min/time/{start}/{end}.json
```

**Requires**: `heartrate` scope + **intraday data approval** (separate form)

**5-minute intervals** (if intraday not approved):
- Still available, but aggregated

**Daily summary**:
```
GET /user/-/activities/heart/date/{date}.json
```

### Which Data Requires Special Approval?

| Scope | Needs Approval? | Details |
|-------|-----------------|---------|
| `activity` | No | Exercise logs accessible |
| `heartrate` | **Yes** | Intraday HR requires form |
| `sleep` | No | Sleep logs accessible |
| `profile` | No | Basic profile info |
| `weight` | No | Body weight accessible |
| `spo2` | No | SpO2 data accessible |
| `breathing_rate` | No | Breathing rate accessible |
| `cardio_fitness` | No | VO2 Max accessible |
| `temperature` | No | Skin temperature accessible |

**Requesting Intraday Data Approval:**
1. Log into dev.fitbit.com
2. Go to App Settings
3. Request "Intraday Time Series" scope
4. Fitbit reviews (usually within 24 hours)
5. May ask about use case (health monitoring, research, etc.)

### Data Types Available

**Activities (with intraday support)**
```typescript
{
  activities: [
    {
      activityId: number;
      activityName: string;
      activityTypeId: number;
      calories: number;
      distance: number;
      duration: number; // milliseconds
      startTime: string; // HH:mm format
      steps: number;
    }
  ];
  summary: {
    steps: number;
    distance: number;
    floors: number;
    elevation: number;
    caloriesBurned: number;
    activityCalories: number;
    veryActiveMinutes: number;
    fairlyActiveMinutes: number;
    lightlyActiveMinutes: number;
    sedentaryMinutes: number;
  };
}
```

**Heart Rate (1-minute intervals with intraday approval)**
```typescript
{
  "activities-heart": [
    {
      "dateTime": "2025-11-22",
      "value": {
        "heartRateZones": [
          {
            "name": "Out of Range",
            "min": 0,
            "max": 104,
            "minutes": 1350
          }
        ],
        "restingHeartRate": 62
      }
    }
  ],
  "activities-heart-intraday": {
    "datapoints": [
      {
        "time": "00:00:00",
        "value": 62
      }
    ]
  }
}
```

**Sleep (with stage breakdown)**
```typescript
{
  "sleep": [
    {
      "dateOfSleep": "2025-11-22",
      "startTime": "2025-11-21T22:30:00.000",
      "endTime": "2025-11-22T06:45:00.000",
      "duration": 29100000, // milliseconds
      "efficiency": 92, // percentage
      "levels": {
        "summary": {
          "deep": { "count": 5, "minutes": 75 },
          "light": { "count": 15, "minutes": 195 },
          "rem": { "count": 3, "minutes": 90 },
          "wake": { "count": 2, "minutes": 15 }
        },
        "data": [
          {
            "dateTime": "2025-11-21T22:30:00.000",
            "level": "wake",
            "seconds": 180
          }
        ]
      },
      "type": "stages",
      "mainSleep": true
    }
  ]
}
```

---

## Code Examples

### Node.js Implementation with fitbit-node SDK

**Installation:**
```bash
npm install fitbit-node dotenv
```

**Initialize Client:**
```typescript
import { FitbitClient } from 'fitbit-node';

const client = new FitbitClient({
  clientId: process.env.FITBIT_CLIENT_ID!,
  clientSecret: process.env.FITBIT_CLIENT_SECRET!,
  redirectUrl: process.env.FITBIT_REDIRECT_URI!,
});

// Get authorization URL
const authUrl = client.getAuthorizeUrl(
  ['activity', 'heartrate', 'sleep', 'profile', 'weight'],
  'YOUR_CODE_VERIFIER' // PKCE
);

// Exchange code
const token = await client.getAccessToken(code, 'YOUR_CODE_VERIFIER');

// Make requests
const profile = await client.request({
  path: '/user/-/profile.json',
  accessToken: token.access_token,
});

console.log(profile);
```

### Raw HTTP Implementation (Recommended)

**OAuth Flow:**
```typescript
import crypto from 'crypto';

class FitbitOAuth {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    this.clientId = process.env.FITBIT_CLIENT_ID!;
    this.clientSecret = process.env.FITBIT_CLIENT_SECRET!;
    this.redirectUri = process.env.FITBIT_REDIRECT_URI!;
  }

  generatePKCE(): { verifier: string; challenge: string } {
    const verifier = crypto.randomBytes(96).toString('base64url');
    const challenge = crypto
      .createHash('sha256')
      .update(verifier)
      .digest('base64url');
    return { verifier, challenge };
  }

  getAuthUrl(challenge: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      scope: 'activity heartrate sleep profile weight spo2',
      redirect_uri: this.redirectUri,
      code_challenge: challenge,
      code_challenge_method: 'S256',
    });
    return `https://www.fitbit.com/oauth2/authorize?${params.toString()}`;
  }

  async exchangeCode(
    code: string,
    verifier: string
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

    const response = await fetch('https://api.fitbit.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${auth}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.redirectUri,
        code_verifier: verifier,
      }).toString(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Token exchange failed: ${error.error_description}`);
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    };
  }

  async refreshToken(refreshToken: string): Promise<string> {
    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

    const response = await fetch('https://api.fitbit.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${auth}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }).toString(),
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    return data.access_token;
  }
}

export default new FitbitOAuth();
```

**API Client:**
```typescript
class FitbitAPI {
  private baseUrl = 'https://api.fitbit.com/1.2';

  async getHeartRate(accessToken: string, date: string) {
    return this.request(`/user/-/activities/heart/date/${date}.json`, accessToken);
  }

  async getHeartRateIntraday(accessToken: string, date: string) {
    return this.request(`/user/-/activities/heart/date/${date}/1min.json`, accessToken);
  }

  async getSleep(accessToken: string, date: string) {
    return this.request(`/user/-/sleep/date/${date}.json`, accessToken);
  }

  async getActivity(accessToken: string, date: string) {
    return this.request(`/user/-/activities/date/${date}.json`, accessToken);
  }

  async getProfile(accessToken: string) {
    return this.request('/user/-/profile.json', accessToken);
  }

  async getWeight(accessToken: string, date: string) {
    return this.request(`/user/-/body/weight/date/${date}.json`, accessToken);
  }

  async getSpO2(accessToken: string, date: string) {
    return this.request(`/user/-/spo2/date/${date}.json`, accessToken);
  }

  private async request(endpoint: string, accessToken: string) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized - token expired or revoked');
      }
      if (response.status === 429) {
        const resetTime = response.headers.get('Fitbit-Rate-Limit-Reset');
        throw new Error(`Rate limited. Reset at: ${resetTime}`);
      }
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  }
}

export default new FitbitAPI();
```

### Webhook Handler (Hono)

```typescript
import { Hono } from 'hono';
import crypto from 'crypto';
import db from '../db';
import FitbitAPI from './fitbit-api';

const app = new Hono();

function verifySignature(payload: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac('sha1', secret).update(payload).digest('base64');
  return hmac === signature;
}

app.post('/webhooks/fitbit/activities', async (c) => {
  try {
    const payload = await c.req.text();
    const signature = c.req.header('X-Fitbit-Signature-SHA1');

    if (!signature || !verifySignature(payload, signature, process.env.FITBIT_CLIENT_SECRET!)) {
      return c.json({ error: 'Invalid signature' }, 401);
    }

    const events = JSON.parse(payload) as Array<{
      collectionType: string;
      date: string;
      ownerId: string;
      subscriptionId: string;
    }>;

    for (const event of events) {
      // Find user with this Fitbit ID
      const { user_id, access_token } = await db.query(
        `SELECT user_id, access_token FROM user_health_providers
         WHERE provider_name = 'fitbit' AND fitbit_id = ?`,
        [event.ownerId]
      );

      if (!user_id) {
        console.warn(`Webhook for unknown Fitbit user: ${event.ownerId}`);
        continue;
      }

      // Fetch actual data based on collection type
      let data: any;
      switch (event.collectionType) {
        case 'activities':
          data = await FitbitAPI.getActivity(access_token, event.date);
          break;
        case 'sleep':
          data = await FitbitAPI.getSleep(access_token, event.date);
          break;
        case 'heartrate':
          data = await FitbitAPI.getHeartRate(access_token, event.date);
          break;
        default:
          console.log(`Unhandled collection type: ${event.collectionType}`);
          continue;
      }

      // Store in database
      await db.query(
        `INSERT INTO user_metrics (user_id, provider, metric_type, date, data)
         VALUES (?, 'fitbit', ?, ?, ?)
         ON DUPLICATE KEY UPDATE data = VALUES(data), updated_at = NOW()`,
        [user_id, event.collectionType, event.date, JSON.stringify(data)]
      );

      console.log(`Stored ${event.collectionType} data for user ${user_id}`);
    }

    return c.json({ status: 'processed' });
  } catch (error) {
    console.error('Webhook error:', error);
    return c.json({ error: 'Processing failed' }, 500);
  }
});

export default app;
```

### Backup Polling Job

```typescript
import schedule from 'node-schedule';
import db from '../db';
import FitbitAPI from './fitbit-api';

// Run daily at 2 AM for all users
schedule.scheduleJob('0 2 * * *', async () => {
  console.log('Starting Fitbit backup polling job...');

  const users = await db.query(`
    SELECT user_id, access_token, last_synced_at
    FROM user_health_providers
    WHERE provider_name = 'fitbit' AND is_active = true
  `);

  for (const user of users) {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = yesterday.toISOString().split('T')[0];

      // Fetch all data types for yesterday
      const [activities, sleep, heartRate, profile] = await Promise.all([
        FitbitAPI.getActivity(user.access_token, dateStr),
        FitbitAPI.getSleep(user.access_token, dateStr),
        FitbitAPI.getHeartRate(user.access_token, dateStr),
        FitbitAPI.getProfile(user.access_token),
      ]);

      // Store data
      await db.query(
        `INSERT INTO user_metrics (user_id, provider, metric_type, date, data)
         VALUES
         (?, 'fitbit', 'activities', ?, ?),
         (?, 'fitbit', 'sleep', ?, ?),
         (?, 'fitbit', 'heartrate', ?, ?),
         (?, 'fitbit', 'profile', ?, ?)
         ON DUPLICATE KEY UPDATE data = VALUES(data)`,
        [
          user.user_id, dateStr, JSON.stringify(activities),
          user.user_id, dateStr, JSON.stringify(sleep),
          user.user_id, dateStr, JSON.stringify(heartRate),
          user.user_id, dateStr, JSON.stringify(profile),
        ]
      );

      // Update last synced time
      await db.query(
        'UPDATE user_health_providers SET last_synced_at = NOW() WHERE user_id = ? AND provider_name = ?',
        [user.user_id, 'fitbit']
      );

      console.log(`Synced Fitbit data for user ${user.user_id}`);
    } catch (error) {
      console.error(`Fitbit sync error for user ${user.user_id}:`, error);
    }
  }

  console.log('Fitbit backup polling job completed');
});
```

---

## vs WHOOP Comparison

### Quick Comparison Matrix

| Feature | Fitbit | WHOOP |
|---------|--------|-------|
| **OAuth Type** | OAuth 2.0 + PKCE | OAuth 2.0 |
| **Rate Limit Model** | 150 req/hr per user | 10,000 req/min globally |
| **Webhook Retries** | ❌ None | ✅ 3 retries over 3 days |
| **Intraday HR Data** | ✅ (needs approval) | ✅ (1-minute intervals) |
| **Sleep Stages** | ✅ (deep, light, REM, wake) | ✅ (similar) |
| **Activity Data** | ✅ (30+ activity types) | ✅ (comprehensive) |
| **Cost** | Free | $30/month |
| **Scale Suitability** | ✅ Better per-user | ❌ Limited globally |
| **Approval Speed** | 24-48 hours | Immediate |
| **Real-time Alerts** | ❌ No webhooks for thresholds | ✅ Custom alerts |

### Detailed Comparison

**Data Freshness:**
- Fitbit: 15-20 min sync + API availability = ~20 min
- WHOOP: Real-time (depends on app activity)

**Reliability for Webhooks:**
- Fitbit: Must implement backup polling (no retries)
- WHOOP: Reliable (3 retries built-in)

**Scaling Performance:**
```
1,000 users daily sync:
- Fitbit: 1,000 × 150/hr = within quota ✅
- WHOOP: 1,000 × 5 calls = 5,000/day = within 14.4M/day quota ✅

10,000 users daily sync:
- Fitbit: 10,000 × 150/hr = within per-user quota ✅
- WHOOP: 10,000 × 5 calls = 50,000/day = 35% of global quota ✅

10,000 users 5-min polling:
- Fitbit: 10,000 × 288 calls = 2.88M/day ✅
- WHOOP: Impossible without exceeding global limit ❌
```

**User Experience:**
- Fitbit: More cost-effective for users (free device access)
- WHOOP: Premium experience, built for performance tracking

---

## Production Checklist

### Pre-Deployment

- [ ] Fitbit app created at dev.fitbit.com
- [ ] Client ID and Client Secret secured in environment variables
- [ ] Redirect URI registered (HTTPS only for production)
- [ ] Requested intraday HR data approval (if needed)
- [ ] PKCE implementation tested end-to-end
- [ ] Token refresh logic tested with expired tokens
- [ ] Webhook signature verification tested
- [ ] Rate limit handling implemented with retry logic
- [ ] Database schema created for user_health_providers table
- [ ] Error logging configured for OAuth failures
- [ ] Rate limit header tracking implemented

### Webhook Setup

- [ ] Webhook endpoint deployed and accessible
- [ ] Webhook signature verification working (HMAC-SHA1)
- [ ] Test webhook sent from dev.fitbit.com
- [ ] All collection types subscribed: activities, sleep, heartrate, body
- [ ] Backup polling job scheduled (once daily minimum)
- [ ] Webhook handler tested with multiple concurrent events
- [ ] Database insert race conditions handled

### Testing

- [ ] Create test Fitbit account
- [ ] Test full OAuth flow: login → authorize → callback → token storage
- [ ] Test heart rate data retrieval (1-min intervals)
- [ ] Test sleep data retrieval (with stages)
- [ ] Test activity log retrieval
- [ ] Test webhook with real data
- [ ] Test rate limit handling (hit limit intentionally)
- [ ] Test token refresh after expiration
- [ ] Test with multiple users simultaneously
- [ ] Load test: 100+ concurrent users

### Monitoring

- [ ] Alert on OAuth failures (webhook endpoint)
- [ ] Alert on rate limit approaching (remaining < 10)
- [ ] Alert on token refresh failures
- [ ] Monitor webhook latency (should be < 1 second)
- [ ] Track data freshness (compare API timestamp vs webhook)
- [ ] Monitor backup polling job success rate
- [ ] Log all API calls with timestamps

### Documentation

- [ ] Document all environment variables needed
- [ ] Create runbook for handling rate limit issues
- [ ] Document webhook payload structure for team
- [ ] Create troubleshooting guide for common errors
- [ ] Document data retention policy for metrics
- [ ] Create recovery procedure if webhooks fail

### Security

- [ ] Client Secret never logged or exposed
- [ ] Access tokens encrypted at rest
- [ ] Refresh tokens encrypted at rest
- [ ] Webhook signature always verified
- [ ] HTTPS enforced for all OAuth callbacks
- [ ] Rate limit info not exposed to frontend
- [ ] User data access logs created
- [ ] Regular security audit of token handling

---

## Troubleshooting

### Common Issues

**"Invalid redirect_uri"**
- Verify exact match in Fitbit app settings
- Check for trailing slashes
- Ensure HTTPS in production

**"Rate limit exceeded (429)"**
- Check `Fitbit-Rate-Limit-Remaining` header
- Wait until `Fitbit-Rate-Limit-Reset` timestamp
- Implement queue for retries

**"401 Unauthorized"**
- Token may be expired, refresh it
- User may have revoked access
- Check token not corrupted in database

**Webhook not firing**
- Check subscription status: `GET /notifications/subscriptions`
- Verify callback URL is HTTPS
- Check firewall allows Fitbit IP ranges
- Review endpoint logs

**Missing intraday heart rate data**
- Intraday approval needed (separate form)
- Only available with `heartrate` scope + approval
- Without approval, only daily summary available

---

## Resources

- **Official Docs**: https://dev.fitbit.com/build/reference/web-api/
- **OAuth Guide**: https://dev.fitbit.com/build/reference/web-api/authorization/
- **API Reference**: https://dev.fitbit.com/build/reference/web-api/explore/
- **Webhook Docs**: https://dev.fitbit.com/build/reference/web-api/subscription/
- **Developer Console**: https://dev.fitbit.com/apps
- **Status Page**: https://status.fitbit.com

---

This guide provides everything needed to implement Fitbit integration for production use.
