#!/usr/bin/env node

/**
 * Send a test SMS to verify Twilio setup
 */

import { SMSService } from '../services/sms-service.js';

async function sendTestSMS() {
  console.log('📱 Sending test SMS...\n');

  const smsService = new SMSService();
  const success = await smsService.sendTestMessage();

  if (success) {
    console.log('\n✅ Test SMS sent! Check your phone.');
  } else {
    console.log('\n❌ Failed to send test SMS. Check the error above.');
  }
}

sendTestSMS().catch(console.error);
