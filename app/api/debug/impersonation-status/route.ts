import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/debug/impersonation-status - Check impersonation session status
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get all sessions for this user
    const allSessions = await prisma.superAdminSession.findMany({
      where: {
        superAdminId: session.user.id,
      },
      orderBy: { startedAt: 'desc' },
      take: 10,
      include: {
        superAdmin: {
          select: { name: true, email: true }
        },
        impersonatedUser: {
          select: { name: true, email: true }
        }
      }
    });

    // Check for active session
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const activeSession = await prisma.superAdminSession.findFirst({
      where: {
        superAdminId: session.user.id,
        isActive: true,
        lastActivity: {
          gte: fifteenMinutesAgo
        }
      },
      include: {
        superAdmin: {
          select: { name: true, email: true }
        },
        impersonatedUser: {
          select: { name: true, email: true }
        }
      }
    });

    return NextResponse.json({
      currentSession: {
        userId: session.user.id,
        userName: session.user.name,
        isImpersonating: session.user.isImpersonating || false,
        superAdminId: session.user.superAdminId,
        superAdminName: session.user.superAdminName,
      },
      activeImpersonationSession: activeSession ? {
        id: activeSession.id,
        sessionToken: activeSession.sessionToken,
        superAdmin: activeSession.superAdmin,
        impersonatedUser: activeSession.impersonatedUser,
        isActive: activeSession.isActive,
        startedAt: activeSession.startedAt,
        lastActivity: activeSession.lastActivity,
      } : null,
      allSessions: allSessions.map(s => ({
        id: s.id,
        superAdmin: s.superAdmin,
        impersonatedUser: s.impersonatedUser,
        isActive: s.isActive,
        startedAt: s.startedAt,
        lastActivity: s.lastActivity,
        endedAt: s.endedAt,
      })),
      localStorage: {
        impersonationToken: request.headers.get('x-impersonation-token'),
        impersonatedUserId: request.headers.get('x-impersonated-user-id'),
      },
      queryTime: new Date().toISOString(),
      fifteenMinutesCutoff: fifteenMinutesAgo.toISOString(),
    });
  } catch (error: any) {
    console.error('Error checking impersonation status:', error);
    return NextResponse.json(
      { error: 'Failed to check impersonation status', details: error.message },
      { status: 500 }
    );
  }
}
