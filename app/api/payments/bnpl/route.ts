
/**
 * BNPL Applications API
 * GET - List applications
 * POST - Create new application
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { BnplService } from '@/lib/payments/bnpl-service';
import { BnplStatus } from '@prisma/client';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as BnplStatus | null;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const applications = await BnplService.getApplicationsByUser(
      session.user.id,
      { status: status || undefined, limit, offset }
    );

    return NextResponse.json(applications);
  } catch (error) {
    console.error('Error fetching BNPL applications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch BNPL applications' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      purchaseAmount,
      downPayment,
      installmentCount,
      interestRate,
      merchantName,
      merchantId,
      productDescription,
      orderId,
      autoApprove,
    } = body;

    // Validation
    if (!purchaseAmount || !installmentCount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (![4, 6, 12, 24].includes(installmentCount)) {
      return NextResponse.json(
        { error: 'Invalid installment count. Must be 4, 6, 12, or 24' },
        { status: 400 }
      );
    }

    // Create application
    const application = await BnplService.createApplication({
      userId: session.user.id,
      purchaseAmount,
      downPayment,
      installmentCount,
      interestRate,
      merchantName,
      merchantId,
      productDescription,
      orderId,
    });

    // Auto-approve if requested
    if (autoApprove) {
      const approvalResult = await BnplService.processApplication(application.id);
      return NextResponse.json(approvalResult, { status: 201 });
    }

    return NextResponse.json(application, { status: 201 });
  } catch (error) {
    console.error('Error creating BNPL application:', error);
    return NextResponse.json(
      { error: 'Failed to create BNPL application' },
      { status: 500 }
    );
  }
}
