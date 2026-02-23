import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Save or update Meta App credentials
 * POST /api/meta/credentials
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const body = await request.json();
    const { appId, appSecret } = body;

    if (!appId || !appSecret) {
      return apiErrors.badRequest('App ID and App Secret are required');
    }

    // Validate App ID format (numeric)
    if (!/^\d+$/.test(appId)) {
      return apiErrors.badRequest('Invalid App ID format. It should be a numeric value.');
    }

    console.log('💾 Saving Meta credentials for user:', session.user.id);

    // Check for existing settings
    const existingSettings = await prisma.socialMediaSettings.findFirst({
      where: {
        userId: session.user.id,
        platform: 'META',
      },
    });

    if (existingSettings) {
      // Update
      await prisma.socialMediaSettings.update({
        where: { id: existingSettings.id },
        data: {
          appId,
          appSecret,
          updatedAt: new Date(),
        },
      });
    } else {
      // Create
      await prisma.socialMediaSettings.create({
        data: {
          userId: session.user.id,
          platform: 'META',
          appId,
          appSecret,
        },
      });
    }

    console.log('✅ Meta credentials saved successfully');

    return NextResponse.json({
      success: true,
      message: 'Credentials saved successfully. You can now connect your Meta account.',
    });
  } catch (error: any) {
    console.error('❌ Save Meta credentials error:', error);
    return apiErrors.internal(error.message || 'Failed to save credentials');
  }
}

/**
 * Get Meta credentials (masked)
 * GET /api/meta/credentials
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const settings = await prisma.socialMediaSettings.findFirst({
      where: {
        userId: session.user.id,
        platform: 'META',
      },
    });

    if (!settings) {
      return NextResponse.json({
        hasCredentials: false,
        appId: null,
      });
    }

    // Return masked credentials
    return NextResponse.json({
      hasCredentials: true,
      appId: settings.appId,
      appSecretMasked: settings.appSecret
        ? `${settings.appSecret.substring(0, 4)}...${settings.appSecret.substring(settings.appSecret.length - 4)}`
        : null,
    });
  } catch (error: any) {
    console.error('❌ Get Meta credentials error:', error);
    return apiErrors.internal(error.message || 'Failed to get credentials');
  }
}
