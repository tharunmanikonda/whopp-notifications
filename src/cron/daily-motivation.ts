#!/usr/bin/env node

/**
 * Daily Motivation Cron Job
 *
 * This script is designed to run daily via Vercel Cron Jobs
 * or any other scheduler (cron, GitHub Actions, etc.)
 */

import { sendDailyMotivation } from '../index.js';

async function main() {
  console.log('==========================================');
  console.log('  Whoop AI Motivator - Daily Cron Job');
  console.log('==========================================\n');

  try {
    await sendDailyMotivation();
    console.log('\n✅ Cron job completed successfully');
  } catch (error: any) {
    console.error('\n❌ Cron job failed:', error.message);
    process.exit(1);
  }
}

main();
