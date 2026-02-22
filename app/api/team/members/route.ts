import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCrmDb } from '@/lib/dal';
import { getDalContextFromSession } from '@/lib/context/industry-context';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const members = await getCrmDb(ctx).teamMember.findMany({
      where: { userId: ctx.userId },
      include: {
        _count: {
          select: {
            assignedDeals: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get task counts for each member
    const membersWithTaskCounts = await Promise.all(
      members.map(async (member) => {
        const taskCount = await getCrmDb(ctx).task.count({
          where: { assignedToId: member.id, status: { not: 'COMPLETED' } },
        });

        return {
          ...member,
          _count: {
            ...member._count,
            assignedTasks: taskCount,
          },
        };
      })
    );

    return NextResponse.json(membersWithTaskCounts);
  } catch (error: unknown) {
    console.error('Error fetching team members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team members' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { email, name, role, phone, permissions } = body;

    const ctx = getDalContextFromSession(session);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Check if member already exists
    const existing = await getCrmDb(ctx).teamMember.findFirst({
      where: {
        userId: ctx.userId,
        email,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Team member with this email already exists' },
        { status: 400 }
      );
    }

    const member = await getCrmDb(ctx).teamMember.create({
      data: {
        userId: ctx.userId,
        email,
        name,
        role: role || 'AGENT',
        phone,
        permissions,
        status: 'INVITED',
      },
    });

    // In a real implementation, this would send an invitation email

    return NextResponse.json(member, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating team member:', error);
    return NextResponse.json(
      { error: 'Failed to create team member' },
      { status: 500 }
    );
  }
}
