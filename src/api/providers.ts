import { Hono } from 'hono';
import SupabaseClientService from '../services/supabase-client.js';
import { AuthService } from '../services/auth-service.js';

const app = new Hono();
const authService = new AuthService();

/**
 * Available health providers
 */
const AVAILABLE_PROVIDERS = [
  {
    id: 'whoop',
    name: 'Whoop Band',
    icon: '⌚',
    description: 'Track strain, recovery, and sleep metrics',
    metrics: ['Strain', 'Recovery', 'Sleep Performance'],
    status: 'available',
  },
  {
    id: 'fitbit',
    name: 'Fitbit',
    icon: '💪',
    description: 'Monitor daily activity, heart rate, and sleep',
    metrics: ['Activity', 'Heart Rate', 'Sleep'],
    status: 'available',
  },
  {
    id: 'garmin',
    name: 'Garmin',
    icon: '🏃',
    description: 'Advanced sports tracking and fitness metrics',
    metrics: ['Training Load', 'VO2 Max', 'Stress'],
    status: 'coming_soon',
  },
  {
    id: 'apple',
    name: 'Apple Health',
    icon: '🍎',
    description: 'Unified health data from your Apple devices',
    metrics: ['Health Data', 'Workouts', 'Steps'],
    status: 'coming_soon',
  },
  {
    id: 'samsung',
    name: 'Samsung Health',
    icon: '📱',
    description: 'Health tracking from Samsung devices',
    metrics: ['Activity', 'Heart Rate', 'Sleep'],
    status: 'coming_soon',
  },
  {
    id: 'oura',
    name: 'Oura Ring',
    icon: '💍',
    description: 'Comprehensive ring-based health monitoring',
    metrics: ['Sleep', 'Readiness', 'Activity'],
    status: 'coming_soon',
  },
];

/**
 * GET /providers/available
 * Get all available health providers
 *
 * Response:
 * {
 *   "success": true,
 *   "available_providers": [
 *     {
 *       "id": "whoop",
 *       "name": "Whoop Band",
 *       "icon": "⌚",
 *       "description": "Track strain, recovery, and sleep metrics",
 *       "metrics": ["Strain", "Recovery", "Sleep Performance"],
 *       "status": "available"
 *     },
 *     ...
 *   ]
 * }
 */
app.get('/available', (c) => {
  return c.json({
    success: true,
    available_providers: AVAILABLE_PROVIDERS,
  });
});

/**
 * GET /providers/list
 * Get list of connected providers for the current user (requires auth)
 *
 * Headers:
 * Authorization: Bearer <token>
 *
 * Response:
 * {
 *   "success": true,
 *   "providers": {
 *     "connected": [
 *       {
 *         "id": "whoop",
 *         "provider_name": "whoop",
 *         "is_primary": true,
 *         "connected_since": "2025-11-17T03:05:57.126732"
 *       }
 *     ]
 *   }
 * }
 */
app.get('/list', async (c) => {
  try {
    // TODO: Implement database query to fetch user's connected providers
    // For now, return empty list
    return c.json({
      success: true,
      providers: {
        connected: [],
      },
    });
  } catch (error) {
    console.error('Error fetching connected providers:', error);
    return c.json(
      {
        success: false,
        message: 'Failed to fetch connected providers',
      },
      500
    );
  }
});

/**
 * POST /providers/connect
 * Connect a provider to the current user's account (requires auth)
 *
 * Headers:
 * Authorization: Bearer <token>
 *
 * Body:
 * {
 *   "provider_name": "whoop",
 *   "access_token": "...",
 *   "refresh_token": "..." (optional)
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "message": "Provider connected successfully",
 *   "provider": {
 *     "id": "whoop",
 *     "provider_name": "whoop",
 *     "is_primary": false,
 *     "connected_since": "2025-11-17T03:05:57.126732"
 *   }
 * }
 */
app.post('/connect', async (c) => {
  try {
    // Get authorization token from header
    const authHeader = c.req.header('Authorization');
    const token = authHeader ? authHeader.replace('Bearer ', '') : null;

    if (!token) {
      return c.json(
        {
          success: false,
          message: 'Missing authorization token',
        },
        401
      );
    }

    // Validate token and get user info
    const userInfo = authService.verifyToken(token);
    if (!userInfo) {
      return c.json(
        {
          success: false,
          message: 'Invalid or expired token',
        },
        401
      );
    }

    const body = await c.req.json();
    const { provider_name, access_token, refresh_token } = body;

    if (!provider_name || !access_token) {
      return c.json(
        {
          success: false,
          message: 'Missing provider_name or access_token',
        },
        400
      );
    }

    // Store tokens in user_health_providers table
    const supabase = SupabaseClientService.getAdminClient();
    const { data, error } = await supabase
      .from('user_health_providers')
      .insert({
        user_id: userInfo.userId,
        provider_name,
        access_token,
        refresh_token: refresh_token || null,
        is_primary: false,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error storing provider tokens:', error);
      return c.json(
        {
          success: false,
          message: 'Failed to store provider credentials',
        },
        500
      );
    }

    console.log(`Provider ${provider_name} connected for user ${userInfo.userId}`);

    return c.json({
      success: true,
      message: 'Provider connected successfully',
      provider: {
        id: data.id,
        provider_name: data.provider_name,
        is_primary: data.is_primary,
        connected_since: data.created_at,
      },
    });
  } catch (error) {
    console.error('Error connecting provider:', error);
    return c.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to connect provider',
      },
      500
    );
  }
});

/**
 * DELETE /providers/disconnect
 * Disconnect a provider from the user's account (requires auth)
 *
 * Headers:
 * Authorization: Bearer <token>
 *
 * Body:
 * {
 *   "provider_id": "whoop"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "message": "Provider disconnected successfully"
 * }
 */
app.delete('/disconnect', async (c) => {
  try {
    const body = await c.req.json();
    const { provider_id } = body;

    // TODO: Validate token
    // TODO: Remove provider from database
    // TODO: Revoke access tokens

    return c.json({
      success: true,
      message: 'Provider disconnected successfully',
    });
  } catch (error) {
    console.error('Error disconnecting provider:', error);
    return c.json(
      {
        success: false,
        message: 'Failed to disconnect provider',
      },
      500
    );
  }
});

/**
 * POST /providers/set-primary
 * Set a provider as the primary data source (requires auth)
 *
 * Headers:
 * Authorization: Bearer <token>
 *
 * Body:
 * {
 *   "provider_name": "whoop"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "message": "Primary provider updated successfully",
 *   "provider": {
 *     "provider_name": "whoop",
 *     "is_primary": true
 *   }
 * }
 */
app.post('/set-primary', async (c) => {
  try {
    const body = await c.req.json();
    const { provider_name } = body;

    // TODO: Validate token
    // TODO: Update database to set provider as primary

    return c.json({
      success: true,
      message: 'Primary provider updated successfully',
      provider: {
        provider_name,
        is_primary: true,
      },
    });
  } catch (error) {
    console.error('Error setting primary provider:', error);
    return c.json(
      {
        success: false,
        message: 'Failed to set primary provider',
      },
      500
    );
  }
});

export default app;
