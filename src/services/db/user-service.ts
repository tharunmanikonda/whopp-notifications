import SupabaseClientService from '../supabase-client.js';

/**
 * User Database Service
 * Manages user accounts and preferences
 */
export class UserService {
  /**
   * Create a new user
   */
  async createUser(
    email: string,
    passwordHash: string,
    fullName: string,
    timezone: string = 'America/New_York',
    notificationTime: string = '08:00'
  ): Promise<string> {
    try {
      const supabase = SupabaseClientService.getAdminClient();

      const { data, error } = await supabase
        .from('users')
        .insert({
          email,
          password_hash: passwordHash,
          full_name: fullName,
          timezone,
          notification_time: notificationTime,
          notification_enabled: true,
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to create user:', error);
        throw error;
      }

      console.log(`✅ Created user: ${email}`);
      return data.id;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<any | null> {
    try {
      const supabase = SupabaseClientService.getClient();

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .is('deleted_at', null)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows found
        console.error('Failed to fetch user:', error);
        throw error;
      }

      return data || null;
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<any | null> {
    try {
      const supabase = SupabaseClientService.getClient();

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .is('deleted_at', null)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows found
        console.error('Failed to fetch user:', error);
        throw error;
      }

      return data || null;
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(
    userId: string,
    preferences: {
      timezone?: string;
      notification_time?: string;
      notification_enabled?: boolean;
      full_name?: string;
    }
  ): Promise<void> {
    try {
      const supabase = SupabaseClientService.getAdminClient();

      const { error } = await supabase
        .from('users')
        .update({
          ...preferences,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        console.error('Failed to update user preferences:', error);
        throw error;
      }

      console.log(`✅ Updated preferences for user ${userId}`);
    } catch (error) {
      console.error('Error updating user preferences:', error);
      throw error;
    }
  }

  /**
   * Get all users with notifications enabled at a specific time
   * Used for scheduling cron jobs
   */
  async getUsersForNotification(notificationTime: string): Promise<any[]> {
    try {
      const supabase = SupabaseClientService.getClient();

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('notification_time', notificationTime)
        .eq('notification_enabled', true)
        .is('deleted_at', null);

      if (error) {
        console.error('Failed to fetch users:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  }

  /**
   * Soft delete a user (mark as deleted but keep data)
   */
  async deleteUser(userId: string): Promise<void> {
    try {
      const supabase = SupabaseClientService.getAdminClient();

      const { error } = await supabase
        .from('users')
        .update({
          deleted_at: new Date().toISOString(),
          notification_enabled: false,
        })
        .eq('id', userId);

      if (error) {
        console.error('Failed to delete user:', error);
        throw error;
      }

      console.log(`✅ Deleted user ${userId}`);
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  /**
   * Check if email exists
   */
  async emailExists(email: string): Promise<boolean> {
    try {
      const user = await this.getUserByEmail(email);
      return !!user;
    } catch {
      return false;
    }
  }
}
