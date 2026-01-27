
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { assignDriverToZone } from '@/lib/delivery-service';


export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    if (!body.driverId || !body.zoneId) {
      return NextResponse.json(
        { error: 'Missing required fields: driverId, zoneId' },
        { status: 400 }
      );
    }

    const result = await assignDriverToZone(body.driverId, body.zoneId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.assignment, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/delivery/zones/assign-driver:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
