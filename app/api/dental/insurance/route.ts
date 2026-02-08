/**
 * Insurance Integration API
 * Phase 6: Insurance verification and claims (RAMQ, private insurance)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/dental/insurance/verify - Verify insurance coverage
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('leadId');
    const insuranceNumber = searchParams.get('insuranceNumber');
    const insuranceType = searchParams.get('insuranceType'); // 'RAMQ' | 'PRIVATE'

    if (!leadId || !insuranceNumber) {
      return NextResponse.json(
        { error: 'Lead ID and insurance number required' },
        { status: 400 }
      );
    }

    // Phase 6: Integrate with insurance APIs
    // For now, return mock data
    const verification = {
      valid: true,
      insuranceType: insuranceType || 'PRIVATE',
      coverage: {
        percentage: 80,
        annualLimit: 2000,
        remaining: 1500,
      },
      patient: {
        name: 'John Doe',
        dateOfBirth: '1990-01-01',
      },
      verifiedAt: new Date().toISOString(),
    };

    return NextResponse.json({ success: true, verification });
  } catch (error: any) {
    console.error('Error verifying insurance:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to verify insurance' },
      { status: 500 }
    );
  }
}

// POST /api/dental/insurance/claim - Submit insurance claim
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { leadId, procedureIds, totalAmount, insuranceNumber } = body;

    if (!leadId || !procedureIds || !totalAmount) {
      return NextResponse.json(
        { error: 'Lead ID, procedure IDs, and total amount required' },
        { status: 400 }
      );
    }

    // Phase 6: Submit claim to insurance provider
    // For now, create a claim record
    const claim = {
      id: `claim-${Date.now()}`,
      leadId,
      userId: session.user.id,
      procedureIds,
      totalAmount,
      insuranceNumber,
      status: 'SUBMITTED',
      submittedAt: new Date().toISOString(),
    };

    return NextResponse.json({ success: true, claim }, { status: 201 });
  } catch (error: any) {
    console.error('Error submitting claim:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to submit claim' },
      { status: 500 }
    );
  }
}
