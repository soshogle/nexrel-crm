
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
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
    const { accountSid, authToken, phoneNumber } = body;

    if (!accountSid || !authToken || !phoneNumber) {
      return apiErrors.badRequest('All fields are required');
    }

    // Save WhatsApp configuration
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        whatsappConfig: JSON.stringify({
          accountSid,
          authToken,
          phoneNumber
        }),
        whatsappConfigured: true
      }
    });

    return NextResponse.json({
      success: true,
      message: 'WhatsApp configured successfully'
    });

  } catch (error) {
    console.error('WhatsApp configuration error:', error);
    return apiErrors.internal('Failed to configure WhatsApp');
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { whatsappConfigured: true }
    });

    return NextResponse.json({
      configured: user?.whatsappConfigured || false
    });

  } catch (error) {
    console.error('Get WhatsApp status error:', error);
    return apiErrors.internal('Failed to get configuration status');
  }
}
