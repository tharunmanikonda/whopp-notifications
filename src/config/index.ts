import dotenv from 'dotenv';
import { Config } from '../types/index.js';

dotenv.config();

export const config: Config = {
  whoop: {
    clientId: process.env.WHOOP_CLIENT_ID || '',
    clientSecret: process.env.WHOOP_CLIENT_SECRET || '',
    // Redirect URI must match exactly what's registered in WHOOP Developer Dashboard
    redirectUri: process.env.WHOOP_REDIRECT_URI || 'http://localhost:5001/api/oauth/whoop/callback',
    accessToken: process.env.WHOOP_ACCESS_TOKEN || '',
    refreshToken: process.env.WHOOP_REFRESH_TOKEN || '',
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
  },
  user: {
    name: process.env.USER_NAME || 'there',
    phoneNumber: process.env.YOUR_PHONE_NUMBER || '',
    timezone: process.env.TIMEZONE || 'America/New_York',
  },
  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },
};

export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.whoop.clientId) errors.push('WHOOP_CLIENT_ID is required');
  if (!config.whoop.clientSecret) errors.push('WHOOP_CLIENT_SECRET is required');
  if (!config.whoop.accessToken) errors.push('WHOOP_ACCESS_TOKEN is required');
  if (!config.gemini.apiKey) errors.push('GEMINI_API_KEY is required');
  if (!config.twilio.accountSid) errors.push('TWILIO_ACCOUNT_SID is required');
  if (!config.twilio.authToken) errors.push('TWILIO_AUTH_TOKEN is required');
  if (!config.twilio.phoneNumber) errors.push('TWILIO_PHONE_NUMBER is required');
  if (!config.user.phoneNumber) errors.push('YOUR_PHONE_NUMBER is required');

  return {
    valid: errors.length === 0,
    errors,
  };
}
