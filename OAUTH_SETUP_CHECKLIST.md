# WHOOP OAuth Setup Checklist

## Your Credentials ✅
- Client ID: `eda3db24-e02e-40eb-8200-d1bcf930355e`
- Client Secret: `00e4e8c006c103e6ff71300e29576d5de446f0db77adafa43ea388cb9e5f573a`
- Redirect URI: `http://localhost:5001/api/oauth/whoop/callback`

---

## TODO Checklist

### Step 1: Update WHOOP Developer Dashboard ⚠️ CRITICAL
- [ ] Go to: https://developer.whoop.com/dashboard
- [ ] Find your app in the dashboard
- [ ] Go to App Settings
- [ ] Find "Redirect URIs" section
- [ ] Update/Add redirect URI: `http://localhost:5001/api/oauth/whoop/callback`
- [ ] SAVE the changes
- [ ] Verify the exact URL matches (case-sensitive!)

**Why this step is critical:**
- Without this, OAuth callback will fail with "Invalid redirect URI"
- Must match EXACTLY - no extra spaces, correct port number, correct path

---

### Step 2: Create oauth_states Table in Supabase
- [ ] Go to: https://supabase.com/dashboard
- [ ] Select your project (gtdpxovwszdhapszuacs)
- [ ] Click "SQL Editor" in left sidebar
- [ ] Click "New query"
- [ ] Open file: `supabase/migrations/create_oauth_states.sql`
- [ ] Copy entire SQL content
- [ ] Paste into Supabase SQL Editor
- [ ] Click "Run" button
- [ ] Verify table was created (check Tables section)

**Expected result:**
- Table: `oauth_states` with columns: state, provider, user_id, code_verifier, created_at, expires_at
- Indexes on: provider, user_id, expires_at

---

### Step 3: Start Your Application
- [ ] Terminal 1: `cd /Users/tharun/Desktop/tharun-p/whopp-notifications`
- [ ] Terminal 1: `PORT=5001 npm run api`
- [ ] Wait for: "✅ API Server running on port 5001"
- [ ] Terminal 2 (new): `cd /Users/tharun/Desktop/tharun-p/whopp-notifications/web`
- [ ] Terminal 2: `npm run dev`
- [ ] Wait for: "Local: http://localhost:5000"

---

### Step 4: Test OAuth Flow
- [ ] Open browser: http://localhost:5000
- [ ] Click "Connect WHOOP" button (or similar on onboarding page)
- [ ] You should be redirected to WHOOP login page
- [ ] Log in with your WHOOP account (or test account)
- [ ] Grant permission when asked
- [ ] Should be redirected back to your app

**Expected behavior:**
- Login button is clickable ✅
- Redirects to WHOOP login page ✅
- Can log in with WHOOP account ✅
- Redirects back to your app ✅
- No error messages ✅

---

### Step 5: If Something Goes Wrong

**Error: "Invalid redirect URI"**
- Solution: Check WHOOP dashboard - redirect URI must match EXACTLY
- Check: Port number, path spelling, no extra spaces
- Restart: Restart the API server if you change .env

**Error: "oauth_states table doesn't exist"**
- Solution: Run the SQL migration in Supabase (Step 2)
- Check: Go to Supabase Tables section to verify it exists

**Error: "Cannot GET /api/oauth/whoop/callback"**
- Solution: Make sure API server is running on port 5001
- Check: Terminal shows "API Server running on port 5001"
- Check: Try http://localhost:5001/health to verify API is running

**Error: "WHOOP_REDIRECT_URI not configured"**
- Solution: Check .env file has WHOOP_REDIRECT_URI set
- Current value: `http://localhost:5001/api/oauth/whoop/callback`
- Restart: Stop and restart npm run api

**OAuth redirects but nothing happens**
- This is normal for now - token storage isn't implemented yet
- We'll add that next

---

## File References

**Environment config:**
- `.env` - WHOOP credentials (already set)

**Backend code:**
- `src/api/oauth.ts` - OAuth endpoints
- `src/config/index.ts` - Config loading

**Database:**
- `supabase/migrations/create_oauth_states.sql` - Table creation SQL

**Frontend:**
- `web/src/components/ConnectProviderButton.tsx` - Connect button component
- `web/src/pages/Onboarding.tsx` - Onboarding page (may need to add button)

---

## What Happens During OAuth

1. User clicks "Connect WHOOP" button
2. Frontend calls: `POST /api/oauth/whoop/login`
3. Backend generates state parameter and returns auth URL
4. Frontend redirects to: `https://api.prod.whoop.com/oauth/oauth2/auth?client_id=...&state=...`
5. User logs into WHOOP
6. User grants permission
7. WHOOP redirects to: `http://localhost:5001/api/oauth/whoop/callback?code=XXX&state=YYY`
8. Backend validates state (CSRF protection)
9. Backend exchanges code for tokens
10. Frontend gets redirected back (tokens passed in URL for now)

---

## Next Steps (After OAuth Works)

Once you can successfully log in with WHOOP:
1. Store tokens in `user_health_providers` table
2. Create frontend callback handler to extract tokens
3. Add token encryption for security
4. Implement token refresh logic
5. Fetch and display WHOOP health data

---

## Questions?

See: `WHOOP_OAUTH_SETUP.txt` for detailed troubleshooting guide
