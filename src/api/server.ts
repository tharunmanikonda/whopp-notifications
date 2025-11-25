import { Hono } from 'hono';
import { cors } from 'hono/cors';
import authRoutes from './auth.js';
import providerRoutes from './providers.js';
import oauthRoutes from './oauth.js';
import dashboardRoutes from './dashboard.js';
import webhookRoutes from './webhooks.js';
import webhookSubscriptionRoutes from './webhook-subscriptions.js';
import { config } from '../config/index.js';

/**
 * Main API Server
 * All routes configured here
 */
const app = new Hono();

// Enable CORS for development
app.use(
  '/api/*',
  cors({
    origin: '*', // In production, restrict this to your domain
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600,
  })
);

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// API version endpoint
app.get('/api/version', (c) => {
  return c.json({
    api: 'Whoop AI Motivator',
    version: '1.0.0',
    docs: '/api/docs',
  });
});

// Mount auth routes
app.route('/api/auth', authRoutes);

// Mount provider routes
app.route('/api/providers', providerRoutes);

// Mount OAuth routes
app.route('/api/oauth', oauthRoutes);

// Mount dashboard routes
app.route('/api/dashboard', dashboardRoutes);

// Mount webhook routes (no auth required - signature verified instead)
app.route('/api', webhookRoutes);

// Mount webhook subscription management routes
app.route('/api', webhookSubscriptionRoutes);

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      success: false,
      message: 'Endpoint not found',
      path: c.req.path,
    },
    404
  );
});

// Error handler
app.onError((err, c) => {
  console.error('API Error:', err);
  return c.json(
    {
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    },
    500
  );
});

export default app;
