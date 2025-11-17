import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config/index.js';

/**
 * Supabase Client Singleton
 * Manages all database operations
 */
class SupabaseClientService {
  private static instance: SupabaseClient;

  static getClient(): SupabaseClient {
    if (!SupabaseClientService.instance) {
      const supabaseUrl = config.supabase.url;
      const supabaseKey = config.supabase.anonKey;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase configuration. Check SUPABASE_URL and SUPABASE_ANON_KEY in .env');
      }

      SupabaseClientService.instance = createClient(supabaseUrl, supabaseKey);
    }

    return SupabaseClientService.instance;
  }

  /**
   * Get admin client for server-side operations
   * Use with service_role key (keep secret!)
   */
  static getAdminClient(): SupabaseClient {
    const supabaseUrl = config.supabase.url;
    const supabaseServiceKey = config.supabase.serviceRoleKey;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase service role key. This should only be used server-side.');
    }

    return createClient(supabaseUrl, supabaseServiceKey);
  }
}

export default SupabaseClientService;
