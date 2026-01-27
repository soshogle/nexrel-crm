import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';


export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const members = await prisma.teamMember.findMany({
      where: { userId: session.user.id },
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
        const taskCount = await prisma.task.count({
          where: {
            assignedToId: member.id,
            status: { not: 'COMPLETED' },
          },
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

    // Check if member already exists
    const existing = await prisma.teamMember.findFirst({
      where: {
        userId: session.user.id,
        email,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Team member with this email already exists' },
        { status: 400 }
      );
    }

    const member = await prisma.teamMember.create({
      data: {
        userId: session.user.id,
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
