import { validateConfig } from './config/index.js';
import { HealthAggregator } from './services/health-aggregator.js';
import { WhoopProvider } from './services/providers/whoop-provider.js';
import { FitbitProvider } from './services/providers/fitbit-provider.js';
import { AIMessageGeneratorV2 } from './services/ai-generator-v2.js';
import { SMSService } from './services/sms-service.js';
import { config } from './config/index.js';
import { MetricsService } from './services/db/metrics-service.js';
import { MessageService } from './services/db/message-service.js';
import { UserService } from './services/db/user-service.js';

/**
 * Main function to orchestrate the daily motivation workflow
 * Now supports multiple health data providers (Whoop, Fitbit, etc.)
 * Stores health data and messages in Supabase
 */
export async function sendDailyMotivation(userId?: string): Promise<void> {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) console.log('🚀 Starting daily motivation workflow (Multi-Provider with Supabase)...');
  if (isDev) console.log(`Timestamp: ${new Date().toISOString()}\n`);

  // Validate configuration
  const validation = validateConfig();
  if (!validation.valid) {
    console.error('❌ Configuration validation failed:');
    validation.errors.forEach((error) => console.error(`  - ${error}`));
    throw new Error('Invalid configuration. Please check your .env file.');
  }

  if (isDev) console.log('✅ Configuration validated\n');

  // Initialize Supabase services
  const metricsService = new MetricsService();
  const messageService = new MessageService();
  const userService = new UserService();

  // If no userId provided, try to fetch default user (for backward compatibility)
  let targetUserId = userId;
  if (!targetUserId) {
    try {
      const defaultUser = await userService.getUserByEmail(config.user.email);
      if (defaultUser) {
        targetUserId = defaultUser.id;
        if (isDev) console.log(`Using default user: ${config.user.email}\n`);
      }
    } catch (error) {
      console.warn('Could not fetch default user from Supabase');
    }
  }

  try {
    // Step 1: Set up health data aggregator with providers
    if (isDev) console.log('🏥 Setting up health data providers...');
    const aggregator = new HealthAggregator();

    // Register Whoop as primary provider (default)
    const whoopProvider = new WhoopProvider();
    aggregator.registerProvider(whoopProvider);
    aggregator.setPrimaryProvider('whoop');

    // Optionally register Fitbit if configured
    const fitbitProvider = new FitbitProvider();
    if (fitbitProvider.isConfigured()) {
      aggregator.registerProvider(fitbitProvider);
    }

    // Validate all provider connections
    if (isDev) console.log();
    const providerStatus = await aggregator.validateAllProviders();
    const activeProviders = aggregator.getProviders();

    if (activeProviders.length === 0) {
      console.error('No health data providers are connected!');
      throw new Error('No active health data providers');
    }

    if (isDev) console.log();

    // Step 2: Fetch aggregated health data from all providers
    if (isDev) console.log('📊 Fetching aggregated health data...');
    const aggregatedHealthData = await aggregator.getAggregatedMetrics();

    if (!aggregatedHealthData.primary && aggregatedHealthData.secondary.length === 0) {
      console.warn('No recent health data available from any provider. Skipping notification.');
      return;
    }

    if (isDev) {
      console.log('✅ Aggregated health data retrieved:');
      if (aggregatedHealthData.primary) {
        console.log(`\n  Primary Provider (${aggregatedHealthData.primary.provider}):`);
        if (aggregatedHealthData.primary.recoveryScore !== undefined) {
          console.log(`    - Recovery Score: ${aggregatedHealthData.primary.recoveryScore}%`);
        }
        if (aggregatedHealthData.primary.sleepScore !== undefined) {
          console.log(`    - Sleep Score: ${aggregatedHealthData.primary.sleepScore}%`);
        }
        if (aggregatedHealthData.primary.strain !== undefined) {
          console.log(`    - Strain: ${aggregatedHealthData.primary.strain.toFixed(1)}`);
        }
        if (aggregatedHealthData.primary.restingHeartRate) {
          console.log(`    - RHR: ${aggregatedHealthData.primary.restingHeartRate} bpm`);
        }
        if (aggregatedHealthData.primary.hrv) {
          console.log(`    - HRV: ${aggregatedHealthData.primary.hrv.toFixed(1)} ms`);
        }
      }

      if (aggregatedHealthData.secondary.length > 0) {
        console.log(`\n  Secondary Providers (${aggregatedHealthData.secondary.length}):`);
        aggregatedHealthData.secondary.forEach((data) => {
          console.log(`    - ${data.provider}: ${data.sleepScore || data.recoveryScore || 'Partial data'}`);
        });
      }

      console.log(`\n  Data Completeness: ${Math.round(aggregatedHealthData.dataCompleteness)}%`);
      console.log();
    }

    // Step 2.5: Store health metrics in Supabase (if userId available)
    if (targetUserId) {
      if (isDev) console.log('💾 Storing health metrics in Supabase...');
      try {
        const metricsData = {
          user_id: targetUserId,
          date: new Date().toISOString().split('T')[0],
          provider: aggregatedHealthData.primary?.provider || 'unknown',
          recovery_score: aggregatedHealthData.primary?.recoveryScore,
          sleep_score: aggregatedHealthData.primary?.sleepScore,
          strain: aggregatedHealthData.primary?.strain,
          resting_heart_rate: aggregatedHealthData.primary?.restingHeartRate,
          hrv: aggregatedHealthData.primary?.hrv,
          data_completeness: aggregatedHealthData.dataCompleteness,
          raw_data: JSON.stringify(aggregatedHealthData),
        };

        await metricsService.storeMetrics(metricsData as any);
        if (isDev) console.log('✅ Health metrics stored successfully\n');
      } catch (error: any) {
        console.warn(`Failed to store metrics: ${error.message}`);
      }
    }

    // Step 3: Generate AI motivational message
    if (isDev) console.log('🤖 Generating AI motivational message...');
    const aiGenerator = new AIMessageGeneratorV2();
    const motivationalMessage = await aiGenerator.generateMotivationalMessage(
      aggregatedHealthData,
      config.user.name
    );

    if (isDev) {
      console.log('✅ Message generated:');
      console.log(`  "${motivationalMessage.message}"`);
      console.log(`  Length: ${motivationalMessage.message.length} characters`);
      console.log(`  Data sources: ${motivationalMessage.context.providers?.join(', ') || 'N/A'}\n`);
    }

    // Step 3.5: Store AI message in Supabase (if userId available)
    let messageId: string | undefined;
    if (targetUserId) {
      if (isDev) console.log('💾 Storing AI message in Supabase...');
      try {
        const messageData = {
          user_id: targetUserId,
          message: motivationalMessage.message,
          message_type: 'motivation',
          providers_used: motivationalMessage.context.providers || [],
          health_context: JSON.stringify(motivationalMessage.context),
          delivery_status: 'pending',
          sent_at: null,
        };

        const result = await messageService.storeMessage(messageData as any);
        messageId = result?.id;
        if (isDev) console.log('✅ AI message stored successfully\n');
      } catch (error: any) {
        console.warn(`Failed to store message: ${error.message}`);
      }
    }

    // Step 4: Send WhatsApp notification
    if (isDev) console.log('📱 Sending WhatsApp notification...');
    const smsService = new SMSService();
    const sent = await smsService.sendMessage(motivationalMessage);

    if (sent) {
      if (isDev) console.log('✅ WhatsApp message sent successfully!\n');

      // Step 4.5: Update delivery status in Supabase
      if (targetUserId && messageId) {
        try {
          if (isDev) console.log('📝 Updating message delivery status...');
          await messageService.updateDeliveryStatus(messageId, 'delivered', new Date().toISOString());
          if (isDev) console.log('✅ Delivery status updated\n');
        } catch (error: any) {
          console.warn(`Failed to update delivery status: ${error.message}`);
        }
      }

      if (isDev) console.log('🎉 Daily motivation workflow completed!');
    } else {
      console.error('Failed to send WhatsApp message');

      // Update message status to failed
      if (targetUserId && messageId) {
        try {
          await messageService.updateDeliveryStatus(messageId, 'failed', new Date().toISOString());
        } catch (error: any) {
          console.warn(`Failed to update failed status: ${error.message}`);
        }
      }

      throw new Error('WhatsApp sending failed');
    }
  } catch (error: any) {
    console.error('Error in daily motivation workflow:', error.message);
    throw error;
  }
}

// Run if called directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  sendDailyMotivation()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
