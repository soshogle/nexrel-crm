
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET - Get all payments for the user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const paymentType = searchParams.get('paymentType');
    const provider = searchParams.get('provider');

    const where: any = { userId: user.id };
    if (status) where.status = status;
    if (paymentType) where.paymentType = paymentType;
    if (provider) where.provider = provider;

    const payments = await prisma.payment.findMany({
      where,
      include: {
        lead: {
          select: {
            id: true,
            businessName: true,
            contactPerson: true
          }
        },
        deal: {
          select: {
            id: true,
            title: true
          }
        },
        invoice: {
          select: {
            id: true,
            invoiceNumber: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ payments });
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    );
  }
}
