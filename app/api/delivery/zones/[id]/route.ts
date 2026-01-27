
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  updateDeliveryZone,
  CreateDeliveryZoneInput,
} from '@/lib/delivery-service';


export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const input: Partial<CreateDeliveryZoneInput> = {};

    if (body.name) input.name = body.name;
    if (body.description !== undefined) input.description = body.description;
    if (body.polygon) input.polygon = body.polygon;
    if (body.deliveryFee !== undefined) input.deliveryFee = parseFloat(body.deliveryFee);
    if (body.minimumOrder !== undefined) input.minimumOrder = parseFloat(body.minimumOrder);
    if (body.estimatedTimeMin) input.estimatedTimeMin = parseInt(body.estimatedTimeMin);

    const result = await updateDeliveryZone(params.id, input);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result.zone);
  } catch (error: any) {
    console.error('Error in PATCH /api/delivery/zones/[id]:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
