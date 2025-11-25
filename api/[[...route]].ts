import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

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
    console.log('📥 WHOOP webhook received');
    console.log('Payload:', payload.substring(0, 200));

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

// Vercel handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Convert Vercel request to fetch Request
  const url = new URL(req.url || '/', `https://${req.headers.host}`);

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value) {
      headers.set(key, Array.isArray(value) ? value.join(', ') : value);
    }
  }

  const fetchRequest = new Request(url.toString(), {
    method: req.method,
    headers,
    body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
  });

  // Call Hono app
  const response = await app.fetch(fetchRequest);

  // Convert Hono response to Vercel response
  res.status(response.status);

  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  const body = await response.text();
  res.send(body);
}
