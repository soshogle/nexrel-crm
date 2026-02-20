
/**
 * Facebook Messenger Webhook Handler
 * Receives incoming messages from Facebook Messenger
 */

import { NextRequest, NextResponse } from 'next/server';
import { FacebookService } from '@/lib/messaging-sync/facebook-service';
import { prisma } from '@/lib/db';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function verifyFacebookSignature(rawBody: string, signature: string | null): boolean {
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  if (!appSecret) return true; // Skip if secret not configured (dev mode)
  if (!signature) return false;

  const expectedSig = 'sha256=' + crypto
    .createHmac('sha256', appSecret)
    .update(rawBody)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSig)
  );
}

export async function GET(req: NextRequest) {
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
    const rawBody = await req.text();
    const signature = req.headers.get('x-hub-signature-256');

    if (!verifyFacebookSignature(rawBody, signature)) {
      console.error('Facebook webhook signature verification failed');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    const webhookData = JSON.parse(rawBody);

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
