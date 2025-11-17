import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/index.js';
import { WhoopClient } from './whoop-client.js';
import { DailyHealthData } from '../types/index.js';

export class ChatService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private whoopClient: WhoopClient;

  constructor() {
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
    this.whoopClient = new WhoopClient();
  }

  /**
   * Process incoming message and generate AI response
   */
  async processMessage(userMessage: string): Promise<string> {
    try {
      // Fetch latest health data
      const healthData = await this.whoopClient.getDailyHealthData();

      // Build context-aware prompt
      const prompt = this.buildChatPrompt(userMessage, healthData);

      // Generate response
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      let message = response.text().trim();

      // Ensure message fits in SMS (160 chars, or 2-3 messages max)
      if (message.length > 480) {
        message = message.substring(0, 477) + '...';
      }

      return message;
    } catch (error) {
      console.error('Failed to generate chat response:', error);
      return this.getFallbackResponse(userMessage);
    }
  }

  /**
   * Build a chat prompt with health context
   */
  private buildChatPrompt(userMessage: string, healthData: DailyHealthData): string {
    const { recovery, sleep, todayCycle, userName } = healthData;

    let prompt = `You are a personal health and fitness coach chatting with ${userName} via SMS. `;
    prompt += `Answer their question based on their latest Whoop health data.\n\n`;

    prompt += `IMPORTANT: Keep your response under 480 characters (3 SMS messages max). Be concise and helpful.\n\n`;

    // Add current health context
    prompt += `CURRENT HEALTH DATA:\n`;

    if (recovery?.score.recovery_score !== undefined) {
      const recoveryScore = recovery.score.recovery_score;
      prompt += `- Recovery: ${recoveryScore}% `;
      if (recoveryScore >= 67) prompt += `(GREEN - fully recovered)\n`;
      else if (recoveryScore >= 34) prompt += `(YELLOW - moderately recovered)\n`;
      else prompt += `(RED - needs rest)\n`;

      prompt += `- HRV: ${recovery.score.hrv_rmssd_milli.toFixed(1)} ms\n`;
      prompt += `- Resting Heart Rate: ${recovery.score.resting_heart_rate} bpm\n`;
    }

    if (sleep?.score.sleep_performance_percentage !== undefined) {
      const totalSleepHours = (
        (sleep.score.stage_summary.total_light_sleep_time_milli +
          sleep.score.stage_summary.total_slow_wave_sleep_time_milli +
          sleep.score.stage_summary.total_rem_sleep_time_milli) /
        (1000 * 60 * 60)
      ).toFixed(1);

      prompt += `- Sleep Performance: ${sleep.score.sleep_performance_percentage}%\n`;
      prompt += `- Total Sleep: ${totalSleepHours} hours\n`;
      prompt += `- Sleep Efficiency: ${sleep.score.sleep_efficiency_percentage}%\n`;
    }

    if (todayCycle?.score.strain !== undefined) {
      prompt += `- Today's Strain: ${todayCycle.score.strain.toFixed(1)} / 21\n`;
    }

    prompt += `\nUSER'S QUESTION: "${userMessage}"\n\n`;

    prompt += `Generate a helpful, personalized response that:\n`;
    prompt += `1. Directly answers their question\n`;
    prompt += `2. References their current health data when relevant\n`;
    prompt += `3. Provides specific, actionable advice\n`;
    prompt += `4. Is encouraging and supportive\n`;
    prompt += `5. Is under 480 characters total\n\n`;

    prompt += `Response:`;

    return prompt;
  }

  /**
   * Fallback responses for common questions when AI fails
   */
  private getFallbackResponse(userMessage: string): string {
    const msg = userMessage.toLowerCase();

    if (msg.includes('recovery') || msg.includes('score')) {
      return "I'm having trouble accessing your data right now. Try asking again in a moment!";
    }

    if (msg.includes('sleep')) {
      return "Sleep is crucial for recovery! Aim for 7-9 hours and keep a consistent bedtime.";
    }

    if (msg.includes('workout') || msg.includes('train')) {
      return "Listen to your body! Check your recovery score to decide workout intensity.";
    }

    if (msg.includes('help')) {
      return "You can ask me about your recovery, sleep, strain, workouts, or health advice! What would you like to know?";
    }

    return "I'm here to help with your health data! Ask me about recovery, sleep, strain, or training advice.";
  }

  /**
   * Detect if message is a question
   */
  isQuestion(message: string): boolean {
    const questionWords = ['what', 'when', 'where', 'why', 'how', 'should', 'can', 'is', 'are', 'do'];
    const lowerMsg = message.toLowerCase();

    return (
      message.includes('?') ||
      questionWords.some((word) => lowerMsg.startsWith(word)) ||
      lowerMsg.includes('tell me')
    );
  }
}
