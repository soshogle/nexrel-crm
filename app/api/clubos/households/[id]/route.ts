
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { apiErrors } from '@/lib/api-error';

// GET /api/clubos/households/[id] - Get specific household

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return apiErrors.unauthorized();
    }

    const { id } = await params;

    const household = await prisma.clubOSHousehold.findUnique({
      where: { id },
      include: {
        members: true,
        registrations: {
          include: {
            member: true,
            program: true,
            division: true,
          },
        },
        payments: true,
        invoices: true,
      },
    });

    if (!household) {
      return apiErrors.notFound('Household not found');
    }

    return NextResponse.json({ household });
  } catch (error) {
    console.error('Error fetching household:', error);
    return apiErrors.internal('Failed to fetch household');
  }
}
