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
