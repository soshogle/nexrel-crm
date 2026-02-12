/**
 * Predictive Restocking API
 * Get AI-powered restocking predictions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { predictiveRestockingService } from '@/lib/website-builder/predictive-restocking';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const productIds = searchParams.get('productIds')?.split(',').filter(Boolean);

    let predictions: any[] = [];
    try {
      predictions = await predictiveRestockingService.predictRestockingNeeds(
        params.id,
        productIds
      );
    } catch (e) {
      console.warn('predictRestockingNeeds failed:', e);
    }

    return NextResponse.json({
      success: true,
      predictions,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error generating restocking predictions:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate predictions' },
      { status: 500 }
    );
  }
}
