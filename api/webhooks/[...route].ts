import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../../src/api/server.js';

function setCorsHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-WHOOP-Signature, X-WHOOP-Signature-Timestamp');
  res.setHeader('Access-Control-Max-Age', '600');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Convert Vercel request to Fetch Request
  const url = new URL(req.url!, `https://${req.headers.host}`);

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value) {
      headers.set(key, Array.isArray(value) ? value.join(', ') : value);
    }
  }

  // For webhooks, pass raw body string for signature verification
  let body: string | undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  }

  const fetchRequest = new Request(url.toString(), {
    method: req.method,
    headers,
    body,
  });

  try {
    // Call Hono app
    const response = await app.fetch(fetchRequest);

    // Copy headers from Hono response (but keep CORS headers)
    response.headers.forEach((value, key) => {
      if (!key.toLowerCase().startsWith('access-control')) {
        res.setHeader(key, value);
      }
    });

    // Set status and send body
    res.status(response.status);

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const json = await response.json();
      res.json(json);
    } else {
      const text = await response.text();
      res.send(text);
    }
  } catch (error) {
    console.error('Webhook API Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
