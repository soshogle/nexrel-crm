
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCrmDb } from '@/lib/dal';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { apiErrors } from '@/lib/api-error';

// GET - Get all payments for the user

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const paymentType = searchParams.get('paymentType');
    const provider = searchParams.get('provider');

    const where: any = { userId: ctx.userId };
    if (status) where.status = status;
    if (paymentType) where.paymentType = paymentType;
    if (provider) where.provider = provider;

    const payments = await getCrmDb(ctx).payment.findMany({
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
    return apiErrors.internal('Failed to fetch payments');
  }
}
