
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createDeliveryRating } from '@/lib/delivery-service';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.deliveryOrderId || !body.driverId || !body.rating) {
      return NextResponse.json(
        { error: 'Missing required fields: deliveryOrderId, driverId, rating' },
        { status: 400 }
      );
    }

    // Validate rating range
    if (body.rating < 1 || body.rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    const input = {
      deliveryOrderId: body.deliveryOrderId,
      driverId: body.driverId,
      userId: session.user.id,
      rating: parseInt(body.rating),
      comment: body.comment,
      speedRating: body.speedRating ? parseInt(body.speedRating) : undefined,
      qualityRating: body.qualityRating ? parseInt(body.qualityRating) : undefined,
      serviceRating: body.serviceRating ? parseInt(body.serviceRating) : undefined,
    };

    const result = await createDeliveryRating(input);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result.rating, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/delivery/ratings:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
