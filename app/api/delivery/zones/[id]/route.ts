
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  updateDeliveryZone,
  CreateDeliveryZoneInput,
} from '@/lib/delivery-service';
import { apiErrors } from '@/lib/api-error';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
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
      return apiErrors.internal(result.error);
    }

    return NextResponse.json(result.zone);
  } catch (error: any) {
    console.error('Error in PATCH /api/delivery/zones/[id]:', error);
    return apiErrors.internal(error.message || 'Internal server error');
  }
}
