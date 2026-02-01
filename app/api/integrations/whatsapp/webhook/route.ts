
import { NextRequest, NextResponse } from 'next/server';
import { handleWhatsAppWebhook } from '@/lib/integrations/whatsapp-service';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.formData();
    const webhookData = Object.fromEntries(body.entries());

    const result = await handleWhatsAppWebhook(webhookData);

    if (!result.success) {
      console.error('WhatsApp webhook error:', result.error);
    }

    // Always return 200 to acknowledge receipt
    return new NextResponse('OK', { status: 200 });

  } catch (error) {
    console.error('WhatsApp webhook processing error:', error);
    // Still return 200 to avoid retries
    return new NextResponse('OK', { status: 200 });
  }
}
