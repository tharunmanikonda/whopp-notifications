# Authentication API Documentation

Complete guide to using the Whoop AI Motivator authentication API.

---

## Overview

The authentication API provides endpoints for user registration, login, and profile management. It uses JWT (JSON Web Tokens) for secure, stateless authentication.

### Base URL
```
https://whopp-notifications-63tja648u-tharunmanikondas-projects.vercel.app/api/routes
```

### Authentication
Most endpoints require a JWT token in the `Authorization` header:
```
Authorization: Bearer <your-jwt-token>
```

---

## Endpoints

### 1. User Signup

**Endpoint:** `POST /auth?action=signup`

Create a new user account.

#### Request
```bash
curl -X POST https://whopp-notifications-63tja648u-tharunmanikondas-projects.vercel.app/api/routes/auth?action=signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123",
    "fullName": "John Doe",
    "timezone": "America/New_York",
    "notificationTime": "08:00"
  }'
```

#### Request Body
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | User email address |
| password | string | Yes | Password (minimum 8 characters) |
| fullName | string | Yes | User's full name |
| timezone | string | No | User's timezone (defaults to America/New_York) |
| notificationTime | string | No | Daily notification time in HH:MM format (defaults to 08:00) |

#### Response (201 Created)
```json
{
  "success": true,
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "User created successfully"
}
```

#### Error Response (400 Bad Request)
```json
{
  "success": false,
  "message": "Email already registered"
}
```

---

### 2. User Login

**Endpoint:** `POST /auth?action=login`

Authenticate user and receive JWT token.

#### Request
```bash
curl -X POST https://whopp-notifications-63tja648u-tharunmanikondas-projects.vercel.app/api/routes/auth?action=login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123"
  }'
```

#### Request Body
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | User email address |
| password | string | Yes | User password |

#### Response (200 OK)
```json
{
  "success": true,
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Login successful"
}
```

#### Error Response (401 Unauthorized)
```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

---

### 3. Get Current User Profile

**Endpoint:** `GET /auth?action=me`

Retrieve current user profile (requires authentication).

#### Request
```bash
curl -X GET https://whopp-notifications-63tja648u-tharunmanikondas-projects.vercel.app/api/routes/auth?action=me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### Response (200 OK)
```json
{
  "success": true,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "full_name": "John Doe",
    "timezone": "America/New_York",
    "notification_time": "08:00",
    "notification_enabled": true,
    "created_at": "2025-11-16T12:00:00Z",
    "updated_at": "2025-11-16T12:00:00Z"
  }
}
```

#### Error Response (401 Unauthorized)
```json
{
  "success": false,
  "message": "Invalid or expired token"
}
```

---

### 4. Change Password

**Endpoint:** `POST /auth?action=change-password`

Change user password (requires authentication).

#### Request
```bash
curl -X POST https://whopp-notifications-63tja648u-tharunmanikondas-projects.vercel.app/api/routes/auth?action=change-password \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "oldPassword": "currentpassword123",
    "newPassword": "newpassword123"
  }'
```

#### Request Body
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| oldPassword | string | Yes | Current password |
| newPassword | string | Yes | New password (minimum 8 characters) |

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

#### Error Response (400 Bad Request)
```json
{
  "success": false,
  "message": "Current password is incorrect"
}
```

---

### 5. Validate Token

**Endpoint:** `POST /auth?action=validate-token`

Verify JWT token validity.

#### Request
```bash
curl -X POST https://whopp-notifications-63tja648u-tharunmanikondas-projects.vercel.app/api/routes/auth?action=validate-token \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### Response (200 OK)
```json
{
  "success": true,
  "valid": true,
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com"
}
```

#### Error Response (401 Unauthorized)
```json
{
  "success": false,
  "valid": false,
  "message": "Invalid or expired token"
}
```

---

## JWT Token Format

Tokens expire after **24 hours**.

### Token Structure
```
Header.Payload.Signature
```

### Payload (decoded)
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "iat": 1700151234,
  "exp": 1700237634
}
```

### Using Token in Requests
```bash
# In Authorization header
Authorization: Bearer <token>

# In curl
curl -H "Authorization: Bearer <token>" https://...

# In JavaScript fetch
fetch('https://...', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})

# In Axios
axios.get('https://...', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
```

---

## Error Codes

