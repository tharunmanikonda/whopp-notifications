import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * OAuth Callback Endpoint
 *
 * This endpoint handles the OAuth redirect from Whoop
 * After you authorize the app, Whoop redirects here with the authorization code
 */

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const { code, error } = req.query;

  if (error) {
    return res.status(400).send(`
      <html>
        <head>
          <title>OAuth Error</title>
          <style>
            body { font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px; }
            .error { background: #fee; border: 2px solid #f00; padding: 20px; border-radius: 8px; }
          </style>
        </head>
        <body>
          <div class="error">
            <h1>❌ OAuth Error</h1>
            <p><strong>Error:</strong> ${error}</p>
          </div>
        </body>
      </html>
    `);
  }

  if (!code) {
    return res.status(400).send(`
      <html>
        <head>
          <title>Missing Code</title>
          <style>
            body { font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px; }
            .error { background: #ffc; border: 2px solid #fa0; padding: 20px; border-radius: 8px; }
          </style>
        </head>
        <body>
          <div class="error">
            <h1>⚠️ No Authorization Code</h1>
            <p>No authorization code received from Whoop.</p>
          </div>
        </body>
      </html>
    `);
  }

  // Success - show the code to the user
  return res.status(200).send(`
    <html>
      <head>
        <title>OAuth Success - Whoop AI Motivator</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
          }
          .container {
            background: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
          }
          .success {
            background: #d4edda;
            border: 2px solid #28a745;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
          }
          .code-box {
            background: #f8f9fa;
            border: 2px solid #007bff;
            padding: 20px;
            border-radius: 8px;
            font-family: monospace;
            word-break: break-all;
            margin: 20px 0;
          }
          .instructions {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 20px;
            margin-top: 20px;
          }
          code {
            background: #e9ecef;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: monospace;
          }
          button {
            background: #007bff;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            margin-top: 10px;
          }
          button:hover {
            background: #0056b3;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success">
            <h1>✅ Authorization Successful!</h1>
            <p>You've successfully authorized Whoop AI Motivator. Here's your authorization code:</p>
          </div>

          <div class="code-box">
            <strong>Authorization Code:</strong><br>
            <span id="auth-code">${code}</span>
            <br><br>
            <button onclick="copyCode()">📋 Copy Code</button>
          </div>

          <div class="instructions">
            <h2>Next Steps:</h2>
            <ol>
              <li><strong>Copy the authorization code above</strong></li>
              <li><strong>Exchange it for access tokens</strong> using this curl command:</li>
            </ol>

            <pre style="background: #2d2d2d; color: #f8f8f2; padding: 15px; border-radius: 5px; overflow-x: auto;">
curl -X POST https://api.whoop.com/oauth/token \\
  -H "Content-Type: application/json" \\
  -d '{
    "grant_type": "authorization_code",
    "code": "${code}",
    "client_id": "YOUR_CLIENT_ID",
    "client_secret": "YOUR_CLIENT_SECRET",
    "redirect_uri": "${req.headers.host ? `https://${req.headers.host}/api/callback` : 'YOUR_REDIRECT_URI'}"
  }'</pre>

            <p><strong>Replace:</strong></p>
            <ul>
              <li><code>YOUR_CLIENT_ID</code> - with your Whoop Client ID</li>
              <li><code>YOUR_CLIENT_SECRET</code> - with your Whoop Client Secret</li>
            </ul>

            <p>The response will include <code>access_token</code> and <code>refresh_token</code>.</p>
            <p>Add these to your <code>.env</code> file!</p>
          </div>
        </div>

        <script>
          function copyCode() {
            const code = document.getElementById('auth-code').textContent;
            navigator.clipboard.writeText(code).then(() => {
              alert('✅ Authorization code copied to clipboard!');
            });
          }
        </script>
      </body>
    </html>
  `);
}
