
/**
 * WhatsApp Business API Webhook Handler
 * Receives incoming WhatsApp messages
 */

import { NextRequest, NextResponse } from 'next/server';
import { WhatsAppService } from '@/lib/messaging-sync/whatsapp-service';
import { prisma } from '@/lib/db';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  // WhatsApp webhook verification
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'soshogle_verify_token';

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('WhatsApp webhook verified');
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Invalid verification token' }, { status: 403 });
}

export async function POST(req: NextRequest) {
  try {
    const webhookData = await req.json();
    
    console.log('WhatsApp webhook received:', JSON.stringify(webhookData, null, 2));

    // Process each entry
    for (const entry of webhookData.entry || []) {
      const changes = entry.changes || [];

      for (const change of changes) {
        const value = change.value;
        if (!value?.messages) continue;

        // Get phone number ID
        const phoneNumberId = value.metadata?.phone_number_id;
        if (!phoneNumberId) continue;

        // Find channel connection for this WhatsApp number
        const channelConnection = await prisma.channelConnection.findFirst({
          where: {
            channelType: 'WHATSAPP',
            providerAccountId: phoneNumberId,
            status: 'CONNECTED',
          },
        });

        if (!channelConnection) {
          console.log('No channel connection found for WhatsApp number:', phoneNumberId);
          continue;
        }

        // Get WhatsApp Business Account ID from provider data
        const providerData = channelConnection.providerData as any;
        const businessAccountId = providerData?.businessAccountId;

        if (!businessAccountId) {
          console.log('Missing business account ID for WhatsApp connection');
          continue;
        }

        // Process incoming messages
        const whatsappService = new WhatsAppService(
          channelConnection.accessToken!,
          phoneNumberId,
          businessAccountId
        );

        await whatsappService.processIncomingMessage(
          webhookData,
          channelConnection.id,
          channelConnection.userId
        );
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error: any) {
    console.error('Error processing WhatsApp webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
