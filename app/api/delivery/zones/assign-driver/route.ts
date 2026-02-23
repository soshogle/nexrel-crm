
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { assignDriverToZone } from '@/lib/delivery-service';
import { apiErrors } from '@/lib/api-error';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const body = await request.json();

    if (!body.driverId || !body.zoneId) {
      return apiErrors.badRequest('Missing required fields: driverId, zoneId');
    }

    const result = await assignDriverToZone(body.driverId, body.zoneId);

    if (!result.success) {
      return apiErrors.badRequest(result.error);
    }

    return NextResponse.json(result.assignment, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/delivery/zones/assign-driver:', error);
    return apiErrors.internal(error.message || 'Internal server error');
  }
}
