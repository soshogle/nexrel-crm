
/**
 * Facebook Messenger Webhook Handler
 * Receives incoming messages from Facebook Messenger
 */

import { NextRequest, NextResponse } from 'next/server';
import { FacebookService } from '@/lib/messaging-sync/facebook-service';
import { prisma } from '@/lib/db';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  // Facebook webhook verification
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.FACEBOOK_VERIFY_TOKEN || 'soshogle_verify_token';

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('Facebook webhook verified');
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Invalid verification token' }, { status: 403 });
}

export async function POST(req: NextRequest) {
  try {
    const webhookData = await req.json();
    
    console.log('Facebook webhook received:', JSON.stringify(webhookData, null, 2));

    // Verify webhook signature for security
    const signature = req.headers.get('x-hub-signature-256');
    // TODO: Implement signature verification

    // Process each entry
    for (const entry of webhookData.entry || []) {
      // Get page ID from the entry
      const pageId = entry.id;

      // Find channel connection for this page
      const channelConnection = await prisma.channelConnection.findFirst({
        where: {
          channelType: 'FACEBOOK_MESSENGER',
          providerAccountId: pageId,
          status: 'CONNECTED',
        },
      });

      if (!channelConnection) {
        console.log('No channel connection found for Facebook page:', pageId);
        continue;
      }

      // Process messaging events
      if (entry.messaging) {
        const facebookService = new FacebookService(
          channelConnection.accessToken!,
          pageId
        );

        for (const messaging of entry.messaging) {
          // Only process messages (not postbacks, etc.)
          if (messaging.message && !messaging.message.is_echo) {
            await facebookService.processIncomingMessage(
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
    console.error('Error processing Facebook webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
