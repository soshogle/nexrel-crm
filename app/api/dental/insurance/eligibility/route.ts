/**
 * Insurance Eligibility Check API
 * Phase 6: Check patient eligibility with insurance providers
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { insuranceManager } from '@/lib/dental/insurance-integration';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// POST - Check eligibility
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { leadId, providerName, insuranceType, policyNumber } = body;

    if (!leadId || !providerName || !insuranceType) {
      return NextResponse.json(
        { error: 'Missing required fields: leadId, providerName, insuranceType' },
        { status: 400 }
      );
    }

    const provider = {
      id: '',
      name: providerName,
      type: (insuranceType === 'RAMQ' ? 'RAMQ' : 'PRIVATE') as 'RAMQ' | 'PRIVATE',
    };

    const eligibility = await insuranceManager.checkEligibility(leadId, provider);

    return NextResponse.json({
      success: true,
      eligibility,
    });
  } catch (error: any) {
    console.error('Error checking eligibility:', error);
    return NextResponse.json(
      { error: 'Failed to check eligibility', details: error.message },
      { status: 500 }
    );
  }
}
