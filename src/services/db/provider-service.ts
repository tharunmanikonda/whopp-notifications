import SupabaseClientService from '../supabase-client.js';

/**
 * User Health Providers Database Service
 * Manages connected health data providers and their credentials
 */
export class ProviderService {
  /**
   * Register a new health provider for a user
   */
  async registerProvider(
    userId: string,
    providerName: string,
    accessToken: string,
    refreshToken?: string,
    deviceInfo?: any,
    isPrimary: boolean = false
  ): Promise<string> {
    try {
      const supabase = SupabaseClientService.getAdminClient();

      const { data, error } = await supabase
        .from('user_health_providers')
        .insert({
          user_id: userId,
          provider_name: providerName,
          provider_type: this.getProviderType(providerName),
          access_token: accessToken,
          refresh_token: refreshToken || null,
          is_primary: isPrimary,
          is_active: true,
          device_info: deviceInfo || {},
          connected_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error(`Failed to register ${providerName}:`, error);
        throw error;
      }

      console.log(`✅ Registered ${providerName} provider for user ${userId}`);
      return data.id;
    } catch (error) {
      console.error('Error registering provider:', error);
      throw error;
    }
  }

  /**
   * Get all active providers for a user
   */
  async getUserProviders(userId: string): Promise<any[]> {
    try {
      const supabase = SupabaseClientService.getClient();

      const { data, error } = await supabase
        .from('user_health_providers')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('is_primary', { ascending: false });

      if (error) {
        console.error('Failed to fetch user providers:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching user providers:', error);
      throw error;
    }
  }

  /**
   * Get primary provider for a user
   */
  async getPrimaryProvider(userId: string): Promise<any> {
    try {
      const supabase = SupabaseClientService.getClient();

      const { data, error } = await supabase
        .from('user_health_providers')
        .select('*')
        .eq('user_id', userId)
        .eq('is_primary', true)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows found (which is fine)
        console.error('Failed to fetch primary provider:', error);
        throw error;
      }

      return data || null;
    } catch (error) {
      console.error('Error fetching primary provider:', error);
      throw error;
    }
  }

  /**
   * Update provider access token after refresh
   */
  async updateToken(
    providerId: string,
    accessToken: string,
    refreshToken?: string
  ): Promise<void> {
    try {
      const supabase = SupabaseClientService.getAdminClient();

      const { error } = await supabase
        .from('user_health_providers')
        .update({
          access_token: accessToken,
          refresh_token: refreshToken || null,
          token_last_refreshed_at: new Date().toISOString(),
        })
        .eq('id', providerId);

      if (error) {
        console.error('Failed to update provider token:', error);
        throw error;
      }

      console.log(`✅ Updated token for provider ${providerId}`);
    } catch (error) {
      console.error('Error updating token:', error);
      throw error;
    }
  }

  /**
   * Set provider sync status
   */
  async setSyncStatus(
    providerId: string,
    status: 'pending' | 'syncing' | 'success' | 'error',
    errorMessage?: string
  ): Promise<void> {
    try {
      const supabase = SupabaseClientService.getAdminClient();

      const update: any = {
        sync_status: status,
      };

      if (status === 'success') {
        update.last_synced_at = new Date().toISOString();
        update.last_error = null;
      } else if (status === 'error' && errorMessage) {
        update.last_error = errorMessage;
      }

      const { error } = await supabase
        .from('user_health_providers')
        .update(update)
        .eq('id', providerId);

      if (error) {
        console.error('Failed to set sync status:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error setting sync status:', error);
      throw error;
    }
  }

  /**
   * Deactivate a provider (soft delete)
   */
  async deactivateProvider(providerId: string): Promise<void> {
    try {
      const supabase = SupabaseClientService.getAdminClient();

      const { error } = await supabase
        .from('user_health_providers')
        .update({ is_active: false })
        .eq('id', providerId);

      if (error) {
        console.error('Failed to deactivate provider:', error);
        throw error;
      }

      console.log(`✅ Deactivated provider ${providerId}`);
    } catch (error) {
      console.error('Error deactivating provider:', error);
      throw error;
    }
  }

  /**
   * Set primary provider for a user
   */
  async setPrimaryProvider(userId: string, providerId: string): Promise<void> {
    try {
      const supabase = SupabaseClientService.getAdminClient();

      // First, unset all primary providers for this user
      await supabase
        .from('user_health_providers')
        .update({ is_primary: false })
        .eq('user_id', userId);

      // Then set the new primary
      const { error } = await supabase
        .from('user_health_providers')
        .update({ is_primary: true })
        .eq('id', providerId);

      if (error) {
        console.error('Failed to set primary provider:', error);
        throw error;
      }

      console.log(`✅ Set provider ${providerId} as primary for user ${userId}`);
    } catch (error) {
      console.error('Error setting primary provider:', error);
      throw error;
    }
  }

  /**
   * Check if user has a specific provider
   */
  async hasProvider(userId: string, providerName: string): Promise<boolean> {
    try {
      const supabase = SupabaseClientService.getClient();

      const { data, error } = await supabase
        .from('user_health_providers')
        .select('id')
        .eq('user_id', userId)
        .eq('provider_name', providerName)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows found
        console.error('Error checking provider:', error);
        throw error;
      }

      return !!data;
    } catch (error) {
      console.error('Error checking provider existence:', error);
      return false;
    }
  }

  /**
   * Get provider type category
   */
  private getProviderType(providerName: string): string {
    const types: Record<string, string> = {
      whoop: 'wearable',
      fitbit: 'wearable',
      garmin: 'wearable',
      apple: 'platform',
      samsung: 'wearable',
      oura: 'ring',
      google_fit: 'platform',
      withings: 'scale',
    };
    return types[providerName.toLowerCase()] || 'wearable';
  }
}
