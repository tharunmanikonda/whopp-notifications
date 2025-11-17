# Analytics & Dashboard API Documentation

Complete guide to the analytics, dashboard, and provider management APIs.

---

## Overview

The Whoop AI Motivator platform provides comprehensive APIs for:

1. **Dashboard API** - Complete user health dashboard with metrics, insights, and trends
2. **Analytics API** - Detailed metrics, trends, summary statistics, and message history
3. **Provider API** - Connect/manage multiple health data providers (Whoop, Fitbit, etc.)

All endpoints require JWT authentication (except availability endpoints).

---

## Base URL

```
https://whopp-notifications-63tja648u-tharunmanikondas-projects.vercel.app/api/routes
```

---

## Authentication

Most endpoints require a JWT token in the `Authorization` header:

```
Authorization: Bearer <your-jwt-token>
```

Obtain tokens via the Authentication API:
- `POST /auth?action=signup` - Create account
- `POST /auth?action=login` - Get JWT token

---

## Dashboard API

### GET /dashboard

Get comprehensive dashboard data for the logged-in user.

**Request:**

```bash
curl -X GET https://whopp-notifications-63tja648u-tharunmanikondas-projects.vercel.app/api/routes/dashboard \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| period | number | 7 | Number of days to include in summary (7, 30, 90) |

**Response (200 OK):**

```json
{
  "success": true,
  "dashboard": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "period_days": 7,
    "generated_at": "2025-11-16T12:00:00Z",
    "metrics": {
      "today": {
        "recovery_score": 65,
        "sleep_score": 78,
        "strain": 4.2,
        "resting_heart_rate": 72,
        "hrv": 67.8,
        "data_completeness": 95.5
      },
      "comparison": {
        "recovery_change": 5,
        "sleep_change": -3
      }
    },
    "summary": {
      "total_metrics_recorded": 7,
      "average_recovery": 62,
      "average_sleep": 76,
      "average_strain": 4.3,
      "data_completeness": 94
    },
    "providers": {
      "connected_count": 2,
      "providers": [
        {
          "id": "uuid",
          "name": "whoop",
          "is_primary": true,
          "connected_since": "2025-11-01T10:00:00Z"
        },
        {
          "id": "uuid",
          "name": "fitbit",
          "is_primary": false,
          "connected_since": "2025-11-05T14:30:00Z"
        }
      ]
    },
    "messages": {
      "total_messages": 7,
      "delivered": 7,
      "pending": 0,
      "failed": 0,
      "delivery_rate": 100,
      "recent": [
        {
          "id": "msg-uuid",
          "message": "You're crushing it! Your recovery score...",
          "status": "delivered",
          "sent_at": "2025-11-16T08:00:00Z"
        }
      ]
    },
    "analytics": {
      "latest": {
        "id": "analytics-uuid",
        "user_id": "user-uuid",
        "date": "2025-11-16",
        "avg_recovery_score": 65,
        "avg_sleep_score": 78,
        "avg_strain": 4.2
      },
      "insights": [
        {
          "type": "recovery",
          "message": "Good recovery. You can do moderate to intense activity.",
          "priority": "info"
        },
        {
          "type": "sleep",
          "message": "Great sleep quality! Continue your sleep routine.",
          "priority": "info"
        }
      ]
    },
    "historical": {
      "metrics": [
        {
          "date": "2025-11-16",
          "recovery": 65,
          "sleep": 78,
          "strain": 4.2
        }
      ]
    }
  }
}
```

---

## Analytics API

### GET /analytics?action=dashboard

Alias for the main Dashboard endpoint (with more detail).

### GET /analytics?action=metrics

Get health metrics for a specific period.

**Request:**

```bash
curl -X GET "https://whopp-notifications-63tja648u-tharunmanikondas-projects.vercel.app/api/routes/analytics?action=metrics&days=30&provider=whoop" \
  -H "Authorization: Bearer <token>"
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| days | number | 30 | Number of days to retrieve |
| provider | string | optional | Filter by specific provider (whoop, fitbit, etc.) |

**Response (200 OK):**

```json
{
  "success": true,
  "metrics": {
    "count": 30,
    "period_days": 30,
    "provider_filter": "whoop",
    "data": [
      {
        "id": "metric-uuid",
        "user_id": "user-uuid",
        "date": "2025-11-16",
        "provider": "whoop",
        "recovery_score": 65,
        "sleep_score": 78,
        "strain": 4.2,
        "resting_heart_rate": 72,
        "hrv": 67.8,
        "data_completeness": 95.5,
        "created_at": "2025-11-16T09:15:00Z"
      }
    ]
  }
}
```

### GET /analytics?action=trends

Get health trends and analysis over time.

**Request:**

