
/**
 * Instagram DM Webhook Handler
 * Receives incoming direct messages from Instagram
 */

import { NextRequest, NextResponse } from 'next/server';
import { InstagramService } from '@/lib/messaging-sync/instagram-service';
import { prisma } from '@/lib/db';


export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Instagram webhook verification (same as Facebook)
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.INSTAGRAM_VERIFY_TOKEN || 'soshogle_verify_token';

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('Instagram webhook verified');
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Invalid verification token' }, { status: 403 });
}

export async function POST(req: NextRequest) {
  try {
    const webhookData = await req.json();
    
    console.log('Instagram webhook received:', JSON.stringify(webhookData, null, 2));

    // Process each entry
    for (const entry of webhookData.entry || []) {
      const instagramAccountId = entry.id;

      // Find channel connection for this Instagram account
      const channelConnection = await prisma.channelConnection.findFirst({
        where: {
          channelType: 'INSTAGRAM',
          providerAccountId: instagramAccountId,
          status: 'CONNECTED',
        },
      });

      if (!channelConnection) {
        console.log('No channel connection found for Instagram account:', instagramAccountId);
        continue;
      }

      // Process messaging events
      if (entry.messaging) {
        const instagramService = new InstagramService(
          channelConnection.accessToken!,
          instagramAccountId
        );

        for (const messaging of entry.messaging) {
          // Only process incoming messages (not echoes)
          if (messaging.message && !messaging.message.is_echo) {
            await instagramService.processIncomingMessage(
              { entry: [{ messaging: [messaging] }] },
              channelConnection.id,
              channelConnection.userId
            );
          }
        }
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error: any) {
    console.error('Error processing Instagram webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
