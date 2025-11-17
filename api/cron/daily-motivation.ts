import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Vercel Serverless Function for Daily Motivation Cron
 *
 * This function is triggered by Vercel Cron Jobs daily at 8 AM
 */

// Note: We can't directly import our TypeScript modules in Vercel functions
// without building them first. This is a placeholder for the Vercel deployment.
//
// For Vercel deployment, you'll need to either:
// 1. Build the project first (npm run build) and import from dist
// 2. Use a separate build step
// 3. Or call an external API endpoint

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Verify this is a Vercel Cron request
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Import and run the daily motivation function
    // Note: In production, this would need to be built and deployed
    const { sendDailyMotivation } = await import('../../dist/index.js');
    await sendDailyMotivation();

    res.status(200).json({
      success: true,
      message: 'Daily motivation sent successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Cron job failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}
