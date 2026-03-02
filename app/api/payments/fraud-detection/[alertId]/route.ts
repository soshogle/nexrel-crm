
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
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

    const isOrthoDemo = String(session.user.email || '').toLowerCase().trim() === 'orthodontist@nexrel.com';
    if (isOrthoDemo) {
      return NextResponse.json({
        success: true,
        message: `Alert ${alertId} has been ${status.toLowerCase()}`,
      });
    }

    const dbStatus =
      status === 'APPROVED'
        ? 'APPROVED'
        : status === 'BLOCKED'
          ? 'DECLINED'
          : 'RESOLVED';

    const updated = await prisma.fraudAlert.updateMany({
      where: {
        id: alertId,
        userId: session.user.id,
      },
      data: {
        status: dbStatus as any,
        reviewedAt: new Date(),
        reviewedBy: session.user.id,
        actionTaken: status,
      },
    });

    if (updated.count === 0) {
      return apiErrors.notFound('Fraud alert not found');
    }

    return NextResponse.json({
      success: true,
      message: `Alert ${alertId} has been ${status.toLowerCase()}`,
    });
  } catch (error) {
    console.error('Error updating fraud alert:', error);
    return apiErrors.internal('Failed to update fraud alert');
  }
}
