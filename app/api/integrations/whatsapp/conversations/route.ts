
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getWhatsAppConversations } from '@/lib/integrations/whatsapp-service';
import { apiErrors } from '@/lib/api-error';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const searchParams = req.nextUrl.searchParams;
    const contactId = searchParams.get('contactId');

    const result = await getWhatsAppConversations(
      session.user.id,
      contactId || undefined
    );

    if (!result.success) {
      return apiErrors.badRequest(result.error!);
    }

    return NextResponse.json({
      success: true,
      conversations: result.conversations
    });

  } catch (error) {
    console.error('Get WhatsApp conversations error:', error);
    return apiErrors.internal('Failed to fetch conversations');
  }
}