```bash
curl -X GET "https://whopp-notifications-63tja648u-tharunmanikondas-projects.vercel.app/api/routes/analytics?action=trends&days=30" \
  -H "Authorization: Bearer <token>"
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| days | number | 30 | Number of days to analyze |

**Response (200 OK):**

```json
{
  "success": true,
  "trends": {
    "period_days": 30,
    "data_points": 30,
    "indicators": {
      "recovery_trend": "improving",
      "sleep_trend": "stable",
      "strain_trend": "declining",
      "message": "Trends calculated from recent data"
    },
    "history": [
      {
        "id": "analytics-uuid",
        "date": "2025-11-16",
        "avg_recovery_score": 65,
        "avg_sleep_score": 78,
        "avg_strain": 4.2
      }
    ]
  }
}
```

### GET /analytics?action=summary

Get high-level summary statistics.

**Request:**

```bash
curl -X GET "https://whopp-notifications-63tja648u-tharunmanikondas-projects.vercel.app/api/routes/analytics?action=summary&days=30" \
  -H "Authorization: Bearer <token>"
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| days | number | 30 | Number of days to summarize |

**Response (200 OK):**

```json
{
  "success": true,
  "summary": {
    "period_days": 30,
    "stats": {
      "avg_recovery_score": 62.5,
      "avg_sleep_score": 75.8,
      "avg_strain": 4.3,
      "avg_data_completeness": 94.2
    },
    "generated_at": "2025-11-16T12:00:00Z"
  }
}
```

### GET /analytics?action=messages

Get message history and delivery statistics.

**Request:**

```bash
curl -X GET "https://whopp-notifications-63tja648u-tharunmanikondas-projects.vercel.app/api/routes/analytics?action=messages&limit=30&status=delivered" \
  -H "Authorization: Bearer <token>"
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | number | 30 | Maximum messages to return |
| status | string | optional | Filter by status: pending, delivered, failed |

**Response (200 OK):**

```json
{
  "success": true,
  "messages": {
    "count": 7,
    "limit": 30,
    "status_filter": "delivered",
    "statistics": {
      "total_messages": 7,
      "delivered": 7,
      "pending": 0,
      "failed": 0
    },
    "data": [
      {
        "id": "msg-uuid",
        "user_id": "user-uuid",
        "message": "You're crushing it! Your recovery score is 65% - keep pushing!",
        "message_type": "motivation",
        "providers_used": ["whoop"],
        "delivery_status": "delivered",
        "sent_at": "2025-11-16T08:00:00Z",
        "created_at": "2025-11-16T07:55:00Z"
      }
    ]
  }
}
```

---

## Provider Management API

### GET /providers?action=available

Get list of available health providers (no authentication required).

**Request:**

```bash
curl -X GET https://whopp-notifications-63tja648u-tharunmanikondas-projects.vercel.app/api/routes/providers?action=available
```

**Response (200 OK):**

```json
{
  "success": true,
  "available_providers": [
    {
      "id": "whoop",
      "name": "Whoop Band",
      "icon": "https://example.com/whoop.png",
      "description": "Wearable fitness tracker with recovery insights",
      "metrics": ["recovery_score", "sleep_score", "strain", "hrv", "resting_heart_rate"],
      "status": "available"
    },
    {
      "id": "fitbit",
      "name": "Fitbit",
      "icon": "https://example.com/fitbit.png",
      "description": "Comprehensive fitness and health tracking",
      "metrics": ["steps", "heart_rate", "sleep_score", "calories"],
      "status": "available"
    },
    {
      "id": "garmin",
      "name": "Garmin",
      "icon": "https://example.com/garmin.png",
      "description": "Sports watches and fitness trackers",
      "metrics": ["heart_rate", "steps", "sleep", "stress"],
      "status": "coming_soon"
    }
  ],
  "total": 6
}
```

### GET /providers?action=list

Get all connected providers for the user.

**Request:**

```bash
curl -X GET https://whopp-notifications-63tja648u-tharunmanikondas-projects.vercel.app/api/routes/providers?action=list \
  -H "Authorization: Bearer <token>"
```

**Response (200 OK):**

```json
{
  "success": true,
  "providers": {
    "total": 2,
    "connected": [
      {
        "id": "provider-uuid",
        "user_id": "user-uuid",
        "provider_name": "whoop",
        "is_primary": true,
        "created_at": "2025-11-01T10:00:00Z"
      },
      {
        "id": "provider-uuid",
        "user_id": "user-uuid",
        "provider_name": "fitbit",
        "is_primary": false,
        "created_at": "2025-11-05T14:30:00Z"
      }
    ],
    "primary": {
      "id": "provider-uuid",
      "provider_name": "whoop",
      "is_primary": true
    }
  }
}
```

### POST /providers?action=connect

Connect a new health provider.

**Request:**

```bash
curl -X POST https://whopp-notifications-63tja648u-tharunmanikondas-projects.vercel.app/api/routes/providers?action=connect \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "provider_name": "fitbit",
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "optional_refresh_token",
    "expires_at": "2025-12-16T12:00:00Z"
  }'
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| provider_name | string | Yes | Provider identifier (whoop, fitbit, garmin, apple, samsung, oura) |
| access_token | string | Yes | OAuth access token from provider |
| refresh_token | string | No | OAuth refresh token (if applicable) |
| expires_at | string | No | Token expiration timestamp (ISO 8601) |

**Response (201 Created):**

