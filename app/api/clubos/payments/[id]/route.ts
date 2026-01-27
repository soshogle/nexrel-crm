
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/clubos/payments/[id] - Get payment details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payment = await prisma.clubOSPayment.findUnique({
      where: { id: params.id },
      include: {
        household: true,
        registration: {
          include: {
            member: true,
            program: true,
            division: true,
          },
        },
      },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Verify access
    if (payment.household.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json({ payment });
  } catch (error: any) {
    console.error('Error fetching payment:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch payment' },
      { status: 500 }
    );
  }
}
