import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkLabOrderStatus } from '@/lib/integrations/lab-order-service';

/**
 * POST /api/integrations/lab-orders/status
 * Check lab order status from external lab system
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { orderId, labSystem } = body;

    if (!orderId || !labSystem) {
      return NextResponse.json(
        { error: 'Missing required fields: orderId, labSystem' },
        { status: 400 }
      );
    }

    const result = await checkLabOrderStatus(
      session.user.id,
      orderId,
      labSystem
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      status: result.status,
    });

  } catch (error: any) {
    console.error('Error checking lab order status:', error);
    return NextResponse.json(
      { error: 'Failed to check lab order status', details: error.message },
      { status: 500 }
    );
  }
}
