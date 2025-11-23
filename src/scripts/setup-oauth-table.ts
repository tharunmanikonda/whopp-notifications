import SupabaseClientService from '../services/supabase-client.js';

/**
 * Script to set up the oauth_states table in Supabase
 * This creates the table and necessary indexes/policies
 */
async function setupOAuthTable() {
  console.log('Setting up oauth_states table...\n');

  const supabase = SupabaseClientService.getAdminClient();

  try {
    // First, let's check if the table already exists
    const { data: existingTable, error: checkError } = await supabase
      .from('oauth_states')
      .select('*', { count: 'exact', head: true });

    if (!checkError) {
      console.log('✅ oauth_states table already exists!');
      return;
    }

    // Table doesn't exist, we need to create it
    console.log('oauth_states table does not exist. Creating...');
    console.log('\nPlease go to your Supabase SQL Editor and run this SQL:\n');

    const sql = `
-- Create oauth_states table for OAuth CSRF protection and state management
CREATE TABLE IF NOT EXISTS oauth_states (
  state VARCHAR(255) PRIMARY KEY,
  provider VARCHAR(50) NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  code_verifier VARCHAR(128),
  created_at TIMESTAMP DEFAULT now(),
  expires_at TIMESTAMP DEFAULT (now() + INTERVAL '10 minutes'),
  UNIQUE(state)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_oauth_states_provider ON oauth_states(provider);
CREATE INDEX IF NOT EXISTS idx_oauth_states_user_id ON oauth_states(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires_at ON oauth_states(expires_at);

-- Enable RLS
ALTER TABLE oauth_states ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role to manage oauth states
CREATE POLICY "Service role can manage oauth states"
  ON oauth_states
  FOR ALL
  USING (true)
  WITH CHECK (true);
`;

    console.log(sql);
    console.log('\nSteps:');
    console.log('1. Go to: https://supabase.com/dashboard');
    console.log('2. Select project: gtdpxovwszdhapszuacs');
    console.log('3. Click "SQL Editor" in left sidebar');
    console.log('4. Click "New query"');
    console.log('5. Copy and paste the SQL above');
    console.log('6. Click "Run"');
    console.log('\nOnce done, the OAuth flow will work!\n');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

setupOAuthTable();
