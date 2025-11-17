import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Root OAuth Callback Handler
 * Handles OAuth redirect at the root domain
 */

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const { code, error } = req.query;

  // If there's an OAuth error
  if (error) {
    return res.status(400).send(`
      <html>
        <head>
          <title>OAuth Error - Whoop AI Motivator</title>
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

  // If there's an OAuth code (successful authorization)
  if (code) {
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
            pre {
              background: #2d2d2d;
              color: #f8f8f2;
              padding: 15px;
              border-radius: 5px;
              overflow-x: auto;
              white-space: pre-wrap;
              word-wrap: break-word;
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

              <pre>curl -X POST https://api.prod.whoop.com/oauth/oauth2/token \\
  -H "Content-Type: application/json" \\
  -d '{
    "grant_type": "authorization_code",
    "code": "${code}",
    "client_id": "eda3db24-e02e-40eb-8200-d1bcf930355e",
    "client_secret": "00e4e8c006c103e6ff71300e29576d5de446f0db77adafa43ea388cb9e5f573a",
    "redirect_uri": "https://whopp-notifications-63tja648u-tharunmanikondas-projects.vercel.app"
  }'</pre>

              <p><strong>✅ The curl command above is ready to use!</strong></p>
              <p>Copy and paste it into your terminal to get your access tokens.</p>

              <p>The response will include <code>access_token</code> and <code>refresh_token</code>.</p>
              <p><strong>Add these to your <code>.env</code> file!</strong></p>
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

  // Default homepage (no OAuth code)
  return res.status(200).send(`
    <html>
      <head>
        <title>Whoop AI Motivator</title>
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
          h1 {
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
          }
          .feature {
            background: #e3f2fd;
            padding: 15px;
            margin: 15px 0;
            border-radius: 8px;
            border-left: 4px solid #2196f3;
          }
          a {
            color: #3498db;
            text-decoration: none;
            font-weight: bold;
          }
          a:hover {
            text-decoration: underline;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🏃‍♂️ Whoop AI Motivator</h1>
          <p>AI-powered daily motivational messages based on your Whoop health data.</p>

          <div class="feature">
            <h3>📊 Daily Health Insights</h3>
            <p>Get personalized SMS messages every morning based on your recovery, sleep, and strain data.</p>
          </div>

          <div class="feature">
            <h3>💬 Interactive AI Coach</h3>
            <p>Text questions about your health and get instant AI-powered responses.</p>
          </div>

          <div class="feature">
            <h3>🔒 Privacy First</h3>
            <p>No data stored. Everything is fetched in real-time and discarded after use.</p>
          </div>

          <hr style="margin: 30px 0;">

          <p><strong>Getting Started:</strong></p>
          <ol>
            <li>Complete OAuth authorization</li>
            <li>Configure environment variables</li>
            <li>Deploy and receive daily motivational messages!</li>
          </ol>

          <p style="text-align: center; margin-top: 30px; color: #7f8c8d;">
            Built with ❤️ using Claude Code
          </p>
        </div>
      </body>
    </html>
  `);
}
