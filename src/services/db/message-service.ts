import SupabaseClientService from '../supabase-client.js';
import { MotivationalMessage } from '../../types/index.js';
import { AggregatedHealthData } from '../../types/health-provider.js';

/**
 * AI Generated Messages Database Service
 * Stores message history for AI context and analytics
 */
export class MessageService {
  /**
   * Store a generated motivational message
   */
  async storeMessage(
    userId: string,
    message: MotivationalMessage,
    healthData: AggregatedHealthData,
    aiModel: string = 'gemini-2.0-flash',
    generationTimeMs: number = 0,
    confidenceScore: number = 0.8
  ): Promise<string> {
    try {
      const supabase = SupabaseClientService.getAdminClient();
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('ai_generated_messages')
        .upsert(
          {
            user_id: userId,
            date: today,
            message: message.message,
            message_length: message.message.length,
            primary_provider_id: healthData.primary?.provider,
            recovery_score: healthData.primary?.recoveryScore,
            sleep_score: healthData.primary?.sleepScore,
            strain: healthData.primary?.strain,
            resting_heart_rate: healthData.primary?.restingHeartRate,
            hrv: healthData.primary?.hrv,
            steps: healthData.primary?.steps,
            calories: healthData.primary?.calories,
            stress_level: healthData.primary?.stressLevel,
            activity_score: healthData.primary?.activityScore,
            ai_model: aiModel,
            generation_time_ms: generationTimeMs,
            confidence_score: confidenceScore,
            data_completeness: Math.round(healthData.dataCompleteness),
            delivered: false,
            delivery_status: 'pending',
            created_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id,date',
          }
        )
        .select()
        .single();

      if (error) {
        console.error('Failed to store message:', error);
        throw error;
      }

      console.log(`✅ Stored AI message for user ${userId}`);
      return data.id;
    } catch (error) {
      console.error('Error storing message:', error);
      throw error;
    }
  }

  /**
   * Get recent messages for AI context (last N days)
   */
  async getRecentMessages(userId: string, days: number = 30): Promise<any[]> {
    try {
      const supabase = SupabaseClientService.getClient();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('ai_generated_messages')
        .select('*')
        .eq('user_id', userId)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: false })
        .limit(days);

      if (error) {
        console.error('Failed to fetch recent messages:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching recent messages:', error);
      throw error;
    }
  }

  /**
   * Update message delivery status
   */
  async updateDeliveryStatus(
    messageId: string,
    status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced',
    twinioSid?: string,
    errorMessage?: string
  ): Promise<void> {
    try {
      const supabase = SupabaseClientService.getAdminClient();

      const update: any = {
        delivery_status: status,
      };

      if (status === 'delivered' || status === 'sent') {
        update.delivered = true;
        update.delivered_at = new Date().toISOString();
      }

      if (twinioSid) {
        update.twilio_sid = twinioSid;
      }

      if (errorMessage) {
        update.delivery_error = errorMessage;
      }

      const { error } = await supabase
        .from('ai_generated_messages')
        .update(update)
        .eq('id', messageId);

      if (error) {
        console.error('Failed to update delivery status:', error);
        throw error;
      }

      console.log(`✅ Updated delivery status for message ${messageId} to ${status}`);
    } catch (error) {
      console.error('Error updating delivery status:', error);
      throw error;
    }
  }

  /**
   * Get today's message (for checking if already generated)
   */
  async getTodayMessage(userId: string): Promise<any | null> {
    try {
      const supabase = SupabaseClientService.getClient();
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('ai_generated_messages')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows found (which is fine)
        console.error('Failed to fetch today message:', error);
        throw error;
      }

      return data || null;
    } catch (error) {
      console.error('Error fetching today message:', error);
      return null;
    }
  }

  /**
   * Store user feedback on a message
   */
  async storeFeedback(
    messageId: string,
    liked: boolean,
    feedback?: string
  ): Promise<void> {
    try {
      const supabase = SupabaseClientService.getAdminClient();

      const { error } = await supabase
        .from('ai_generated_messages')
        .update({
          user_liked: liked,
          user_feedback: feedback || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', messageId);

      if (error) {
        console.error('Failed to store feedback:', error);
        throw error;
      }

      console.log(`✅ Stored user feedback for message ${messageId}`);
    } catch (error) {
      console.error('Error storing feedback:', error);
      throw error;
    }
  }

  /**
   * Get message statistics for a user
   */
  async getMessageStats(userId: string): Promise<{
    total_messages: number;
    delivered_messages: number;
    delivery_rate: number;
    avg_length: number;
    avg_confidence: number;
    liked_count: number;
  }> {
    try {
      const supabase = SupabaseClientService.getClient();
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const { data, error } = await supabase
        .from('ai_generated_messages')
        .select('*')
        .eq('user_id', userId)
        .gte('date', ninetyDaysAgo.toISOString().split('T')[0]);

      if (error) {
        console.error('Failed to fetch message stats:', error);
        throw error;
      }

      const messages = data || [];
      const deliveredCount = messages.filter((m) => m.delivered).length;
      const likedCount = messages.filter((m) => m.user_liked === true).length;
      const avgLength = messages.length > 0
        ? Math.round(messages.reduce((sum, m) => sum + m.message_length, 0) / messages.length)
        : 0;
      const avgConfidence = messages.length > 0
        ? parseFloat((messages.reduce((sum, m) => sum + m.confidence_score, 0) / messages.length).toFixed(2))
        : 0;

      return {
        total_messages: messages.length,
        delivered_messages: deliveredCount,
        delivery_rate: messages.length > 0 ? Math.round((deliveredCount / messages.length) * 100) : 0,
        avg_length: avgLength,
        avg_confidence: avgConfidence,
        liked_count: likedCount,
      };
    } catch (error) {
      console.error('Error fetching message stats:', error);
      return {
        total_messages: 0,
        delivered_messages: 0,
        delivery_rate: 0,
        avg_length: 0,
        avg_confidence: 0,
        liked_count: 0,
      };
    }
  }
}
