/**
 * POST /api/ehr-bridge/auth/generate
 * Generate extension token for the current user (requires Nexrel session)
 * User copies token and pastes into extension popup
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const TOKEN_EXPIRY_DAYS = 90;

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = `ehr_${crypto.randomBytes(24).toString('hex')}`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + TOKEN_EXPIRY_DAYS);

    await prisma.apiKey.upsert({
      where: {
        userId_service_keyName: {
          userId: session.user.id,
          service: 'ehr_bridge',
          keyName: 'extension_token',
        },
      },
      create: {
        userId: session.user.id,
        service: 'ehr_bridge',
        keyName: 'extension_token',
        keyValue: JSON.stringify({ token, expiresAt: expiresAt.toISOString() }),
      },
      update: {
        keyValue: JSON.stringify({ token, expiresAt: expiresAt.toISOString() }),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      token,
      expiresAt: expiresAt.toISOString(),
      message: 'Copy this token and paste it into the EHR Bridge extension popup.',
    });
  } catch (error: unknown) {
    console.error('[EHR Bridge] Token generation failed:', error);
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    );
  }
}
