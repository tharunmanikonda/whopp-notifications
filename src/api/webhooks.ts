import { Hono } from 'hono';
import crypto from 'crypto';
import SupabaseClientService from '../services/supabase-client.js';
import { config } from '../config/index.js';

const app = new Hono();

/**
 * Helper: Verify HMAC-SHA256 signature from WHOOP
 *
 * WHOOP sends webhooks with signature verification:
 * - Header: X-Whoop-Signature
 * - Algorithm: HMAC-SHA256
 * - Secret: Your webhook secret (registered in WHOOP dashboard)
 * - Message: Raw request body
 */
function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return hmac === signature;
}

/**
 * Helper: Store webhook payload in database for processing
 * Prevents duplicate processing of the same webhook
 */
async function storeWebhookPayload(
  providerId: string,
  timestamp: string,
  payload: Record<string, any>
): Promise<void> {
  const supabase = SupabaseClientService.getAdminClient();

  // Generate a trace ID to prevent duplicate processing
  const traceId = crypto.createHash('sha256').update(JSON.stringify(payload) + timestamp).digest('hex');

  const { error } = await supabase
    .from('webhook_logs')
    .insert({
      provider: 'whoop',
      provider_id: providerId,
      trace_id: traceId,
      payload,
      status: 'received',
      created_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Failed to store webhook payload:', error);
    throw error;
  }
}

/**
 * Helper: Check if webhook was already processed
 * Returns true if this exact webhook was processed before
 */
async function isWebhookDuplicate(traceId: string): Promise<boolean> {
  const supabase = SupabaseClientService.getAdminClient();

  const { data, error } = await supabase
    .from('webhook_logs')
    .select('id')
    .eq('trace_id', traceId)
    .eq('status', 'processed')
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error checking duplicate webhook:', error);
  }

  return !!data;
}

/**
 * Helper: Mark webhook as processed
 */
async function markWebhookProcessed(traceId: string): Promise<void> {
  const supabase = SupabaseClientService.getAdminClient();

  const { error } = await supabase
    .from('webhook_logs')
    .update({ status: 'processed', processed_at: new Date().toISOString() })
    .eq('trace_id', traceId);

  if (error) {
    console.error('Failed to mark webhook processed:', error);
  }
}

/**
 * POST /webhooks/whoop
 * Handle incoming webhooks from WHOOP
 *
 * WHOOP sends activity updates when user syncs device
 *
 * Query params:
 * - timestamp: ISO 8601 timestamp of event
 * - events: Comma-separated list of events
 *
 * Body:
 * {
 *   "event": "summary_updated|workout_updated|sleep_updated|recovery_updated",
 *   "user_id": "uuid",
 *   "created_at": "2025-11-22T10:30:00Z",
 *   "updated_at": "2025-11-22T10:35:00Z",
 *   "data": { ... event-specific data ... }
 * }
 *
 * Headers:
 * - X-Whoop-Signature: HMAC-SHA256 signature of request body
 */
app.post('/webhooks/whoop', async (c) => {
  try {
    // Get raw body for signature verification
    const payload = await c.req.text();
    const signature = c.req.header('X-Whoop-Signature');
    const timestamp = c.req.query('timestamp');
    const events = c.req.query('events');

    console.log('WHOOP webhook received:', {
      timestamp,
      events,
      signature: signature?.substring(0, 20) + '...',
    });

    // Verify signature is present
    if (!signature) {
      console.error('Missing X-Whoop-Signature header');
      return c.json(
        {
          success: false,
          message: 'Missing signature header',
        },
        401
      );
    }

    // Verify signature using webhook secret
    // Note: You need to set WHOOP_WEBHOOK_SECRET in environment
    const webhookSecret = process.env.WHOOP_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('WHOOP_WEBHOOK_SECRET not configured');
      return c.json(
        {
          success: false,
          message: 'Webhook secret not configured',
        },
        500
      );
    }

    if (!verifyWebhookSignature(payload, signature, webhookSecret)) {
      console.error('Invalid webhook signature');
      return c.json(
        {
          success: false,
          message: 'Invalid signature',
        },
        401
      );
    }

    // Parse webhook payload
    let data: Record<string, any>;
    try {
      data = JSON.parse(payload);
    } catch (parseError) {
      console.error('Failed to parse webhook payload:', parseError);
      return c.json(
        {
          success: false,
          message: 'Invalid JSON payload',
        },
        400
      );
    }

    // Generate trace ID to prevent duplicate processing
    const traceId = crypto
      .createHash('sha256')
      .update(payload + timestamp)
      .digest('hex');

    // Check if already processed
    const isDuplicate = await isWebhookDuplicate(traceId);
    if (isDuplicate) {
      console.log('Webhook already processed, skipping:', traceId.substring(0, 20) + '...');
      return c.json({ success: true, message: 'Webhook already processed' });
    }

    // Store webhook for audit trail
    await storeWebhookPayload(data.user_id || 'unknown', timestamp || new Date().toISOString(), data);

    // Process webhook based on event type
    const eventType = data.event || events;

    switch (eventType) {
      case 'summary_updated':
        await processSummaryUpdate(data);
        break;
      case 'workout_updated':
        await processWorkoutUpdate(data);
        break;
      case 'sleep_updated':
        await processSleepUpdate(data);
        break;
      case 'recovery_updated':
        await processRecoveryUpdate(data);
        break;
      default:
        console.warn(`Unknown event type: ${eventType}`);
    }

    // Mark as processed
    await markWebhookProcessed(traceId);

    console.log(`✅ WHOOP webhook processed successfully: ${eventType}`);

    return c.json({
      success: true,
      message: 'Webhook processed',
      event: eventType,
    });
  } catch (error) {
    console.error('WHOOP webhook error:', error);
    return c.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to process webhook',
      },
      500
    );
  }
});

