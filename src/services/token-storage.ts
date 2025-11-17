import fs from 'fs';
import path from 'path';

interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

/**
 * Service to persist OAuth tokens to disk
 * This ensures tokens survive application restarts
 */
export class TokenStorage {
  private tokenFilePath: string;

  constructor() {
    // Store in /tmp for Vercel compatibility, or in project root locally
    const baseDir = process.env.VERCEL ? '/tmp' : process.cwd();
    this.tokenFilePath = path.join(baseDir, '.whoop_tokens.json');
  }

  /**
   * Save tokens to disk
   */
  saveTokens(accessToken: string, refreshToken: string): void {
    try {
      const tokens: StoredTokens = {
        accessToken,
        refreshToken,
        expiresAt: Date.now() + 3600000, // 1 hour from now
      };

      fs.writeFileSync(this.tokenFilePath, JSON.stringify(tokens, null, 2));
      if (process.env.NODE_ENV !== 'production') console.log('Tokens saved to storage');
    } catch (error) {
      console.error('Failed to save tokens:', error);
      // Don't throw - tokens should be in .env as backup
    }
  }

  /**
   * Load tokens from disk
   */
  loadTokens(): StoredTokens | null {
    try {
      if (!fs.existsSync(this.tokenFilePath)) {
        if (process.env.NODE_ENV !== 'production') console.log('No stored tokens found');
        return null;
      }

      const data = fs.readFileSync(this.tokenFilePath, 'utf-8');
      const tokens: StoredTokens = JSON.parse(data);

      // Check if tokens are still valid (not expired)
      if (tokens.expiresAt < Date.now()) {
        if (process.env.NODE_ENV !== 'production') console.log('Stored tokens have expired');
        return null;
      }

      if (process.env.NODE_ENV !== 'production') console.log('Tokens loaded from storage');
      return tokens;
    } catch (error) {
      console.error('Failed to load tokens:', error);
      return null;
    }
  }

  /**
   * Clear stored tokens
   */
  clearTokens(): void {
    try {
      if (fs.existsSync(this.tokenFilePath)) {
        fs.unlinkSync(this.tokenFilePath);
        if (process.env.NODE_ENV !== 'production') console.log('Tokens cleared from storage');
      }
    } catch (error) {
      console.error('Failed to clear tokens:', error);
    }
  }
}
