/**
 * Authentication API Routes
 * Handles user signup, login, and profile management
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { AuthService } from '../../src/services/auth-service.js';

const authService = new AuthService();

/**
 * Handle different HTTP methods
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action } = req.query;

  try {
    switch (action) {
      case 'signup':
        return handleSignup(req, res);
      case 'login':
        return handleLogin(req, res);
      case 'me':
        return handleGetProfile(req, res);
      case 'change-password':
        return handleChangePassword(req, res);
      case 'validate-token':
        return handleValidateToken(req, res);
      default:
        return res.status(404).json({
          success: false,
          message: `Unknown auth action: ${action}`,
        });
    }
  } catch (error) {
    console.error('Auth handler error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

/**
 * POST /api/routes/auth?action=signup
 * Create new user account
 */
async function handleSignup(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { email, password, fullName, timezone, notificationTime } = req.body;

  const result = await authService.signup(
    email,
    password,
    fullName,
    timezone,
    notificationTime
  );

  if (!result.success) {
    return res.status(400).json(result);
  }

  return res.status(201).json(result);
}

/**
 * POST /api/routes/auth?action=login
 * Authenticate user and get JWT token
 */
async function handleLogin(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { email, password } = req.body;

  const result = await authService.login(email, password);

  if (!result.success) {
    return res.status(401).json(result);
  }

  return res.status(200).json(result);
}

/**
 * GET /api/routes/auth?action=me
 * Get current user profile (requires authentication)
 */
async function handleGetProfile(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  const token = authService.extractTokenFromHeader(authHeader);

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'No authentication token provided',
    });
  }

  if (!authService.validateToken(token)) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }

  const user = await authService.getUserFromToken(token);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  // Remove password hash
  const { password_hash, ...safeUser } = user;

  return res.status(200).json({
    success: true,
    user: safeUser,
  });
}

/**
 * POST /api/routes/auth?action=change-password
 * Change user password (requires authentication)
 */
async function handleChangePassword(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  const token = authService.extractTokenFromHeader(authHeader);

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'No authentication token provided',
    });
  }

  if (!authService.validateToken(token)) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }

  const user = await authService.getUserFromToken(token);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  const { oldPassword, newPassword } = req.body;

  const result = await authService.changePassword(user.id, oldPassword, newPassword);

  if (!result.success) {
    return res.status(400).json(result);
  }

  return res.status(200).json(result);
}

/**
 * POST /api/routes/auth?action=validate-token
 * Validate JWT token
 */
async function handleValidateToken(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  const token = authService.extractTokenFromHeader(authHeader);

  if (!token) {
    return res.status(401).json({
      success: false,
      valid: false,
      message: 'No authentication token provided',
    });
  }

  const isValid = authService.validateToken(token);

  if (!isValid) {
    return res.status(401).json({
      success: false,
      valid: false,
      message: 'Invalid or expired token',
    });
  }

  const decoded = authService.verifyToken(token);

  return res.status(200).json({
    success: true,
    valid: true,
    userId: decoded?.userId,
    email: decoded?.email,
  });
}
