import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createDalContext } from '@/lib/context/industry-context';
import { conversationService } from '@/lib/dal/conversation-service';
import { getCrmDb } from '@/lib/dal/db';

/**
 * Twilio SMS Webhook Handler
 * Receives incoming SMS messages from Twilio
 * 
 * UPDATED: Uses PurchasedPhoneNumber table for reliable user lookup
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const body = formData.get('Body') as string;
    const messageSid = formData.get('MessageSid') as string;

    console.log('📨 Incoming SMS:', { from, to, body, messageSid });

    // Find user by phone number in PurchasedPhoneNumber table
    // This is the reliable, multi-tenant safe way to look up the owner
    const purchasedNumber = await prisma.purchasedPhoneNumber.findFirst({
      where: {
        phoneNumber: to,
        status: 'active'
      },
      include: {
        user: true
      }
    });

    if (!purchasedNumber) {
      console.error('❌ No active phone number record found for:', to);
      return new NextResponse('', { status: 200 });
    }

    const user = purchasedNumber.user;
    console.log('✅ SMS received for user:', user.id, user.email, 'from:', from);
    
    // Find or create channel connection for SMS
    let channelConnection = await prisma.channelConnection.findFirst({
      where: {
        userId: user.id,
        channelType: 'SMS',
        channelIdentifier: to
      }
    });

    if (!channelConnection) {
      // Create channel connection for this Twilio number
      channelConnection = await prisma.channelConnection.create({
        data: {
          userId: user.id,
          channelType: 'SMS',
          channelIdentifier: to,
          displayName: `Twilio SMS (${to})`,
          status: 'CONNECTED'
        }
      });
      console.log('Created new channel connection:', channelConnection.id);
    }

    const ctx = createDalContext(user.id);
    let conversation = await conversationService.findFirst(ctx, {
      contactIdentifier: from,
      channelConnectionId: channelConnection.id
    });

    if (!conversation) {
      conversation = await conversationService.create(ctx, {
        channelConnectionId: channelConnection.id,
        contactIdentifier: from,
        contactName: from,
        lastMessageAt: new Date(),
        status: 'ACTIVE'
      });
      console.log('Created new conversation:', conversation.id);
    }

    const db = getCrmDb(ctx);
    await db.conversationMessage.create({
      data: {
        conversationId: conversation.id,
        userId: user.id,
        content: body,
        direction: 'INBOUND',
        externalMessageId: messageSid,
        status: 'DELIVERED'
      }
    });

    await conversationService.update(ctx, conversation.id, { lastMessageAt: new Date() });

    console.log('Saved incoming SMS to conversation:', conversation.id);

    // Respond with empty TwiML (no auto-reply for now)
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        status: 200,
        headers: { 'Content-Type': 'text/xml' }
      }
    );

  } catch (error) {
    console.error('Error processing SMS webhook:', error);
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        status: 200,
        headers: { 'Content-Type': 'text/xml' }
      }
    );
  }
}

// Handle GET requests (Twilio validation)
export async function GET(req: NextRequest) {
  return new NextResponse('SMS webhook endpoint is active', { status: 200 });
}
