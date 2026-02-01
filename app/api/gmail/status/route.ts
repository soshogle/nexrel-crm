import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Checks Gmail connection status
 * GET /api/gmail/status
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const connection = await prisma.channelConnection.findFirst({
      where: {
        userId: session.user.id,
        channelType: 'EMAIL',
        providerType: 'GMAIL',
      },
      select: {
        id: true,
        channelType: true,
        channelIdentifier: true,
        displayName: true,
        status: true,
        createdAt: true,
        expiresAt: true,
        providerData: true,
        accessToken: true,
      },
    });

    if (!connection) {
      console.log('❌ No Gmail connection found for user:', session.user.id);
      return NextResponse.json({
        isConnected: false,
        connection: null,
      });
    }

    // If displayName is not set but we have an access token, fetch it from Gmail API
    let emailAddress = connection.displayName || connection.channelIdentifier;
    
    if (!emailAddress || emailAddress === 'Gmail Account') {
      if (connection.accessToken) {
        try {
          console.log('🔍 Fetching email address from Gmail API...');
          const profileResponse = await fetch(
            'https://www.googleapis.com/gmail/v1/users/me/profile',
            {
              headers: { Authorization: `Bearer ${connection.accessToken}` },
            }
          );

          if (profileResponse.ok) {
            const profile = await profileResponse.json();
            emailAddress = profile.emailAddress || emailAddress;
            
            // Update the connection with the fetched email address
            if (profile.emailAddress) {
              await prisma.channelConnection.update({
                where: { id: connection.id },
                data: {
                  displayName: profile.emailAddress,
                  channelIdentifier: profile.emailAddress,
                },
              });
              console.log('✅ Updated Gmail connection with email:', profile.emailAddress);
            }
          } else {
            console.log('⚠️ Failed to fetch Gmail profile, using fallback');
          }
        } catch (error) {
          console.error('Error fetching Gmail profile:', error);
        }
      }
    }

    // Fallback if still no email address
    if (!emailAddress) {
      emailAddress = 'Gmail Account';
    }

    console.log('✅ Gmail connection found:', {
      userId: session.user.id,
      displayName: connection.displayName,
      channelIdentifier: connection.channelIdentifier,
      emailAddress: emailAddress,
    });

    // Don't expose accessToken in the response
    const { accessToken, ...connectionWithoutToken } = connection;
    
    return NextResponse.json({
      isConnected: connection.status === 'CONNECTED',
      connection: {
        ...connectionWithoutToken,
        emailAddress: emailAddress,
      },
    });
  } catch (error: any) {
    console.error('Error checking Gmail status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check Gmail status' },
      { status: 500 }
    );
  }
}
