
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendWhatsAppMessage } from '@/lib/integrations/whatsapp-service';
import { apiErrors } from '@/lib/api-error';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const body = await req.json();
    const { to, message, mediaUrl } = body;

    if (!to || !message) {
      return apiErrors.badRequest('Missing required fields');
    }

    const result = await sendWhatsAppMessage(
      session.user.id,
      to,
      message,
      mediaUrl
    );

    if (!result.success) {
      return apiErrors.badRequest(result.error!);
    }

    return NextResponse.json({
      success: true,
      messageSid: result.messageSid
    });

  } catch (error) {
    console.error('Send WhatsApp message error:', error);
    return apiErrors.internal('Failed to send message');
  }
}
