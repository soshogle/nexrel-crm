
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { clubOSPaymentService } from '@/lib/clubos-payment-service';

// GET /api/clubos/payments - Get payment history

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const registrationId = searchParams.get('registrationId');
    const householdId = searchParams.get('householdId');

    // Get household for the user
    const { prisma } = await import('@/lib/db');
    const household = await prisma.clubOSHousehold.findUnique({
      where: { userId: session.user.id },
    });

    if (!household) {
      return NextResponse.json({ error: 'Household not found' }, { status: 404 });
    }

    let payments;
    
    if (registrationId) {
      // Get payments for specific registration
      payments = await clubOSPaymentService.getRegistrationPayments(registrationId);
    } else {
      // Get all payments for household
      payments = await clubOSPaymentService.getHouseholdPayments(household.id);
    }

    return NextResponse.json({ payments });
  } catch (error: any) {
    console.error('Error fetching payments:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch payments' },
      { status: 500 }
    );
  }
}

// POST /api/clubos/payments - Create payment intent
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { registrationId, amount, description, metadata } = body;

    if (!registrationId || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: registrationId, amount' },
        { status: 400 }
      );
    }

    // Get household for the user
    const { prisma } = await import('@/lib/db');
    const household = await prisma.clubOSHousehold.findUnique({
      where: { userId: session.user.id },
    });

    if (!household) {
      return NextResponse.json({ error: 'Household not found' }, { status: 404 });
    }

    // Verify registration belongs to this household
    const registration = await prisma.clubOSRegistration.findUnique({
      where: { id: registrationId },
    });

    if (!registration || registration.householdId !== household.id) {
      return NextResponse.json({ error: 'Registration not found or unauthorized' }, { status: 403 });
    }

    // Create payment intent
    const result = await clubOSPaymentService.createPaymentIntent({
      registrationId,
      householdId: household.id,
      amount,
      description,
      metadata,
    });

    return NextResponse.json({
      clientSecret: result.clientSecret,
      paymentId: result.payment.id,
    });
  } catch (error: any) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}
