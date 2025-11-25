import { Hono } from 'hono';
import crypto from 'crypto';
import SupabaseClientService from '../services/supabase-client.js';
import { config } from '../config/index.js';

const app = new Hono();

// WHOOP API base URL
const WHOOP_API_BASE = 'https://api.prod.whoop.com/developer/v1';

/**
 * Helper: Verify HMAC-SHA256 signature from WHOOP
 *
 * WHOOP signature format:
 * - Prepend timestamp to raw request body
 * - HMAC-SHA256 with client_secret
 * - Base64 encode the result
 * - Compare to X-WHOOP-Signature header
 */
function verifyWebhookSignature(payload: string, signature: string, timestamp: string, secret: string): boolean {
  const message = timestamp + payload;
  const hmac = crypto.createHmac('sha256', secret).update(message).digest('base64');
  return hmac === signature;
}

/**
 * Helper: Store webhook payload in database for audit trail
 */
async function storeWebhookLog(
  whoopUserId: string,
  eventType: string,
  traceId: string,
  payload: Record<string, any>
): Promise<void> {
  const supabase = SupabaseClientService.getAdminClient();

  await supabase.from('webhook_logs').insert({
    provider: 'whoop',
    provider_id: whoopUserId,
    trace_id: traceId,
    event_type: eventType,
    payload,
    status: 'received',
    created_at: new Date().toISOString(),
  });
}

/**
 * Helper: Check if webhook was already processed
 */
async function isWebhookDuplicate(traceId: string): Promise<boolean> {
  const supabase = SupabaseClientService.getAdminClient();

  const { data } = await supabase
    .from('webhook_logs')
    .select('id')
    .eq('trace_id', traceId)
    .eq('status', 'processed')
    .limit(1)
    .single();

  return !!data;
}

/**
 * Helper: Mark webhook as processed
 */
async function markWebhookProcessed(traceId: string): Promise<void> {
  const supabase = SupabaseClientService.getAdminClient();

  await supabase
    .from('webhook_logs')
    .update({ status: 'processed', processed_at: new Date().toISOString() })
    .eq('trace_id', traceId);
}

/**
 * Helper: Find our user by WHOOP's user ID
 * WHOOP sends their internal user_id in webhooks
 */
async function findUserByWhoopId(whoopUserId: number | string): Promise<{
  userId: string;
  providerId: string;
  accessToken: string;
} | null> {
  const supabase = SupabaseClientService.getAdminClient();

  // WHOOP user_id is stored when we first fetch data
  // For now, we'll look up by the token that was used
  // TODO: Store whoop_user_id during OAuth flow

  // Try to find provider with matching whoop user ID in raw_data
  const { data: providers } = await supabase
    .from('user_health_providers')
    .select('id, user_id, access_token')
    .eq('provider_name', 'whoop')
    .eq('is_active', true);

  if (!providers || providers.length === 0) {
    return null;
  }

  // For now, check each provider's token to find the matching WHOOP user
  // This is a workaround until we store whoop_user_id during OAuth
  for (const provider of providers) {
    try {
      const response = await fetch(`${WHOOP_API_BASE}/user/profile/basic`, {
        headers: { Authorization: `Bearer ${provider.access_token}` },
      });

      if (response.ok) {
        const profile = (await response.json()) as any;
        if (profile.user_id === whoopUserId || String(profile.user_id) === String(whoopUserId)) {
          return {
            userId: provider.user_id,
            providerId: provider.id,
            accessToken: provider.access_token,
          };
        }
      }
    } catch (err) {
      // Token might be invalid, skip
    }
  }

  return null;
}

/**
 * Helper: Fetch cycle data from WHOOP API
 */
async function fetchCycleFromWhoop(accessToken: string, cycleId?: string): Promise<any> {
  // Fetch latest cycle
  const response = await fetch(`${WHOOP_API_BASE}/cycle`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`WHOOP API error: ${response.status}`);
  }

  const data = (await response.json()) as any;
  return data.records?.[0] || null;
}

/**
 * Helper: Store cycle metrics in database
 */