```json
{
  "success": true,
  "provider": {
    "id": "provider-uuid",
    "user_id": "user-uuid",
    "provider_name": "fitbit",
    "is_primary": false,
    "created_at": "2025-11-16T12:00:00Z"
  },
  "message": "fitbit connected successfully"
}
```

### POST /providers?action=set-primary

Set a provider as the primary data source.

**Request:**

```bash
curl -X POST https://whopp-notifications-63tja648u-tharunmanikondas-projects.vercel.app/api/routes/providers?action=set-primary \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "provider_name": "fitbit"
  }'
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| provider_name | string | Yes | Provider to set as primary |

**Response (200 OK):**

```json
{
  "success": true,
  "message": "fitbit set as primary provider",
  "primary_provider": {
    "id": "provider-uuid",
    "provider_name": "fitbit",
    "is_primary": true
  }
}
```

### DELETE /providers?action=disconnect

Disconnect a health provider.

**Request:**

```bash
curl -X DELETE https://whopp-notifications-63tja648u-tharunmanikondas-projects.vercel.app/api/routes/providers?action=disconnect \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "provider_id": "provider-uuid"
  }'
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| provider_id | string | Yes | UUID of provider to disconnect |

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Provider provider-uuid disconnected successfully"
}
```

### GET /providers?action=status

Get connection status for all providers.

**Request:**

```bash
curl -X GET https://whopp-notifications-63tja648u-tharunmanikondas-projects.vercel.app/api/routes/providers?action=status \
  -H "Authorization: Bearer <token>"
```

**Response (200 OK):**

```json
{
  "success": true,
  "provider_status": [
    {
      "id": "provider-uuid",
      "provider_name": "whoop",
      "is_primary": true,
      "connected_at": "2025-11-01T10:00:00Z",
      "expires_at": null,
      "needs_refresh": false
    },
    {
      "id": "provider-uuid",
      "provider_name": "fitbit",
      "is_primary": false,
      "connected_at": "2025-11-05T14:30:00Z",
      "expires_at": "2025-12-16T12:00:00Z",
      "needs_refresh": false
    }
  ],
  "total_connected": 2
}
```

---

## Error Responses

### 401 Unauthorized

```json
{
  "success": false,
  "message": "Invalid or expired token"
}
```

### 400 Bad Request

```json
{
  "success": false,
  "message": "provider_name and access_token are required"
}
```

### 404 Not Found

```json
{
  "success": false,
  "message": "Unknown analytics action: invalid_action"
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

## Rate Limiting

Current implementation has no rate limiting. For production:
- Recommended: 100 requests per minute per user
- Dashboard: 5 requests per minute
- Analytics: 20 requests per minute
- Provider: 10 requests per minute

---

## Data Retention

| Data Type | Retention Period | Notes |
|-----------|------------------|-------|
| Health Metrics | 2 years | Auto-archived after 2 years |
| Messages | 1 year | Searchable in message history |
| Provider Tokens | Active until disconnected | Encrypted in Supabase |
| User Analytics | 2 years | Aggregated data retained indefinitely |

---

## JavaScript/React Example

```typescript
// Authenticate
const loginResponse = await fetch('/api/routes/auth?action=login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'user@example.com', password: 'password' })
});
const { token } = await loginResponse.json();

// Get Dashboard
const dashboardResponse = await fetch('/api/routes/dashboard?period=7', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { dashboard } = await dashboardResponse.json();

// Display metrics
console.log(`Recovery: ${dashboard.metrics.today.recovery_score}%`);
console.log(`Sleep: ${dashboard.metrics.today.sleep_score}%`);

// Get Trends
const trendsResponse = await fetch('/api/routes/analytics?action=trends&days=30', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { trends } = await trendsResponse.json();
console.log(`Recovery Trend: ${trends.indicators.recovery_trend}`);

// List Providers
const providersResponse = await fetch('/api/routes/providers?action=list', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { providers } = await providersResponse.json();
console.log(`Connected: ${providers.total} providers`);
```

---

## Troubleshooting

### No metrics showing

1. Check if user has connected a provider: `GET /providers?action=list`
2. Verify health data has been collected: Check Supabase health_metrics table
3. Ensure metrics are within the period: Use `?period=30` for 30 days

### Provider token expired

1. Check status: `GET /providers?action=status`
2. If `needs_refresh: true`, reconnect the provider
3. System will attempt automatic refresh (if implemented)

### Dashboard loading slowly

1. Reduce period: Use `?period=7` instead of 30
2. Check database performance
3. Consider caching for frequently accessed dashboard

---

## API Versioning

Current version: **v1.0.0**

All endpoints are versioned at the route level. Future breaking changes will introduce new endpoints (e.g., `/api/v2/dashboard`).

---

## Next Steps

1. **Health Goals API** - Let users set targets (coming soon)
2. **Notifications Preferences** - Configure delivery times and channels (coming soon)
3. **Social Features** - Compare metrics with friends (coming soon)
4. **Advanced Analytics** - ML-powered health insights (coming soon)
5. **Data Export** - Export metrics as CSV/PDF (coming soon)

