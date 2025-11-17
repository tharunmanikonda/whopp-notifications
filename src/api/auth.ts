import { Hono } from 'hono';
import { AuthService } from '../services/auth-service.js';

const app = new Hono();
let authService: AuthService | null = null;

function getAuthService() {
  if (!authService) {
    authService = new AuthService();
  }
  return authService;
}

/**
 * POST /auth/signup
 * Create a new user account
 *
 * Body:
 * {
 *   "email": "user@example.com",
 *   "password": "securepassword123",
 *   "fullName": "John Doe",
 *   "timezone": "America/New_York" (optional, defaults to America/New_York),
 *   "notificationTime": "08:00" (optional, defaults to 08:00)
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "userId": "uuid",
 *   "token": "jwt_token",
 *   "message": "User created successfully"
 * }
 */
app.post('/signup', async (c) => {
  try {
    const body = await c.req.json();
    const { email, password, fullName, timezone, notificationTime } = body;

    const result = await getAuthService().signup(
      email,
      password,
      fullName,
      timezone,
      notificationTime
    );

    if (!result.success) {
      return c.json({ success: false, message: result.message }, 400);
    }

    return c.json(result, 201);
  } catch (error: any) {
    const errorMessage = error?.message || String(error) || 'Internal server error';
    console.error('Signup endpoint error:', errorMessage);
    console.error('Full error:', error);
    return c.json({
      success: false,
      message: `Internal server error: ${errorMessage}`,
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, 500);
  }
});

/**
 * POST /auth/login
 * Authenticate user and get JWT token
 *
 * Body:
 * {
 *   "email": "user@example.com",
 *   "password": "securepassword123"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "userId": "uuid",
 *   "token": "jwt_token",
 *   "message": "Login successful"
 * }
 */
app.post('/login', async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = body;

    const result = await getAuthService().login(email, password);

    if (!result.success) {
      return c.json({ success: false, message: result.message }, 401);
    }

    return c.json(result, 200);
  } catch (error) {
    console.error('Login endpoint error:', error);
    return c.json({ success: false, message: 'Internal server error' }, 500);
  }
});

/**
 * GET /auth/me
 * Get current user profile (requires authentication)
 *
 * Headers:
 * Authorization: Bearer <token>
 *
 * Response:
 * {
 *   "success": true,
 *   "user": {
 *     "id": "uuid",
 *     "email": "user@example.com",
 *     "full_name": "John Doe",
 *     "timezone": "America/New_York",
 *     "notification_time": "08:00",
 *     "created_at": "2025-11-16T12:00:00Z"
 *   }
 * }
 */
app.get('/me', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    console.log('📍 /me endpoint called');
    console.log('Authorization header:', authHeader);
    const token = getAuthService().extractTokenFromHeader(authHeader);

    if (!token) {
      return c.json({ success: false, message: 'No authentication token provided' }, 401);
    }

    if (!getAuthService().validateToken(token)) {
      return c.json({ success: false, message: 'Invalid or expired token' }, 401);
    }

    const user = await getAuthService().getUserFromToken(token);

    if (!user) {
      return c.json({ success: false, message: 'User not found' }, 404);
    }

    // Remove password hash from response
    const { password_hash, ...safeUser } = user;

    return c.json({
      success: true,
      user: safeUser,
    });
  } catch (error) {
    console.error('Get user endpoint error:', error);
    return c.json({ success: false, message: 'Internal server error' }, 500);
  }
});

/**
 * POST /auth/change-password
 * Change user password (requires authentication)
 *
 * Headers:
 * Authorization: Bearer <token>
 *
 * Body:
 * {
 *   "oldPassword": "currentpassword123",
 *   "newPassword": "newpassword123"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "message": "Password changed successfully"
 * }
 */
app.post('/change-password', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const token = getAuthService().extractTokenFromHeader(authHeader);

    if (!token) {
      return c.json({ success: false, message: 'No authentication token provided' }, 401);
    }

    if (!getAuthService().validateToken(token)) {
      return c.json({ success: false, message: 'Invalid or expired token' }, 401);
    }

    const user = await getAuthService().getUserFromToken(token);

    if (!user) {
      return c.json({ success: false, message: 'User not found' }, 404);
    }

    const body = await c.req.json();
    const { oldPassword, newPassword } = body;

    const result = await getAuthService().changePassword(user.id, oldPassword, newPassword);

    if (!result.success) {
      return c.json({ success: false, message: result.message }, 400);
    }

    return c.json(result);
  } catch (error) {
    console.error('Change password endpoint error:', error);
    return c.json({ success: false, message: 'Internal server error' }, 500);
  }
});

/**
 * POST /auth/validate-token
 * Validate JWT token
 *
 * Headers:
 * Authorization: Bearer <token>
 *
 * Response:
 * {
 *   "success": true,
 *   "valid": true,
 *   "userId": "uuid",
 *   "email": "user@example.com"
 * }
 */
app.post('/validate-token', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const token = getAuthService().extractTokenFromHeader(authHeader);

    if (!token) {
      return c.json({
        success: false,
        valid: false,
        message: 'No authentication token provided',
      }, 401);
    }

    const isValid = getAuthService().validateToken(token);

    if (!isValid) {
      return c.json({
        success: false,
        valid: false,
        message: 'Invalid or expired token',
      }, 401);
    }

    const decoded = getAuthService().verifyToken(token);

    return c.json({
      success: true,
      valid: true,
      userId: decoded?.userId,
      email: decoded?.email,
    });
  } catch (error) {
    console.error('Validate token endpoint error:', error);
    return c.json({ success: false, message: 'Internal server error' }, 500);
  }
});

export default app;
