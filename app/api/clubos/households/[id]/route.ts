
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
      return NextResponse.json({ error: 'Household not found' }, { status: 404 });
    }

    return NextResponse.json({ household });
  } catch (error) {
    console.error('Error fetching household:', error);
    return NextResponse.json(
      { error: 'Failed to fetch household' },
      { status: 500 }
    );
  }
}
