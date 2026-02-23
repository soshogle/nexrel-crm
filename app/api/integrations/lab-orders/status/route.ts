import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkLabOrderStatus } from '@/lib/integrations/lab-order-service';
import { apiErrors } from '@/lib/api-error';

/**
 * POST /api/integrations/lab-orders/status
 * Check lab order status from external lab system
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const body = await request.json();
    const { orderId, labSystem } = body;

    if (!orderId || !labSystem) {
      return apiErrors.badRequest('Missing required fields: orderId, labSystem');
    }

    const result = await checkLabOrderStatus(
      session.user.id,
      orderId,
      labSystem
    );

    if (!result.success) {
      return apiErrors.badRequest(result.error!);
    }

    return NextResponse.json({
      success: true,
      status: result.status,
    });

  } catch (error: any) {
    console.error('Error checking lab order status:', error);
    return apiErrors.internal('Failed to check lab order status');
  }
}
