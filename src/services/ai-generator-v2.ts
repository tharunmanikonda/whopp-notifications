import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/index.js';
import { MotivationalMessage } from '../types/index.js';
import { AggregatedHealthData } from '../types/health-provider.js';

/**
 * AI Message Generator v2 - Works with multiple health data sources
 */
export class AIMessageGeneratorV2 {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  }

  /**
   * Generate a personalized motivational message based on aggregated health data
   */
  async generateMotivationalMessage(
    healthData: AggregatedHealthData,
    userName: string = 'User'
  ): Promise<MotivationalMessage> {
    const prompt = this.buildPrompt(healthData, userName);

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const message = response.text();

      return {
        message: message.trim(),
        generatedAt: new Date().toISOString(),
        context: {
          recoveryScore: healthData.primary?.recoveryScore,
          sleepScore: healthData.primary?.sleepScore,
          strain: healthData.primary?.strain,
          dataCompleteness: Math.round(healthData.dataCompleteness),
          providers: healthData.providers,
        },
      };
    } catch (error) {
      console.error('Failed to generate motivational message:', error);
      // Fallback message
      return {
        message: this.getFallbackMessage(healthData, userName),
        generatedAt: new Date().toISOString(),
        context: {
          dataCompleteness: Math.round(healthData.dataCompleteness),
          providers: healthData.providers,
        },
      };
    }
  }

  /**
   * Build a comprehensive prompt for the AI
   */
  private buildPrompt(data: AggregatedHealthData, userName: string): string {
    const primary = data.primary;
    if (!primary) {
      return `Generate a generic motivational message for ${userName} to encourage them to check their health data.`;
    }

    let prompt = `You are a supportive health and fitness coach. Generate a personalized, motivational message (max 160 characters) for ${userName} based on their health data from today.\n\n`;

    prompt += `IMPORTANT: Keep the message under 160 characters. Be concise, encouraging, and actionable. Use relevant health metrics provided.\n\n`;

    prompt += `📊 DATA SOURCES: ${data.providers.join(', ')}\n`;
    prompt += `📈 Data Completeness: ${Math.round(data.dataCompleteness)}%\n\n`;

    // Recovery & Readiness
    if (primary.recoveryScore !== undefined || primary.readinessScore !== undefined) {
      const score = primary.recoveryScore || primary.readinessScore || 0;
      prompt += `Recovery/Readiness Score: ${score}%\n`;

      if (score >= 67) {
        prompt += `- Status: GREEN - Body is well recovered and ready for intense activity\n`;
      } else if (score >= 34) {
        prompt += `- Status: YELLOW - Body is moderately recovered\n`;
      } else {
        prompt += `- Status: RED - Body needs rest and recovery\n`;
      }
    }

    // Heart Health
    if (primary.restingHeartRate) {
      prompt += `- Resting Heart Rate: ${primary.restingHeartRate} bpm\n`;
    }
    if (primary.hrv) {
      prompt += `- Heart Rate Variability: ${primary.hrv.toFixed(1)} ms\n`;
    }
    if (primary.maxHeartRate) {
      prompt += `- Max Heart Rate: ${primary.maxHeartRate} bpm\n`;
    }
    if (primary.spO2) {
      prompt += `- Blood Oxygen: ${primary.spO2.toFixed(1)}%\n`;
    }

    // Sleep
    if (primary.sleepScore !== undefined || primary.sleepDuration !== undefined) {
      if (primary.sleepScore) {
        prompt += `Sleep Score: ${primary.sleepScore}%\n`;
        if (primary.sleepScore >= 85) {
          prompt += `- Quality: Excellent sleep\n`;
        } else if (primary.sleepScore >= 70) {
          prompt += `- Quality: Good sleep\n`;
        } else {
          prompt += `- Quality: Sleep needs improvement\n`;
        }
      }
      if (primary.sleepDuration) {
        const hours = (primary.sleepDuration / 60).toFixed(1);
        prompt += `- Duration: ${hours} hours\n`;
      }
    }

    // Activity & Strain
    if (primary.strain !== undefined) {
      prompt += `Today's Strain: ${primary.strain}/21\n`;
      if (primary.strain > 15) {
        prompt += `- Status: High strain - body is being pushed\n`;
      } else if (primary.strain > 5) {
        prompt += `- Status: Moderate strain\n`;
      } else {
        prompt += `- Status: Low strain - light activity day\n`;
      }
    }

    if (primary.activityScore !== undefined) {
      prompt += `Activity Score: ${primary.activityScore}%\n`;
    }

    // Movement
    if (primary.steps) {
      prompt += `Steps: ${primary.steps.toLocaleString()}\n`;
    }
    if (primary.calories) {
      prompt += `Calories Burned: ${primary.calories.toLocaleString()} kcal\n`;
    }

    // Stress
    if (primary.stressLevel !== undefined) {
      prompt += `Stress Level: ${primary.stressLevel}%\n`;
    }

    prompt += `\nNow generate ONE personalized, motivational message. Focus on ${
      primary.recoveryScore && primary.recoveryScore < 50
        ? 'encouraging rest and recovery'
        : 'encouraging activity and pushing limits'
    }. Be warm, supportive, and specific to their metrics.`;

    return prompt;
  }

  /**
   * Generate a fallback message if AI fails
   */
  private getFallbackMessage(data: AggregatedHealthData, userName: string): string {
    const messages = [
      `${userName}, keep crushing your goals! 💪`,
      `${userName}, great job tracking your health today! 📊`,
      `${userName}, you're doing awesome! Keep it up! 🎯`,
      `${userName}, your consistency is paying off! 🌟`,
      `${userName}, prioritize rest and recovery. You've got this! 💚`,
    ];

    return messages[Math.floor(Math.random() * messages.length)];
  }
}
