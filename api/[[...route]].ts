import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import { cors } from 'hono/cors';
import crypto from 'crypto';

// Re-export types for Vercel
export const config = {
  runtime: 'nodejs',
};

const app = new Hono().basePath('/api');

// Enable CORS
app.use('/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: 'vercel',
  });
});

// Version endpoint
app.get('/version', (c) => {
  return c.json({
    api: 'Whoop AI Motivator',
    version: '1.0.0',
  });
});

// Webhook endpoint for WHOOP
app.get('/webhooks/whoop', (c) => {
  const challenge = c.req.query('challenge');
  if (challenge) {
    return c.text(challenge);
  }
  return c.json({
    status: 'ok',
    message: 'WHOOP webhook endpoint ready',
    timestamp: new Date().toISOString(),
  });
});

app.post('/webhooks/whoop', async (c) => {
  try {
    const payload = await c.req.text();
    const signature = c.req.header('X-WHOOP-Signature');
    const timestamp = c.req.header('X-WHOOP-Signature-Timestamp');

    console.log('📥 WHOOP webhook received');
    console.log('Payload:', payload.substring(0, 200));

    // For now, just acknowledge the webhook
    // Full processing requires database connection
    return c.json({
      success: true,
      message: 'Webhook received',
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return c.json({ success: false, message: 'Error processing webhook' }, 500);
  }
});

// Catch-all for unmatched routes
app.all('/*', (c) => {
  return c.json({
    success: false,
    message: 'Endpoint not found',
    path: c.req.path,
  }, 404);
});

export default handle(app);
