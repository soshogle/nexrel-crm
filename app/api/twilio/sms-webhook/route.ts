
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * Twilio SMS Webhook Handler
 * Receives incoming SMS messages from Twilio
 * 
 * UPDATED: Uses PurchasedPhoneNumber table for reliable user lookup
 */
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

    // Find or create conversation for this contact
    let conversation = await prisma.conversation.findFirst({
      where: {
        userId: user.id,
        contactIdentifier: from,
        channelConnectionId: channelConnection.id
      }
    });

    if (!conversation) {
      // Create new conversation for incoming SMS
      conversation = await prisma.conversation.create({
        data: {
          userId: user.id,
          channelConnectionId: channelConnection.id,
          contactIdentifier: from,
          contactName: from, // Will show phone number until contact is identified
          lastMessageAt: new Date(),
          status: 'ACTIVE'
        }
      });
      console.log('Created new conversation:', conversation.id);
    }

    // Store the incoming message
    await prisma.conversationMessage.create({
      data: {
        conversationId: conversation.id,
        userId: user.id,
        content: body,
        direction: 'INBOUND',
        externalMessageId: messageSid,
        status: 'DELIVERED'
      }
    });

    // Update conversation last message time
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() }
    });

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
