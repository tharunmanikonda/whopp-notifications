import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle GET request (WHOOP verification challenge)
  if (req.method === 'GET') {
    const challenge = req.query.challenge;
    if (challenge) {
      return res.status(200).send(challenge);
    }
    return res.status(200).json({
      status: 'ok',
      message: 'WHOOP webhook endpoint ready',
      timestamp: new Date().toISOString(),
    });
  }

  // Handle POST request (actual webhook)
  if (req.method === 'POST') {
    try {
      console.log('📥 WHOOP webhook received');
      console.log('Body:', JSON.stringify(req.body).substring(0, 200));

      // TODO: Add signature verification and data processing
      // For now, just acknowledge receipt
      return res.status(200).json({
        success: true,
        message: 'Webhook received',
      });
    } catch (error) {
      console.error('Webhook error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error processing webhook',
      });
    }
  }

  // Method not allowed
  return res.status(405).json({
    success: false,
    message: 'Method not allowed',
  });
}
