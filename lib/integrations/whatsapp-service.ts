
/**
 * WhatsApp Business API Integration Service
 * Handles messaging via Twilio WhatsApp Business API
 */

import { createDalContext } from '@/lib/context/industry-context';
import { getCrmDb } from '@/lib/dal';

interface WhatsAppCredentials {
  accountSid: string;
  authToken: string;
  phoneNumber: string; // WhatsApp-enabled Twilio number
}

/**
 * Get WhatsApp credentials from user config
 */
async function getWhatsAppCredentials(userId: string): Promise<WhatsAppCredentials | null> {
  const db = getCrmDb(createDalContext(userId));
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { whatsappConfig: true }
  });

  if (!user?.whatsappConfig) {
    // Fall back to centralized Twilio credentials
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const phoneNumber = process.env.TWILIO_WHATSAPP_NUMBER;

    if (!accountSid || !authToken || !phoneNumber) {
      console.error('WhatsApp credentials not configured');
      return null;
    }

    return {
      accountSid,
      authToken,
      phoneNumber
    };
  }

  try {
    const config = JSON.parse(user.whatsappConfig);
    return {
      accountSid: config.accountSid,
      authToken: config.authToken,
      phoneNumber: config.phoneNumber
    };
  } catch (error) {
    console.error('Error parsing WhatsApp config:', error);
    return null;
  }
}

/**
 * Send a WhatsApp message
 */
export async function sendWhatsAppMessage(
  userId: string,
  to: string,
  message: string,
  mediaUrl?: string
): Promise<{ success: boolean; messageSid?: string; error?: string }> {
  try {
    const credentials = await getWhatsAppCredentials(userId);
    
    if (!credentials) {
      return {
        success: false,
        error: 'WhatsApp not configured. Please configure in Settings.'
      };
    }

    // Format phone numbers for WhatsApp (must include whatsapp: prefix)
    const fromNumber = credentials.phoneNumber.startsWith('whatsapp:') 
      ? credentials.phoneNumber 
      : `whatsapp:${credentials.phoneNumber}`;
    
    const toNumber = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

    // Build request body
    const body: any = {
      To: toNumber,
      From: fromNumber,
      Body: message
    };

    if (mediaUrl) {
      body.MediaUrl = mediaUrl;
    }

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${credentials.accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(
            `${credentials.accountSid}:${credentials.authToken}`
          ).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams(body)
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('WhatsApp API error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send WhatsApp message'
      };
    }

    const data = await response.json();
    
    // Message logged in Twilio (database logging removed for now)

    return {
      success: true,
      messageSid: data.sid
    };

  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send message'
    };
  }
}

/**
 * Send bulk WhatsApp messages (campaign)
 */
export async function sendWhatsAppCampaign(
  userId: string,
  recipients: Array<{ phone: string; name?: string }>,
  messageTemplate: string,
  mediaUrl?: string
): Promise<{ 
  success: boolean; 
  sent: number; 
  failed: number; 
  errors: Array<{ phone: string; error: string }>;
}> {
  const results = {
    sent: 0,
    failed: 0,
    errors: [] as Array<{ phone: string; error: string }>
  };

  for (const recipient of recipients) {
    // Personalize message
    const message = messageTemplate
      .replace('{{name}}', recipient.name || 'there')
      .replace('{{phone}}', recipient.phone);

    const result = await sendWhatsAppMessage(
      userId,
      recipient.phone,
      message,
      mediaUrl
    );

    if (result.success) {
      results.sent++;
    } else {
      results.failed++;
      results.errors.push({
        phone: recipient.phone,
        error: result.error || 'Unknown error'
      });
    }

    // Rate limiting: 1 message per second to avoid Twilio limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return {
    success: results.failed === 0,
    ...results
  };
}

/**
 * Handle incoming WhatsApp webhook
 */
export async function handleWhatsAppWebhook(
  webhookData: any
): Promise<{ success: boolean; error?: string }> {
  try {
    const {
      MessageSid,
      From,
      To,
      Body,
      MediaUrl0,
      MediaContentType0
    } = webhookData;

    // Remove whatsapp: prefix from phone numbers
    const fromPhone = From?.replace('whatsapp:', '');
    const toPhone = To?.replace('whatsapp:', '');

    if (!fromPhone || !toPhone) {
      return {
        success: false,
        error: 'Missing phone number data'
      };
    }

    // Find user by WhatsApp number
    const db = getCrmDb(createDalContext('bootstrap'));
    const user = await db.user.findFirst({
      where: {
        OR: [
          { whatsappConfig: { contains: toPhone } },
          { smsProviderConfig: { contains: toPhone } }
        ]
      }
    });

    if (!user) {
      console.log('No user found for WhatsApp number:', toPhone);
      return {
        success: false,
        error: 'User not found'
      };
    }

    // Webhook processed successfully
    // Note: Message persistence will be added when database schema is updated
    console.log('WhatsApp message received:', { from: fromPhone, to: toPhone, body: Body });

    // Check for auto-reply settings
    const autoReplySettings = await db.autoReplySettings.findUnique({
      where: { userId: user.id }
    });

    if (autoReplySettings?.isEnabled) {
      // Send auto-reply with default message
      await sendWhatsAppMessage(
        user.id,
        fromPhone,
        "Thanks for your message! We'll get back to you soon."
      );
    }

    return { success: true };

  } catch (error) {
    console.error('Error handling WhatsApp webhook:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Webhook processing failed'
    };
  }
}

/**
 * Check if WhatsApp is connected
 */
export async function isWhatsAppConnected(userId: string): Promise<boolean> {
  const credentials = await getWhatsAppCredentials(userId);
  return credentials !== null;
}

/**
 * Get WhatsApp conversation history
 */
export async function getWhatsAppConversations(
  userId: string,
  contactId?: string
): Promise<{ success: boolean; conversations?: any[]; error?: string }> {
  try {
    // Find channel connection for WhatsApp
    const ctx = createDalContext(userId);
    const db = getCrmDb(ctx);
    const channelConnection = await db.channelConnection.findFirst({
      where: {
        userId,
        channelType: 'WHATSAPP'
      }
    });

    if (!channelConnection) {
      return {
        success: true,
        conversations: []
      };
    }

    // Fetch conversations
    const conversations = await db.conversation.findMany({
      where: {
        userId,
        channelConnectionId: channelConnection.id,
        ...(contactId ? { leadId: contactId } : {})
      },
      orderBy: {
        lastMessageAt: 'desc'
      },
      take: 50
    });

    return {
      success: true,
      conversations
    };

  } catch (error) {
    console.error('Error fetching WhatsApp conversations:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch conversations'
    };
  }
}
