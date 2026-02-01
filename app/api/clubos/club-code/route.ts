
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * Club Code API
 * GET - Retrieve club code for business owner
 * POST - Generate new club code for business owner
 */

// GET /api/clubos/club-code - Get current club code

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        clubCode: true,
        name: true,
        email: true,
        industry: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // If no club code, generate one
    if (!user.clubCode) {
      const clubCode = await generateUniqueClubCode(user.name || user.email);
      
      await prisma.user.update({
        where: { id: session.user.id },
        data: { clubCode },
      });

      return NextResponse.json({
        clubCode,
        signupUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/parent/signup?code=${clubCode}`,
        pendingParentsCount: 0,
      });
    }

    // Get count of pending parents
    const pendingCount = await prisma.clubOSHousehold.count({
      where: {
        clubOwnerId: session.user.id,
        status: 'PENDING',
      },
    });

    return NextResponse.json({
      clubCode: user.clubCode,
      signupUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/parent/signup?code=${user.clubCode}`,
      pendingParentsCount: pendingCount,
    });
  } catch (error: any) {
    console.error('Error fetching club code:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch club code' },
      { status: 500 }
    );
  }
}

// POST /api/clubos/club-code - Generate new club code
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Generate new unique club code
    const clubCode = await generateUniqueClubCode(user.name || user.email);

    await prisma.user.update({
      where: { id: session.user.id },
      data: { clubCode },
    });

    return NextResponse.json({
      clubCode,
      signupUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/parent/signup?code=${clubCode}`,
    });
  } catch (error: any) {
    console.error('Error generating club code:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate club code' },
      { status: 500 }
    );
  }
}

/**
 * Generate a unique club code based on name or email
 */
async function generateUniqueClubCode(identifier: string): Promise<string> {
  // Extract meaningful parts from name/email
  const cleanIdentifier = identifier
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .substring(0, 8);

  // Add random numbers for uniqueness
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  let clubCode = `${cleanIdentifier}${randomSuffix}`;

  // Ensure uniqueness
  let attempts = 0;
  while (attempts < 10) {
    const existing = await prisma.user.findUnique({
      where: { clubCode },
    });

    if (!existing) {
      return clubCode;
    }

    // If exists, try with different random suffix
    const newSuffix = Math.floor(1000 + Math.random() * 9000);
    clubCode = `${cleanIdentifier}${newSuffix}`;
    attempts++;
  }

  // Fallback: use timestamp
  return `CLUB${Date.now().toString().slice(-8)}`;
}
