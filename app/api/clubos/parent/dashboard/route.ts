
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { addDays } from 'date-fns';

// GET /api/clubos/parent/dashboard - Get parent dashboard data

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get household for the user
    let household = await prisma.clubOSHousehold.findUnique({
      where: { userId: session.user.id },
      include: {
        members: {
          include: {
            registrations: {
              where: {
                status: { in: ['PENDING', 'APPROVED', 'ACTIVE'] },
              },
              include: {
                program: {
                  select: {
                    name: true,
                    startDate: true,
                    endDate: true,
                  },
                },
                division: {
                  select: {
                    name: true,
                  },
                },
              },
              orderBy: { createdAt: 'desc' },
            },
          },
          orderBy: { firstName: 'asc' },
        },
      },
    });

    // If no household exists, check if user is actually a parent
    if (!household) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
      });

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // ONLY create household for actual parents, not business owners
      if (user.parentRole || user.role === 'PARENT') {
        // For standalone parents without a club owner, they need to sign up via a club code
        return NextResponse.json(
          { 
            error: 'No sports club found. Please sign up using a club code provided by your organization.',
            noClub: true
          },
          { status: 404 }
        );
      } else {
        // Business owners should not access the parent dashboard
        return NextResponse.json(
          { error: 'This dashboard is for parents only. Business owners should use the main dashboard.' },
          { status: 403 }
        );
      }
    }

    // Calculate totals
    let totalBalance = 0;
    let activeRegistrations = 0;
    let pendingRegistrations = 0;

    household.members.forEach((member) => {
      member.registrations.forEach((reg) => {
        totalBalance += reg.balanceDue;
        if (reg.status === 'ACTIVE') {
          activeRegistrations++;
        } else if (reg.status === 'PENDING') {
          pendingRegistrations++;
        }
      });
    });

    // Get upcoming schedules for all registered teams
    const today = new Date();
    const nextMonth = addDays(today, 30);

    // Get all teams for the member's registrations
    const memberIds = household.members.map((m) => m.id);
    const teamMemberships = await prisma.clubOSTeamMember.findMany({
      where: {
        memberId: { in: memberIds },
      },
      select: {
        teamId: true,
      },
    });

    const teamIds = [...new Set(teamMemberships.map((tm) => tm.teamId))];

    // Get schedules where any of these teams are involved
    // CRITICAL FIX: Use clubOwnerId (business owner) for schedules, not parent's userId
    let upcomingSchedules: any[] = [];
    
    if (household.clubOwnerId) {
      upcomingSchedules = await prisma.clubOSSchedule.findMany({
        where: {
          userId: household.clubOwnerId, // ✅ Use club owner's ID, not parent's
          startTime: {
            gte: today,
            lte: nextMonth,
          },
          status: 'SCHEDULED',
          OR: [
            { homeTeamId: { in: teamIds } },
            { awayTeamId: { in: teamIds } },
            { practiceTeamId: { in: teamIds } },
          ],
        },
      include: {
        venue: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { startTime: 'asc' },
      take: 10,
      });
    }

    return NextResponse.json({
      household,
      upcomingSchedules,
      totalBalance,
      activeRegistrations,
      pendingRegistrations,
    });
  } catch (error: any) {
    console.error('Error fetching parent dashboard:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
