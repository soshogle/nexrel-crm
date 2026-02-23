
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { apiErrors } from '@/lib/api-error';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { alertId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const { alertId } = params;
    const body = await request.json();
    const { status } = body;

    // Validate status
    if (!['APPROVED', 'BLOCKED', 'REVIEWED'].includes(status)) {
      return apiErrors.badRequest('Invalid status value');
    }

    // In production, this would update the fraud alert in the database
    // For demo purposes, we just return success
    console.log(`Alert ${alertId} updated to status: ${status}`);

    return NextResponse.json({
      success: true,
      message: `Alert ${alertId} has been ${status.toLowerCase()}`,
    });
  } catch (error) {
    console.error('Error updating fraud alert:', error);
    return apiErrors.internal('Failed to update fraud alert');
  }
}
