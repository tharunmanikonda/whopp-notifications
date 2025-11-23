import { Hono } from 'hono';
import SupabaseClientService from '../services/supabase-client.js';
import { config } from '../config/index.js';
import crypto from 'crypto';

const app = new Hono();

/**
 * Helper: Generate random state parameter for CSRF protection
 */
function generateState(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Helper: Generate PKCE code verifier (for future Fitbit/Oura support)
 */
function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Helper: Store OAuth state in database
 */
async function storeOAuthState(
  provider: string,
  state: string,
  codeVerifier?: string,
  userId?: string
): Promise<void> {
  const supabase = SupabaseClientService.getAdminClient();

  const { error } = await supabase
    .from('oauth_states')
    .insert({
      state,
      provider,
      user_id: userId || null,
      code_verifier: codeVerifier || null,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
    });

  if (error) {
    console.error('Failed to store OAuth state:', error);
    throw error;
  }
}

/**
 * Helper: Validate and retrieve OAuth state from database
 */
async function validateOAuthState(
  provider: string,
  state: string
): Promise<{ user_id?: string; code_verifier?: string } | null> {
  const supabase = SupabaseClientService.getAdminClient();

  const { data, error } = await supabase
    .from('oauth_states')
    .select('user_id, code_verifier, expires_at')
    .eq('state', state)
    .eq('provider', provider)
    .single();

  if (error || !data) {
    console.error('Invalid or expired OAuth state:', error);
    return null;
  }

  // Check if state has expired
  if (new Date(data.expires_at) < new Date()) {
    console.error('OAuth state has expired');
    return null;
  }

  return {
    user_id: data.user_id,
    code_verifier: data.code_verifier,
  };
}

/**
 * Helper: Clean up used OAuth state
 */
async function deleteOAuthState(state: string): Promise<void> {
  const supabase = SupabaseClientService.getAdminClient();

  const { error } = await supabase
    .from('oauth_states')
    .delete()
    .eq('state', state);

  if (error) {
    console.error('Failed to delete OAuth state:', error);
    // Don't throw - this is not critical
  }
}

/**
 * POST /oauth/whoop/login
 * Initiate WHOOP OAuth flow
 *
 * Body (optional):
 * {
 *   "user_id": "uuid" (if user already logged in)
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "auth_url": "https://api.prod.whoop.com/oauth/oauth2/auth?..."
 * }
 */
app.post('/whoop/login', async (c) => {
  try {
    const whoopClientId = config.whoop.clientId;
    const whoopRedirectUri = config.whoop.redirectUri;

    if (!whoopClientId || !whoopRedirectUri) {
      console.error('WHOOP config missing:', { whoopClientId, whoopRedirectUri });
      return c.json(
        {
          success: false,
          message: 'WHOOP OAuth credentials not configured',
        },
        500
      );
    }

    // Generate state for CSRF protection
    const state = generateState();
    console.log('Generated state:', state.substring(0, 20) + '...');

    // Optional: Get user ID from request body (if already logged in)
    const body = await c.req.json().catch(() => ({}));
    const userId = body.user_id;

    // Store state in database
    try {
      await storeOAuthState('whoop', state, undefined, userId);
      console.log('State stored successfully');
    } catch (stateError) {
      console.error('Failed to store OAuth state:', stateError);
      throw stateError;
    }

    // Build WHOOP authorization URL
    const params = new URLSearchParams({
      client_id: whoopClientId,
      redirect_uri: whoopRedirectUri,
      response_type: 'code',
      scope: 'read:recovery read:sleep read:cycles read:workout offline',
      state,
    });

    const authUrl = `https://api.prod.whoop.com/oauth/oauth2/auth?${params.toString()}`;

    console.log('Returning auth URL:', authUrl.substring(0, 100) + '...');

    return c.json({
      success: true,
      auth_url: authUrl,
    });
  } catch (error) {
    console.error('WHOOP login error:', error);
    return c.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to initiate WHOOP login',
      },
      500
    );
  }
});

/**
 * GET /oauth/whoop/callback
 * Handle WHOOP OAuth callback
 *
 * Query params:
 * - code: Authorization code from WHOOP
 * - state: State parameter for CSRF validation
 * - error: Error code if user denied access
 *
 * Response:
 * Redirects to dashboard with success/error message
 */
app.get('/whoop/callback', async (c) => {
  try {
    const code = c.req.query('code');
    const state = c.req.query('state');
    const error = c.req.query('error');

    console.log('OAuth callback received:', { code: code?.substring(0, 20) + '...', state: state?.substring(0, 20) + '...', error });

    // Check for user denial
    if (error) {
      const errorDescription = c.req.query('error_description') || 'User denied access';
      console.error('WHOOP OAuth error:', error, errorDescription);

      // Redirect to frontend with error
      return c.redirect(`http://localhost:5000/onboarding?error=whoop_denied&message=${encodeURIComponent(errorDescription)}`);
    }

    if (!code || !state) {
      console.error('Missing code or state:', { code: !!code, state: !!state });
      return c.redirect('http://localhost:5000/onboarding?error=invalid_callback');
    }

    // Validate state parameter
    const stateData = await validateOAuthState('whoop', state);
    if (!stateData) {
      console.error('Invalid or expired OAuth state');
      return c.redirect('http://localhost:5000/onboarding?error=invalid_state');
    }

    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://api.prod.whoop.com/oauth/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        client_id: config.whoop.clientId,
        client_secret: config.whoop.clientSecret,
        redirect_uri: config.whoop.redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Token exchange failed:', errorData);
      return c.redirect('http://localhost:5000/onboarding?error=token_exchange_failed');
    }

    const tokenData = (await tokenResponse.json()) as any;
    const accessToken = tokenData?.access_token;
    const refreshToken = tokenData?.refresh_token;

    if (!accessToken) {
      console.error('No access token in response:', tokenData);
      return c.redirect('http://localhost:5000/onboarding?error=no_access_token');
    }

    // Redirect to frontend OAuth callback handler with tokens
    // Frontend will handle storing tokens in the database
    const successUrl = `http://localhost:5000/oauth/callback?whoop_token=${encodeURIComponent(accessToken)}&whoop_refresh=${encodeURIComponent(refreshToken || '')}`;

    // Clean up used state
    await deleteOAuthState(state);

    console.log('OAuth successful, redirecting to:', successUrl.substring(0, 100) + '...');

    return c.redirect(successUrl);
  } catch (error) {
    console.error('WHOOP callback error:', error);
    return c.redirect('http://localhost:5000/onboarding?error=callback_error');
  }
});

export default app;
