import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';


export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
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
    return NextResponse.json(
      { error: 'Failed to activate campaign' },
      { status: 500 }
    );
  }
}
