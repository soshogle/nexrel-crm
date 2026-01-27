
/**
 * Soshogle Pay - Webhook API
 * POST /api/payments/soshogle/webhook
 * Receive and process webhook events from Soshogle Pay
 */

import { NextRequest, NextResponse } from 'next/server';
import { soshogleWebhookHandler, verifyWebhookSignature } from '@/lib/payments/webhook-handler';


export const dynamic = 'force-dynamic';

const WEBHOOK_SECRET = process.env.SOSHOGLE_PAY_WEBHOOK_SECRET || '';

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('soshogle-signature') || '';

    // Verify webhook signature
    if (WEBHOOK_SECRET) {
      const isValid = verifyWebhookSignature(body, signature, WEBHOOK_SECRET);
      
      if (!isValid) {
        console.error('❌ Invalid webhook signature');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    }

    // Parse webhook event
    const event = JSON.parse(body);

    // Process event
    await soshogleWebhookHandler.handleEvent(event);

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('❌ Webhook processing error:', error);
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