| Status | Code | Message | Cause |
|--------|------|---------|-------|
| 400 | Bad Request | Email already registered | Email exists in database |
| 400 | Bad Request | Password must be at least 8 characters | Password too short |
| 401 | Unauthorized | Invalid email or password | Wrong credentials |
| 401 | Unauthorized | No authentication token provided | Missing token |
| 401 | Unauthorized | Invalid or expired token | Token invalid/expired |
| 404 | Not Found | User not found | User deleted or doesn't exist |
| 405 | Method Not Allowed | Method not allowed | Wrong HTTP method |
| 500 | Internal Server Error | Internal server error | Server error |

---

## Examples

### JavaScript/Node.js

```typescript
// Signup
const signupResponse = await fetch(
  'https://whopp-notifications-63tja648u-tharunmanikondas-projects.vercel.app/api/routes/auth?action=signup',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'user@example.com',
      password: 'securepassword123',
      fullName: 'John Doe'
    })
  }
);
const signupData = await signupResponse.json();
const token = signupData.token;

// Get Profile
const profileResponse = await fetch(
  'https://whopp-notifications-63tja648u-tharunmanikondas-projects.vercel.app/api/routes/auth?action=me',
  {
    headers: { 'Authorization': `Bearer ${token}` }
  }
);
const profileData = await profileResponse.json();
console.log(profileData.user);
```

### Python

```python
import requests

# Signup
response = requests.post(
    'https://whopp-notifications-63tja648u-tharunmanikondas-projects.vercel.app/api/routes/auth?action=signup',
    json={
        'email': 'user@example.com',
        'password': 'securepassword123',
        'fullName': 'John Doe'
    }
)
data = response.json()
token = data['token']

# Get Profile
headers = {'Authorization': f'Bearer {token}'}
response = requests.get(
    'https://whopp-notifications-63tja648u-tharunmanikondas-projects.vercel.app/api/routes/auth?action=me',
    headers=headers
)
user = response.json()['user']
print(user)
```

### cURL

```bash
# Signup
TOKEN=$(curl -s -X POST \
  https://whopp-notifications-63tja648u-tharunmanikondas-projects.vercel.app/api/routes/auth?action=signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123",
    "fullName": "John Doe"
  }' | jq -r '.token')

# Get Profile
curl -X GET \
  https://whopp-notifications-63tja648u-tharunmanikondas-projects.vercel.app/api/routes/auth?action=me \
  -H "Authorization: Bearer $TOKEN"
```

---

## Best Practices

### Security
1. **HTTPS Only** - Always use HTTPS (never HTTP)
2. **Store Token Securely** - Keep JWT in secure storage (localStorage, secure cookies, etc.)
3. **Expire Tokens** - Tokens expire after 24 hours
4. **Refresh Tokens** - Implement token refresh mechanism for long sessions
5. **Strong Passwords** - Enforce minimum 8 characters
6. **Rate Limiting** - Implement rate limiting on login attempts

### Implementation
1. **Handle 401 Errors** - Redirect to login if token is expired
2. **Validate Token** - Check token validity before making requests
3. **Store User ID** - Save userId after signup/login
4. **Update Token** - Refresh token when it's about to expire
5. **Clear Storage** - Remove token on logout

### Testing
```bash
# Test signup
curl -X POST http://localhost:3000/api/routes/auth?action=signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234","fullName":"Test User"}'

# Test login
curl -X POST http://localhost:3000/api/routes/auth?action=login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234"}'

# Test protected endpoint
curl -X GET http://localhost:3000/api/routes/auth?action=me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Migration Guide

### From No Authentication to JWT

1. **Sign Up Users**
   ```bash
   POST /auth?action=signup
   ```

2. **Store Token**
   - Store in localStorage, sessionStorage, or secure cookies

3. **Use Token for Requests**
   - Add `Authorization: Bearer <token>` header to all requests

4. **Handle Token Expiration**
   - Check response status 401
   - Redirect to login

5. **Implement Refresh**
   - Get new token on login
   - Use token for 24 hours
   - Prompt for re-login after expiration

---

## Support

For issues or questions:
1. Check error codes above
2. Review examples for your language
3. Verify JWT_SECRET is set in .env
4. Check database connection

---

## Changelog

### v1.0.0 (2025-11-16)
- Initial release
- Signup endpoint
- Login endpoint
- Profile endpoint
- Password change endpoint
- Token validation endpoint
