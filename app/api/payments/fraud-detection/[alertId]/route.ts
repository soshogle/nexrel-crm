
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { alertId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { alertId } = params;
    const body = await request.json();
    const { status } = body;

    // Validate status
    if (!['APPROVED', 'BLOCKED', 'REVIEWED'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status value' },
        { status: 400 }
      );
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
    return NextResponse.json(
      { error: 'Failed to update fraud alert' },
      { status: 500 }
    );
  }
}
