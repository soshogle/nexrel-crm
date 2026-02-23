
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { apiErrors } from '@/lib/api-error';

// GET /api/clubos/parent/payments/registrations - Get registrations for payment

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    // Get household for the user
    const household = await prisma.clubOSHousehold.findUnique({
      where: { userId: session.user.id },
    });

    if (!household) {
      return apiErrors.notFound('Household not found');
    }

    // Get all registrations with balances
    const registrations = await prisma.clubOSRegistration.findMany({
      where: {
        householdId: household.id,
        status: { in: ['PENDING', 'APPROVED', 'ACTIVE'] },
      },
      include: {
        member: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        program: {
          select: {
            name: true,
          },
        },
        division: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ registrations });
  } catch (error: any) {
    console.error('Error fetching registrations for payment:', error);
    return apiErrors.internal(error.message || 'Failed to fetch registrations');
  }
}
