
import { NextRequest, NextResponse } from 'next/server';
import { getDeliveryOrderByTracking } from '@/lib/delivery-service';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const trackingCode = searchParams.get('code');

    if (!trackingCode) {
      return NextResponse.json(
        { error: 'Missing tracking code' },
        { status: 400 }
      );
    }

    const result = await getDeliveryOrderByTracking(trackingCode);

    if (!result.success || !result.order) {
      return NextResponse.json({ error: result.error || 'Delivery not found' }, { status: 404 });
    }

    // Return public-safe information only
    const publicInfo = {
      id: result.order.id,
      status: result.order.status,
      customerName: result.order.customerName,
      pickupAddress: result.order.pickupAddress,
      deliveryAddress: result.order.deliveryAddress,
      scheduledPickupTime: result.order.scheduledPickupTime,
      actualPickupTime: result.order.actualPickupTime,
      estimatedDeliveryTime: result.order.estimatedDeliveryTime,
      actualDeliveryTime: result.order.actualDeliveryTime,
      driver: result.order.driver
        ? {
            name: result.order.driver.name,
            phone: result.order.driver.phone,
            vehicleType: result.order.driver.vehicleType,
            vehicleColor: result.order.driver.vehicleColor,
            vehicleModel: result.order.driver.vehicleModel,
            licensePlate: result.order.driver.licensePlate,
            rating: result.order.driver.rating,
          }
        : null,
      currentLocation: result.order.locations?.[0] || null,
    };

    return NextResponse.json(publicInfo);
  } catch (error: any) {
    console.error('Error in GET /api/delivery/orders/track:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
