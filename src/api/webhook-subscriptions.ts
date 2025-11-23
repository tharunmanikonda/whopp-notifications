import { Hono } from 'hono';
import SupabaseClientService from '../services/supabase-client.js';
import { AuthService } from '../services/auth-service.js';

const app = new Hono();
const authService = new AuthService();

/**
 * Helper: Validate JWT token from Authorization header
 */
function extractAndValidateToken(authHeader: string | undefined): { userId: string } | null {
  if (!authHeader) return null;

  const token = authHeader.replace('Bearer ', '');
  return authService.verifyToken(token);
}

/**
 * Helper: Register webhook subscription with WHOOP API
 */
async function registerWebhookWithWhoop(
  accessToken: string,
  webhookUrl: string,
  events: string[]
): Promise<{ subscriptionId: string }> {
  const response = await fetch('https://api.prod.whoop.com/api/v2/webhooks/subscriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      callback_url: webhookUrl,
      events,
      // Optional: request events only for specific actions
      active: true,
    }),
  });

  if (!response.ok) {
    const error = (await response.json()) as any;
    throw new Error(`WHOOP webhook registration failed: ${error.message}`);
  }

  const data = (await response.json()) as any;
  return {
    subscriptionId: data.subscription_id || data.id,
  };
}

/**
 * Helper: Unregister webhook subscription from WHOOP API
 */
