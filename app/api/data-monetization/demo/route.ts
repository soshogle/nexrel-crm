
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dataMonetizationService } from '@/lib/payments/data-monetization-service';

/**
 * POST /api/data-monetization/demo
 * Generate demo insights and revenue data for testing
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Grant demo consent if not already granted
    let consent = await dataMonetizationService.getConsent(session.user.id);
    if (!consent) {
      consent = await dataMonetizationService.grantConsent({
        userId: session.user.id,
        sharingLevel: 'AGGREGATED',
        allowTransactionData: true,
        allowBehaviorData: true,
        allowDemographicData: true,
        allowLocationData: false,
        revenueShareEnabled: true,
        revenueSharePercentage: 30,
      });
    }

    // Generate demo insights
    const insights = await dataMonetizationService.generateDemoInsights(session.user.id);

    // Generate demo revenue data
    const demoRevenue = await dataMonetizationService.trackDataAccess(
      session.user.id,
      'transaction',
      10000 // $100.00 in cents
    );

    await dataMonetizationService.trackDataAccess(
      session.user.id,
      'behavior',
      7500 // $75.00 in cents
    );

    await dataMonetizationService.trackDataAccess(
      session.user.id,
      'demographic',
      5000 // $50.00 in cents
    );

    return NextResponse.json({
      message: 'Demo data generated successfully',
      consent,
      insights,
      revenue: demoRevenue,
    });
  } catch (error: any) {
    console.error('Error generating demo data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate demo data' },
      { status: 500 }
    );
  }
}
