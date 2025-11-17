import { createServer } from 'http';
import app from './api/server.js';

const port = parseInt(process.env.PORT || '5001', 10);

// Create HTTP server with Hono handler
const server = createServer((req, res) => {
  // Build the request URL
  const url = `http://localhost:${port}${req.url || '/'}`;

  // Create Fetch API Request
  const init: RequestInit = {
    method: req.method,
    headers: req.headers as HeadersInit,
  };

  // Handle request body for non-GET/HEAD requests
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', async () => {
      init.body = body || undefined;
      const request = new Request(url, init);
      try {
        const response = await app.fetch(request);
        res.writeHead(response.status, Object.fromEntries(response.headers));
        const buffer = await response.arrayBuffer();
        res.end(Buffer.from(buffer));
      } catch (err: any) {
        console.error('Request error:', err);
        res.writeHead(500);
        res.end('Internal Server Error');
      }
    });
  } else {
    // GET and HEAD requests
    const request = new Request(url, init);
    Promise.resolve(app.fetch(request))
      .then(async (response: Response) => {
        res.writeHead(response.status, Object.fromEntries(response.headers));
        const buffer = await response.arrayBuffer();
        res.end(Buffer.from(buffer));
      })
      .catch((err: any) => {
        console.error('Request error:', err);
        res.writeHead(500);
        res.end('Internal Server Error');
      });
  }
});

server.listen(port, () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`✅ API server running on port ${port}`);
  }
});
