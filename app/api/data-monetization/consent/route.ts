
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dataMonetizationService } from '@/lib/payments/data-monetization-service';

/**
 * GET /api/data-monetization/consent
 * Get user's current data sharing consent
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const consent = await dataMonetizationService.getConsent(session.user.id);

    return NextResponse.json({
      consent,
      hasConsent: !!consent,
    });
  } catch (error: any) {
    console.error('Error fetching consent:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch consent' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/data-monetization/consent
 * Grant or update data sharing consent
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      sharingLevel,
      allowTransactionData,
      allowBehaviorData,
      allowDemographicData,
      allowLocationData,
      revenueShareEnabled,
      revenueSharePercentage,
    } = body;

    // Validate sharing level
    const validSharingLevels = ['NONE', 'ANONYMOUS_ONLY', 'AGGREGATED', 'FULL_ANONYMOUS'];
    if (!validSharingLevels.includes(sharingLevel)) {
      return NextResponse.json(
        { error: 'Invalid sharing level' },
        { status: 400 }
      );
    }

    // Validate revenue share percentage
    if (revenueShareEnabled && (revenueSharePercentage < 0 || revenueSharePercentage > 100)) {
      return NextResponse.json(
        { error: 'Revenue share percentage must be between 0 and 100' },
        { status: 400 }
      );
    }

    const consent = await dataMonetizationService.grantConsent({
      userId: session.user.id,
      sharingLevel,
      allowTransactionData: !!allowTransactionData,
      allowBehaviorData: !!allowBehaviorData,
      allowDemographicData: !!allowDemographicData,
      allowLocationData: !!allowLocationData,
      revenueShareEnabled: !!revenueShareEnabled,
      revenueSharePercentage: revenueSharePercentage || 0,
    });

    return NextResponse.json({
      consent,
      message: 'Consent granted successfully',
    });
  } catch (error: any) {
    console.error('Error granting consent:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to grant consent' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/data-monetization/consent
 * Revoke data sharing consent
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const consent = await dataMonetizationService.revokeConsent(session.user.id);

    return NextResponse.json({
      consent,
      message: 'Consent revoked successfully',
    });
  } catch (error: any) {
    console.error('Error revoking consent:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to revoke consent' },
      { status: 500 }
    );
  }
}
