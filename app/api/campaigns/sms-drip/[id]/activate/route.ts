import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { apiErrors } from '@/lib/api-error';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return apiErrors.unauthorized();
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return apiErrors.notFound('User not found');
    }

    const { id } = await params;

    await prisma.smsCampaign.updateMany({
      where: {
        id,
        userId: user.id,
      },
      data: {
        status: 'ACTIVE' as any,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error activating campaign:', error);
    return apiErrors.internal('Failed to activate campaign');
  }
}