async function unregisterWebhookFromWhoop(
  accessToken: string,
  subscriptionId: string
): Promise<void> {
  const response = await fetch(
    `https://api.prod.whoop.com/api/v2/webhooks/subscriptions/${subscriptionId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const error = (await response.json()) as any;
    throw new Error(`WHOOP webhook unregistration failed: ${error.message}`);
  }
}

/**
 * POST /webhook-subscriptions/register
 * Register a webhook subscription for a WHOOP user (requires auth)
 *
 * Headers:
 * Authorization: Bearer <JWT_TOKEN>
 *
 * Body:
 * {
 *   "provider_id": "whoop_provider_id",
 *   "webhook_url": "https://yourdomain.com/api/webhooks/whoop",
 *   "events": ["summary_updated", "workout_updated", "sleep_updated", "recovery_updated"]
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "subscription": {
 *     "id": "sub_123",
 *     "provider": "whoop",
 *     "user_id": "user_456",
 *     "webhook_url": "https://yourdomain.com/api/webhooks/whoop",
 *     "events": ["summary_updated", ...],
 *     "status": "active",
 *     "created_at": "2025-11-22T10:30:00Z"
 *   }
 * }
 */
app.post('/webhook-subscriptions/register', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const userInfo = extractAndValidateToken(authHeader);

    if (!userInfo) {
      return c.json(
        {
          success: false,
          message: 'Missing or invalid authorization token',
        },
        401
      );
    }

    const body = await c.req.json();
    const { provider_id, webhook_url, events } = body;

    if (!provider_id || !webhook_url || !events || events.length === 0) {
      return c.json(
        {
          success: false,
          message: 'Missing required fields: provider_id, webhook_url, events',
        },
        400
      );
    }

    const supabase = SupabaseClientService.getAdminClient();

    // Get the WHOOP provider record to access the access token
    const { data: provider, error: providerError } = await supabase
      .from('user_health_providers')
      .select('id, access_token, user_id')
      .eq('id', provider_id)
      .eq('user_id', userInfo.userId)
      .eq('provider_name', 'whoop')
      .single();

    if (providerError || !provider) {
      return c.json(
        {
          success: false,
          message: 'WHOOP provider not found',
        },
        404
      );
    }

    // Register webhook with WHOOP
    let subscriptionId: string;
    try {
      const registration = await registerWebhookWithWhoop(provider.access_token, webhook_url, events);
      subscriptionId = registration.subscriptionId;
    } catch (whoopError) {
      console.error('WHOOP webhook registration error:', whoopError);
      return c.json(
        {
          success: false,
          message: whoopError instanceof Error ? whoopError.message : 'Failed to register webhook with WHOOP',
        },
        500
      );
    }

    // Store subscription in our database
    const { data: subscription, error: insertError } = await supabase
      .from('webhook_subscriptions')
      .insert({
        user_id: userInfo.userId,
        provider: 'whoop',
        provider_id: provider.id,
        webhook_url,
        events,
        external_subscription_id: subscriptionId,
        status: 'active',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to store webhook subscription:', insertError);
      // Try to rollback WHOOP subscription
      try {
        await unregisterWebhookFromWhoop(provider.access_token, subscriptionId);
      } catch (rollbackError) {
        console.error('Failed to rollback WHOOP subscription:', rollbackError);
      }

      return c.json(
        {
          success: false,
          message: 'Failed to store webhook subscription',
        },
        500
      );
    }

    console.log(`✅ Webhook subscription registered for user ${userInfo.userId}:`, subscriptionId);

    return c.json({
      success: true,
      subscription: {
        id: subscription.id,
        provider: subscription.provider,
        user_id: subscription.user_id,
        webhook_url: subscription.webhook_url,
        events: subscription.events,
        status: subscription.status,
        created_at: subscription.created_at,
      },
    });
  } catch (error) {
    console.error('Webhook subscription registration error:', error);
    return c.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to register webhook',
      },
      500
    );
  }
});

/**
 * GET /webhook-subscriptions
 * List all webhook subscriptions for the current user (requires auth)
 *
 * Headers:
 * Authorization: Bearer <JWT_TOKEN>
 *
 * Response:
 * {
 *   "success": true,
 *   "subscriptions": [
 *     {
 *       "id": "sub_123",
 *       "provider": "whoop",
 *       "webhook_url": "https://...",
 *       "events": [...],
 *       "status": "active",
 *       "created_at": "2025-11-22T10:30:00Z"
 *     }
 *   ]
 * }
 */
app.get('/webhook-subscriptions', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const userInfo = extractAndValidateToken(authHeader);

    if (!userInfo) {
      return c.json(
        {
          success: false,
          message: 'Missing or invalid authorization token',
        },
        401
      );
    }

    const supabase = SupabaseClientService.getAdminClient();

    const { data: subscriptions, error } = await supabase
      .from('webhook_subscriptions')
      .select('id, provider, webhook_url, events, status, created_at')
      .eq('user_id', userInfo.userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching subscriptions:', error);
      return c.json(
        {
          success: false,
          message: 'Failed to fetch subscriptions',
        },
        500
      );
    }

    return c.json({
      success: true,
      subscriptions: subscriptions || [],
    });
  } catch (error) {
    console.error('Webhook subscriptions fetch error:', error);
    return c.json(
      {
        success: false,
        message: 'Failed to fetch subscriptions',
      },
      500
    );
  }
});

/**
 * DELETE /webhook-subscriptions/:subscriptionId
 * Unregister a webhook subscription (requires auth)
 *
 * Headers:
 * Authorization: Bearer <JWT_TOKEN>
 *
 * Response:
 * {
 *   "success": true,
 *   "message": "Webhook subscription deleted"
 * }
 */
app.delete('/webhook-subscriptions/:subscriptionId', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const userInfo = extractAndValidateToken(authHeader);
    const subscriptionId = c.req.param('subscriptionId');

    if (!userInfo) {
      return c.json(
        {
          success: false,
          message: 'Missing or invalid authorization token',
        },
        401
      );
    }

    const supabase = SupabaseClientService.getAdminClient();

    // Get subscription details
    const { data: subscription, error: fetchError } = await supabase
      .from('webhook_subscriptions')
      .select('id, external_subscription_id, provider_id, user_id')
      .eq('id', subscriptionId)
      .eq('user_id', userInfo.userId)
      .single();

    if (fetchError || !subscription) {
      return c.json(
        {
          success: false,
          message: 'Webhook subscription not found',
        },
        404
      );
    }

    // Get provider details to access the access token
    const { data: provider } = await supabase
      .from('user_health_providers')
      .select('access_token')
      .eq('id', subscription.provider_id)
      .single();

    if (!provider) {
      return c.json(
        {
          success: false,
          message: 'Associated provider not found',
        },
        404
      );
    }

    // Unregister webhook from WHOOP
    try {
      await unregisterWebhookFromWhoop(provider.access_token, subscription.external_subscription_id);
    } catch (whoopError) {
      console.error('WHOOP webhook unregistration error:', whoopError);
      // Continue even if WHOOP unregistration fails - still delete from our DB
    }

    // Delete from our database
    const { error: deleteError } = await supabase
      .from('webhook_subscriptions')
      .delete()
      .eq('id', subscriptionId)
      .eq('user_id', userInfo.userId);

    if (deleteError) {
      console.error('Failed to delete subscription:', deleteError);
      return c.json(
        {
          success: false,
          message: 'Failed to delete subscription',
        },
        500
      );
    }

    console.log(`✅ Webhook subscription deleted: ${subscriptionId}`);

    return c.json({
      success: true,
      message: 'Webhook subscription deleted',
    });
  } catch (error) {
    console.error('Webhook subscription deletion error:', error);
    return c.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete subscription',
      },
      500
    );
  }
});

/**
 * GET /webhook-subscriptions/status
 * Check webhook status and health
 *
 * Headers:
 * Authorization: Bearer <JWT_TOKEN>
 *
 * Response:
 * {
 *   "success": true,
 *   "status": {
 *     "active_subscriptions": 4,
 *     "last_webhook_at": "2025-11-22T10:35:00Z",
 *     "failed_webhooks_last_hour": 0,
 *     "health": "healthy"
 *   }
 * }
 */
app.get('/webhook-subscriptions/status', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const userInfo = extractAndValidateToken(authHeader);

    if (!userInfo) {
      return c.json(
        {
          success: false,
          message: 'Missing or invalid authorization token',
        },
        401
      );
    }

    const supabase = SupabaseClientService.getAdminClient();

    // Count active subscriptions
    const { count: activeCount } = await supabase
      .from('webhook_subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userInfo.userId)
      .eq('status', 'active');

    // Get last webhook timestamp
    const { data: lastWebhook } = await supabase
      .from('webhook_logs')
      .select('created_at')
      .eq('user_id', userInfo.userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Count failed webhooks in last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: failedCount } = await supabase
      .from('webhook_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userInfo.userId)
      .eq('status', 'failed')
      .gte('created_at', oneHourAgo);

    const health = failedCount === 0 ? 'healthy' : failedCount! < 5 ? 'degraded' : 'unhealthy';

    return c.json({
      success: true,
      status: {
        active_subscriptions: activeCount || 0,
        last_webhook_at: lastWebhook?.created_at || null,
        failed_webhooks_last_hour: failedCount || 0,
        health,
      },
    });
  } catch (error) {
    console.error('Webhook status check error:', error);
    return c.json(
      {
        success: false,
        message: 'Failed to check webhook status',
      },
      500
    );
  }
});

export default app;
