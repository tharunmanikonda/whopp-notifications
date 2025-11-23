import SupabaseClientService from '../services/supabase-client.js';

async function createOAuthStatesTable() {
  const supabase = SupabaseClientService.getAdminClient();

  const sql = `
    CREATE TABLE IF NOT EXISTS oauth_states (
      state VARCHAR(255) PRIMARY KEY,
      provider VARCHAR(50) NOT NULL,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      code_verifier VARCHAR(128),
      created_at TIMESTAMP DEFAULT now(),
      expires_at TIMESTAMP DEFAULT (now() + INTERVAL '10 minutes'),
      UNIQUE(state)
    );

    CREATE INDEX IF NOT EXISTS idx_oauth_states_provider ON oauth_states(provider);
    CREATE INDEX IF NOT EXISTS idx_oauth_states_user_id ON oauth_states(user_id);
    CREATE INDEX IF NOT EXISTS idx_oauth_states_expires_at ON oauth_states(expires_at);

    ALTER TABLE oauth_states ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Service role can manage oauth states"
      ON oauth_states
      FOR ALL
      USING (true)
      WITH CHECK (true);
  `;

  try {
    const { data, error } = await supabase.rpc('exec', { sql });
    
    if (error) {
      console.error('Error creating table:', error);
      process.exit(1);
    }

    console.log('✅ oauth_states table created successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Failed to create table:', err);
    process.exit(1);
  }
}

createOAuthStatesTable();
