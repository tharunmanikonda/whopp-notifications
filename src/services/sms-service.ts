import twilio from 'twilio';
import { config } from '../config/index.js';
import { MotivationalMessage } from '../types/index.js';

export class SMSService {
  private client: any;
  private fromNumber: string;
  private toNumber: string;

  constructor() {
    this.client = twilio(config.twilio.accountSid, config.twilio.authToken);
    this.fromNumber = config.twilio.phoneNumber;
    this.toNumber = config.user.phoneNumber;
  }

  /**
   * Send motivational message via SMS
   */
  async sendMessage(motivationalMsg: MotivationalMessage): Promise<boolean> {
    try {
      const message = await this.client.messages.create({
        body: motivationalMsg.message,
        from: `whatsapp:${this.fromNumber}`,
        to: `whatsapp:${this.toNumber}`,
      });

      console.log(`SMS sent successfully! SID: ${message.sid}`);
      console.log(`Message: "${motivationalMsg.message}"`);
      console.log(`Character count: ${motivationalMsg.message.length}`);

      return true;
    } catch (error: any) {
      console.error('Failed to send SMS:', error);

      // Handle specific Twilio errors
      if (error.code === 21211) {
        console.error('Invalid phone number format');
      } else if (error.code === 21608) {
        console.error('Phone number is not verified (sandbox mode)');
      } else if (error.code === 20003) {
        console.error('Authentication failed - check Twilio credentials');
      }

      return false;
    }
  }

  /**
   * Send a test message to verify setup
   */
  async sendTestMessage(): Promise<boolean> {
    const testMessage: MotivationalMessage = {
      message: 'Whoop AI Motivator is set up! You\'ll receive daily health insights here. 🚀',
      generatedAt: new Date().toISOString(),
      context: {},
    };

    return this.sendMessage(testMessage);
  }

  /**
   * Validate phone number format
   */
  validatePhoneNumber(phoneNumber: string): boolean {
    // Basic E.164 format validation
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(phoneNumber);
  }

  /**
   * Get account balance (requires Twilio credentials)
   */
  async getAccountBalance(): Promise<void> {
    try {
      const account = await this.client.api.accounts(config.twilio.accountSid).fetch();
      console.log(`Twilio Account Balance: ${account.balance} ${account.currency}`);
    } catch (error) {
      console.error('Failed to fetch account balance:', error);
    }
  }
}
