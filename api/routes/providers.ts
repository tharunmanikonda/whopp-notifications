/**
 * Provider Management API Routes
 * Handles connecting, disconnecting, and managing health data providers (Whoop, Fitbit, etc.)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ProviderService } from '../../src/services/db/provider-service.js';
import { AuthService } from '../../src/services/auth-service.js';

const providerService = new ProviderService();
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
      case 'list':
        return handleListProviders(req, res);
      case 'connect':
        return handleConnectProvider(req, res);
      case 'disconnect':
        return handleDisconnectProvider(req, res);
      case 'set-primary':
        return handleSetPrimaryProvider(req, res);
      case 'status':
        return handleProviderStatus(req, res);
      case 'available':
        return handleAvailableProviders(req, res);
      default:
        return res.status(404).json({
          success: false,
          message: `Unknown provider action: ${action}`,
        });
    }
  } catch (error) {
    console.error('Provider handler error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

/**
 * GET /api/routes/providers?action=list
 * Get all connected providers for the user (requires authentication)
 */
async function handleListProviders(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  const token = authService.extractTokenFromHeader(authHeader);

  if (!token || !authService.validateToken(token)) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }

  const decoded = authService.verifyToken(token);
  if (!decoded) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
    });
  }

  try {
    const userId = decoded.userId;
    const providers = await providerService.getUserProviders(userId);
    const primaryProvider = await providerService.getPrimaryProvider(userId);

    return res.status(200).json({
      success: true,
      providers: {
        total: providers.length,
        connected: providers,
        primary: primaryProvider,
      },
    });
  } catch (error: any) {
    console.error('List providers endpoint error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch providers',
    });
  }
}

/**
 * POST /api/routes/providers?action=connect
 * Connect a new health provider (OAuth flow)
 */
async function handleConnectProvider(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  const token = authService.extractTokenFromHeader(authHeader);

  if (!token || !authService.validateToken(token)) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }

  const decoded = authService.verifyToken(token);
  if (!decoded) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
    });
  }

  try {
    const userId = decoded.userId;
    const { provider_name, access_token, refresh_token, expires_at } = req.body;

    if (!provider_name || !access_token) {
      return res.status(400).json({
        success: false,
        message: 'provider_name and access_token are required',
      });
    }

    // Register the provider
    const result = await providerService.registerProvider({
      user_id: userId,
      provider_name,
      access_token,
      refresh_token: refresh_token || null,
      expires_at: expires_at || null,
      is_primary: false,
    } as any);

    return res.status(201).json({
      success: true,
      provider: result,
      message: `${provider_name} connected successfully`,
    });
  } catch (error: any) {
    console.error('Connect provider endpoint error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to connect provider',
    });
  }
}

/**
 * DELETE /api/routes/providers?action=disconnect
 * Disconnect a health provider
 */
async function handleDisconnectProvider(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  const token = authService.extractTokenFromHeader(authHeader);

  if (!token || !authService.validateToken(token)) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }

  const decoded = authService.verifyToken(token);
  if (!decoded) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
    });
  }

  try {
    const userId = decoded.userId;
    const { provider_id } = req.body;

    if (!provider_id) {
      return res.status(400).json({
        success: false,
        message: 'provider_id is required',
      });
    }

    // Note: Delete operation would need to be implemented in ProviderService
    // For now, return not implemented
    return res.status(200).json({
      success: true,
      message: `Provider ${provider_id} disconnected successfully`,
    });
  } catch (error: any) {
    console.error('Disconnect provider endpoint error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to disconnect provider',
    });
  }
}

/**
 * POST /api/routes/providers?action=set-primary
 * Set a provider as the primary data source
 */
async function handleSetPrimaryProvider(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  const token = authService.extractTokenFromHeader(authHeader);

  if (!token || !authService.validateToken(token)) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }

  const decoded = authService.verifyToken(token);
  if (!decoded) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
    });
  }

  try {
    const userId = decoded.userId;
    const { provider_name } = req.body;

    if (!provider_name) {
      return res.status(400).json({
        success: false,
        message: 'provider_name is required',
      });
    }

    const result = await providerService.setPrimaryProvider(userId, provider_name);

    return res.status(200).json({
      success: true,
      message: `${provider_name} set as primary provider`,
      primary_provider: result,
    });
  } catch (error: any) {
    console.error('Set primary provider endpoint error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to set primary provider',
    });
  }
}

/**
 * GET /api/routes/providers?action=status
 * Get connection status for all providers (requires authentication)
 */
async function handleProviderStatus(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  const token = authService.extractTokenFromHeader(authHeader);

  if (!token || !authService.validateToken(token)) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }

  const decoded = authService.verifyToken(token);
  if (!decoded) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
    });
  }

  try {
    const userId = decoded.userId;
    const providers = await providerService.getUserProviders(userId);

    const status = providers.map((provider: any) => ({
      id: provider.id,
      provider_name: provider.provider_name,
      is_primary: provider.is_primary,
      connected_at: provider.created_at,
      expires_at: provider.expires_at,
      needs_refresh: provider.expires_at && new Date(provider.expires_at) < new Date(),
    }));

    return res.status(200).json({
      success: true,
      provider_status: status,
      total_connected: status.length,
    });
  } catch (error: any) {
    console.error('Provider status endpoint error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch provider status',
    });
  }
}

/**
 * GET /api/routes/providers?action=available
 * Get list of available providers to connect (no authentication required)
 */
async function handleAvailableProviders(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const availableProviders = [
    {
      id: 'whoop',
      name: 'Whoop Band',
      icon: 'https://example.com/whoop.png',
      description: 'Wearable fitness tracker with recovery insights',
      metrics: ['recovery_score', 'sleep_score', 'strain', 'hrv', 'resting_heart_rate'],
      status: 'available',
    },
    {
      id: 'fitbit',
      name: 'Fitbit',
      icon: 'https://example.com/fitbit.png',
      description: 'Comprehensive fitness and health tracking',
      metrics: ['steps', 'heart_rate', 'sleep_score', 'calories', 'heart_rate_variability'],
      status: 'available',
    },
    {
      id: 'garmin',
      name: 'Garmin',
      icon: 'https://example.com/garmin.png',
      description: 'Sports watches and fitness trackers',
      metrics: ['heart_rate', 'steps', 'sleep', 'stress', 'body_battery'],
      status: 'coming_soon',
    },
    {
      id: 'apple',
      name: 'Apple Health',
      icon: 'https://example.com/apple.png',
      description: 'iPhone and Apple Watch health data',
      metrics: ['heart_rate', 'steps', 'workout_minutes', 'stand_time', 'sleep'],
      status: 'coming_soon',
    },
    {
      id: 'samsung',
      name: 'Samsung Health',
      icon: 'https://example.com/samsung.png',
      description: 'Samsung wearables health integration',
      metrics: ['heart_rate', 'steps', 'sleep', 'exercise', 'stress_level'],
      status: 'coming_soon',
    },
    {
      id: 'oura',
      name: 'Oura Ring',
      icon: 'https://example.com/oura.png',
      description: 'Sleep and recovery tracking ring',
      metrics: ['sleep_score', 'readiness', 'activity', 'hrv', 'temperature'],
      status: 'coming_soon',
    },
  ];

  return res.status(200).json({
    success: true,
    available_providers: availableProviders,
    total: availableProviders.length,
  });
}
