import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * WhatsApp Business API Connection
 * Connect using WhatsApp Business API credentials
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { phoneNumberId, accessToken, businessAccountId } = body;

    if (!phoneNumberId || !accessToken || !businessAccountId) {
      return NextResponse.json(
        { error: 'Missing required fields: phoneNumberId, accessToken, businessAccountId' },
        { status: 400 }
      );
    }

    // Verify the access token by fetching phone number details
    const verifyResponse = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}?access_token=${accessToken}`
    );

    if (!verifyResponse.ok) {
      const errorData = await verifyResponse.json();
      console.error('WhatsApp verification error:', errorData);
      return NextResponse.json(
        { error: 'Failed to verify WhatsApp credentials. Please check your access token and phone number ID.' },
        { status: 400 }
      );
    }

    const phoneData = await verifyResponse.json();
    const displayNumber = phoneData.display_phone_number || phoneData.verified_name || 'WhatsApp Business';

    // Store connection in database
    const existingConn = await prisma.channelConnection.findFirst({
      where: {
        userId: session.user.id,
        channelType: 'WHATSAPP',
        channelIdentifier: phoneNumberId,
      },
    });
    
    let connection;
    if (existingConn) {
      connection = await prisma.channelConnection.update({
        where: { id: existingConn.id },
        data: {
          accessToken,
          displayName: displayNumber,
          status: 'CONNECTED',
          providerType: 'whatsapp',
          providerAccountId: businessAccountId,
          providerData: phoneData,
          lastSyncAt: new Date(),
          errorMessage: null,
        },
      });
    } else {
      connection = await prisma.channelConnection.create({
        data: {
          userId: session.user.id,
          channelType: 'WHATSAPP',
          channelIdentifier: phoneNumberId,
          accessToken,
          displayName: displayNumber,
          status: 'CONNECTED',
          providerType: 'whatsapp',
          providerAccountId: businessAccountId,
          providerData: phoneData,
          syncEnabled: true,
        },
      });
    }

    console.log(`✅ WhatsApp Business connected: ${displayNumber} (${phoneNumberId})`);

    return NextResponse.json({
      success: true,
      message: 'WhatsApp Business account connected successfully',
      connection: {
        id: connection.id,
        displayName: connection.displayName,
        phoneNumberId,
      },
    });
  } catch (error: any) {
    console.error('WhatsApp connection error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to connect WhatsApp Business' },
      { status: 500 }
    );
  }
}
