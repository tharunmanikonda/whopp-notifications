import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../src/api/server.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Convert Vercel request to Fetch Request
  const url = new URL(req.url!, `https://${req.headers.host}`);

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

  try {
    // Call Hono app
    const response = await app.fetch(fetchRequest);

    // Copy headers from Hono response
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
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
    console.error('API Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
