import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Twilio SMS Webhook Handler
 *
 * This endpoint receives incoming SMS messages from Twilio
 * and responds with AI-generated answers based on Whoop health data
 *
 * Configure this endpoint as your Twilio webhook:
 * https://your-app.vercel.app/api/webhook/sms-reply
 */

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only accept POST requests from Twilio
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract message data from Twilio webhook
    const { Body, From, To } = req.body;

    console.log(`Received SMS from ${From}: "${Body}"`);

    // Import chat service (after build)
    const { ChatService } = await import('../../dist/services/chat-service.js');
    const chatService = new ChatService();

    // Generate AI response
    const responseMessage = await chatService.processMessage(Body);

    // Respond with TwiML (Twilio Markup Language)
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(responseMessage)}</Message>
</Response>`;

    res.setHeader('Content-Type', 'text/xml');
    res.status(200).send(twiml);

    console.log(`Sent response: "${responseMessage}"`);
  } catch (error: any) {
    console.error('Error processing SMS webhook:', error);

    // Send error message back to user
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Sorry, I encountered an error processing your message. Please try again!</Message>
</Response>`;

    res.setHeader('Content-Type', 'text/xml');
    res.status(200).send(errorTwiml);
  }
}

/**
 * Escape XML special characters
 */
function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case "'":
        return '&apos;';
      case '"':
        return '&quot;';
      default:
        return c;
    }
  });
}