/**
 * Process summary_updated event from WHOOP
 * Fired when daily summary (strain, recovery, sleep) is updated
 */
async function processSummaryUpdate(data: Record<string, any>): Promise<void> {
  console.log('Processing summary update for user:', data.user_id);

  const supabase = SupabaseClientService.getAdminClient();

  // Find user by WHOOP user ID
  const { data: user } = await supabase
    .from('user_health_providers')
    .select('user_id, id')
    .eq('provider_name', 'whoop')
    .eq('external_user_id', data.user_id)
    .single();

  if (!user) {
    console.warn(`Unknown WHOOP user: ${data.user_id}`);
    return;
  }

  // Store the summary data
  await supabase
    .from('user_metrics')
    .upsert(
      {
        user_id: user.user_id,
        provider: 'whoop',
        metric_type: 'summary',
        date: data.updated_at?.split('T')[0] || new Date().toISOString().split('T')[0],
        data: data.data || {},
        synced_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,provider,metric_type,date' }
    );

  console.log(`✅ Summary data stored for user ${user.user_id}`);
}

/**
 * Process workout_updated event from WHOOP
 * Fired when a workout is logged or updated
 */
async function processWorkoutUpdate(data: Record<string, any>): Promise<void> {
  console.log('Processing workout update for user:', data.user_id);

  const supabase = SupabaseClientService.getAdminClient();

  // Find user by WHOOP user ID
  const { data: user } = await supabase
    .from('user_health_providers')
    .select('user_id, id')
    .eq('provider_name', 'whoop')
    .eq('external_user_id', data.user_id)
    .single();

  if (!user) {
    console.warn(`Unknown WHOOP user: ${data.user_id}`);
    return;
  }

  // Store the workout data
  await supabase
    .from('user_metrics')
    .upsert(
      {
        user_id: user.user_id,
        provider: 'whoop',
        metric_type: 'workout',
        date: data.updated_at?.split('T')[0] || new Date().toISOString().split('T')[0],
        data: data.data || {},
        synced_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,provider,metric_type,date' }
    );

  console.log(`✅ Workout data stored for user ${user.user_id}`);
}

/**
 * Process sleep_updated event from WHOOP
 * Fired when sleep data is synced (night sleep)
 */
async function processSleepUpdate(data: Record<string, any>): Promise<void> {
  console.log('Processing sleep update for user:', data.user_id);

  const supabase = SupabaseClientService.getAdminClient();

  // Find user by WHOOP user ID
  const { data: user } = await supabase
    .from('user_health_providers')
    .select('user_id, id')
    .eq('provider_name', 'whoop')
    .eq('external_user_id', data.user_id)
    .single();

  if (!user) {
    console.warn(`Unknown WHOOP user: ${data.user_id}`);
    return;
  }

  // Store the sleep data
  await supabase
    .from('user_metrics')
    .upsert(
      {
        user_id: user.user_id,
        provider: 'whoop',
        metric_type: 'sleep',
        date: data.updated_at?.split('T')[0] || new Date().toISOString().split('T')[0],
        data: data.data || {},
        synced_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,provider,metric_type,date' }
    );

  console.log(`✅ Sleep data stored for user ${user.user_id}`);
}

/**
 * Process recovery_updated event from WHOOP
 * Fired when recovery metrics are calculated
 */
async function processRecoveryUpdate(data: Record<string, any>): Promise<void> {
  console.log('Processing recovery update for user:', data.user_id);

  const supabase = SupabaseClientService.getAdminClient();

  // Find user by WHOOP user ID
  const { data: user } = await supabase
    .from('user_health_providers')
    .select('user_id, id')
    .eq('provider_name', 'whoop')
    .eq('external_user_id', data.user_id)
    .single();

  if (!user) {
    console.warn(`Unknown WHOOP user: ${data.user_id}`);
    return;
  }

  // Store the recovery data
  await supabase
    .from('user_metrics')
    .upsert(
      {
        user_id: user.user_id,
        provider: 'whoop',
        metric_type: 'recovery',
        date: data.updated_at?.split('T')[0] || new Date().toISOString().split('T')[0],
        data: data.data || {},
        synced_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,provider,metric_type,date' }
    );

  console.log(`✅ Recovery data stored for user ${user.user_id}`);
}

export default app;