async function storeCycleMetrics(
  userId: string,
  providerId: string,
  cycle: any
): Promise<void> {
  if (!cycle) return;

  const supabase = SupabaseClientService.getAdminClient();
  const date = cycle.created_at?.split('T')[0] || new Date().toISOString().split('T')[0];
  const score = cycle.score || {};

  await supabase.from('health_metrics').upsert(
    {
      user_id: userId,
      provider_id: providerId,
      date,
      strain: score.strain,
      calories: score.kilojoule ? Math.round(score.kilojoule / 4.184) : null,
      average_heart_rate: score.average_heart_rate,
      max_heart_rate: score.max_heart_rate,
      raw_data: cycle,
      synced_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,provider_id,date' }
  );
}

/**
 * Helper: Fetch recovery data from WHOOP API
 */
async function fetchRecoveryFromWhoop(accessToken: string): Promise<any> {
  const response = await fetch(`${WHOOP_API_BASE}/recovery`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    // Recovery endpoint might not be available with current scopes
    console.warn('Recovery endpoint returned:', response.status);
    return null;
  }

  const data = (await response.json()) as any;
  return data.records?.[0] || null;
}

/**
 * Helper: Store recovery metrics in database
 */
async function storeRecoveryMetrics(
  userId: string,
  providerId: string,
  recovery: any
): Promise<void> {
  if (!recovery) return;

  const supabase = SupabaseClientService.getAdminClient();
  const date = recovery.created_at?.split('T')[0] || new Date().toISOString().split('T')[0];
  const score = recovery.score || {};

  // Update the existing health_metrics record with recovery data
  await supabase.from('health_metrics').upsert(
    {
      user_id: userId,
      provider_id: providerId,
      date,
      recovery_score: score.recovery_score,
      resting_heart_rate: score.resting_heart_rate,
      hrv: score.hrv_rmssd_milli ? score.hrv_rmssd_milli / 1000 : null, // Convert to seconds
      raw_data: recovery,
      synced_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,provider_id,date' }
  );
}

/**
 * POST /webhooks/whoop
 * Handle incoming webhooks from WHOOP
 *
 * WHOOP v2 webhook format:
 * {
 *   "user_id": 12345,
 *   "id": "uuid",
 *   "type": "recovery.updated" | "workout.updated" | "sleep.updated" | "cycle.updated",
 *   "trace_id": "uuid"
 * }
 */
app.post('/webhooks/whoop', async (c) => {
  try {
    const payload = await c.req.text();
    const signature = c.req.header('X-WHOOP-Signature');
    const timestamp = c.req.header('X-WHOOP-Signature-Timestamp');

    console.log('📥 WHOOP webhook received');

    // Verify signature headers are present
    if (!signature || !timestamp) {
      console.error('Missing signature headers:', { signature: !!signature, timestamp: !!timestamp });
      return c.json({ success: false, message: 'Missing signature headers' }, 401);
    }

    // Use WHOOP client secret for signature verification
    const clientSecret = config.whoop.clientSecret;
    if (!clientSecret) {
      console.error('WHOOP_CLIENT_SECRET not configured');
      return c.json({ success: false, message: 'Webhook not configured' }, 500);
    }

    if (!verifyWebhookSignature(payload, signature, timestamp, clientSecret)) {
      console.error('Invalid webhook signature');
      return c.json({ success: false, message: 'Invalid signature' }, 401);
    }

    // Parse payload
    let data: {
      user_id: number;
      id: string;
      type: string;
      trace_id: string;
    };

    try {
      data = JSON.parse(payload);
    } catch {
      return c.json({ success: false, message: 'Invalid JSON' }, 400);
    }

    console.log(`📨 Event: ${data.type} for WHOOP user: ${data.user_id}`);

    // Check for duplicate
    if (await isWebhookDuplicate(data.trace_id)) {
      console.log('⏭️ Duplicate webhook, skipping');
      return c.json({ success: true, message: 'Already processed' });
    }

    // Store webhook log
    await storeWebhookLog(String(data.user_id), data.type, data.trace_id, data);

    // Find our user
    const user = await findUserByWhoopId(data.user_id);
    if (!user) {
      console.warn(`⚠️ Unknown WHOOP user: ${data.user_id}`);
      await markWebhookProcessed(data.trace_id);
      return c.json({ success: true, message: 'User not found' });
    }

    console.log(`👤 Found user: ${user.userId}`);

    // Process based on event type
    switch (data.type) {
      case 'recovery.updated':
        console.log('🔄 Fetching recovery data...');
        const recovery = await fetchRecoveryFromWhoop(user.accessToken);
        if (recovery) {
          await storeRecoveryMetrics(user.userId, user.providerId, recovery);
          console.log('✅ Recovery data stored');
        } else {
          // Fallback: fetch cycle data which includes some metrics
          const cycle = await fetchCycleFromWhoop(user.accessToken);
          await storeCycleMetrics(user.userId, user.providerId, cycle);
          console.log('✅ Cycle data stored (recovery fallback)');
        }
        break;

      case 'cycle.updated':
        console.log('🔄 Fetching cycle data...');
        const cycleData = await fetchCycleFromWhoop(user.accessToken);
        await storeCycleMetrics(user.userId, user.providerId, cycleData);
        console.log('✅ Cycle data stored');
        break;

      case 'workout.updated':
        console.log('🔄 Processing workout update...');
        // Workout affects strain, so refresh cycle data
        const cycleAfterWorkout = await fetchCycleFromWhoop(user.accessToken);
        await storeCycleMetrics(user.userId, user.providerId, cycleAfterWorkout);
        console.log('✅ Cycle data updated after workout');
        break;

      case 'sleep.updated':
        console.log('🔄 Processing sleep update...');
        // Sleep data affects recovery, refresh cycle
        const cycleAfterSleep = await fetchCycleFromWhoop(user.accessToken);
        await storeCycleMetrics(user.userId, user.providerId, cycleAfterSleep);
        console.log('✅ Cycle data updated after sleep');
        break;

      default:
        console.log(`⚠️ Unknown event type: ${data.type}`);
    }

    // Mark as processed
    await markWebhookProcessed(data.trace_id);

    console.log(`✅ Webhook processed: ${data.type}`);

    return c.json({
      success: true,
      message: 'Webhook processed',
      event: data.type,
    });
  } catch (error) {
    console.error('❌ Webhook error:', error);
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
 * GET /webhooks/whoop
 * WHOOP verification endpoint - responds to webhook registration check
 */
app.get('/webhooks/whoop', async (c) => {
  const challenge = c.req.query('challenge');

  if (challenge) {
    // WHOOP sends a challenge during webhook registration
    return c.text(challenge);
  }

  return c.json({
    status: 'ok',
    message: 'WHOOP webhook endpoint ready',
    timestamp: new Date().toISOString(),
  });
});

export default app;
