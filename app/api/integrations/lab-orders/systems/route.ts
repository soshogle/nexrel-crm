import { NextRequest, NextResponse } from 'next/server';
import { SUPPORTED_LAB_SYSTEMS } from '@/lib/integrations/lab-order-service';

/**
 * GET /api/integrations/lab-orders/systems
 * Get list of supported lab systems
 */
export async function GET(request: NextRequest) {
  try {
    const systems = Object.entries(SUPPORTED_LAB_SYSTEMS).map(([id, config]) => ({
      id,
      name: config.name,
      supportsElectronicSubmission: config.supportsElectronicSubmission,
      supportsStatusTracking: config.supportsStatusTracking,
      supportsTrackingNumbers: config.supportsTrackingNumbers,
    }));
    
    return NextResponse.json({ systems });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch lab systems', details: error.message },
      { status: 500 }
    );
  }
}
