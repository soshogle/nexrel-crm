import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { randomBytes } from 'crypto';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// POST /api/platform-admin/impersonate - Start impersonating a user
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    // Verify user is SUPER_ADMIN
    const superAdmin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (superAdmin?.role !== 'SUPER_ADMIN') {
      return apiErrors.forbidden('Forbidden: SUPER_ADMIN access required');
    }

    const body = await request.json();
    const { targetUserId } = body;

    if (!targetUserId) {
      return apiErrors.badRequest('Target user ID required');
    }

    // Verify target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!targetUser) {
      return apiErrors.notFound('Target user not found');
    }

    // Prevent impersonating another super admin
    if (targetUser.role === 'SUPER_ADMIN') {
      return apiErrors.forbidden('Cannot impersonate another SUPER_ADMIN');
    }

    // Check if there's an active impersonation session for this target user
    const activeSession = await prisma.superAdminSession.findFirst({
      where: {
        superAdminId: session.user.id,
        impersonatedUserId: targetUserId,
        isActive: true,
        endedAt: null,
      },
    });

    if (activeSession) {
      // Return existing session
      return NextResponse.json({
        success: true,
        sessionToken: activeSession.sessionToken,
        impersonatedUser: targetUser,
      });
    }

    // Create new impersonation session
    const sessionToken = randomBytes(32).toString('hex');
    const ipAddress = request.ip || request.headers.get('x-forwarded-for') || undefined;
    const userAgent = request.headers.get('user-agent') || undefined;

    console.log('📝 Creating impersonation session:', {
      superAdminId: session.user.id,
      impersonatedUserId: targetUserId,
      targetUserName: targetUser.name,
    });

    const impersonationSession = await prisma.superAdminSession.create({
      data: {
        superAdminId: session.user.id,
        impersonatedUserId: targetUserId,
        sessionToken,
        ipAddress,
        userAgent,
        isActive: true,
      },
    });

    console.log('✅ Impersonation session created successfully:', {
      id: impersonationSession.id,
      sessionToken: impersonationSession.sessionToken,
      superAdminId: impersonationSession.superAdminId,
      impersonatedUserId: impersonationSession.impersonatedUserId,
      isActive: impersonationSession.isActive,
      startedAt: impersonationSession.startedAt.toISOString(),
      lastActivity: impersonationSession.lastActivity.toISOString(),
    });
    
    // Verify the session was actually created by querying it back
    const verifySession = await prisma.superAdminSession.findUnique({
      where: { id: impersonationSession.id },
    });
    
    console.log('🔍 Verification query result:', {
      found: !!verifySession,
      isActive: verifySession?.isActive,
      lastActivity: verifySession?.lastActivity?.toISOString(),
    });

    return NextResponse.json({
      success: true,
      sessionToken: impersonationSession.sessionToken,
      impersonatedUser: targetUser,
    });
  } catch (error: any) {
    console.error('Error starting impersonation:', error);
    return apiErrors.internal(error.message || 'Failed to start impersonation');
  }
}

// DELETE /api/platform-admin/impersonate - End impersonation session
export async function DELETE(request: NextRequest) {
  try {
    console.log('📡 DELETE /api/platform-admin/impersonate called');
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.error('❌ No session found');
      return apiErrors.unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const sessionToken = searchParams.get('sessionToken');

    console.log('🔍 Session token:', sessionToken);

    if (!sessionToken) {
      console.error('❌ No session token provided');
      return apiErrors.badRequest('Session token required');
    }

    // Find and end the impersonation session
    const impersonationSession = await prisma.superAdminSession.findUnique({
      where: { sessionToken },
    });

    console.log('🔍 Impersonation session found:', {
      found: !!impersonationSession,
      isActive: impersonationSession?.isActive,
      superAdminId: impersonationSession?.superAdminId,
      impersonatedUserId: impersonationSession?.impersonatedUserId,
    });

    if (!impersonationSession) {
      console.error('❌ Session not found in database');
      return apiErrors.notFound('Session not found');
    }

    // Verify the session belongs to the current super admin
    // If impersonating, use superAdminId, otherwise use the regular id
    const actualSuperAdminId = (session.user as any).superAdminId || session.user.id;
    
    console.log('🔍 Verifying ownership:', {
      impersonationSessionSuperAdminId: impersonationSession.superAdminId,
      actualSuperAdminId,
      sessionUserId: session.user.id,
      sessionSuperAdminId: (session.user as any).superAdminId,
    });
    
    if (impersonationSession.superAdminId !== actualSuperAdminId) {
      console.error('❌ Session does not belong to current super admin');
      return apiErrors.forbidden('Forbidden: Not your session');
    }

    // End the session
    console.log('💾 Marking session as inactive');
    await prisma.superAdminSession.update({
      where: { sessionToken },
      data: {
        isActive: false,
        endedAt: new Date(),
      },
    });

    console.log('✅ Successfully ended impersonation session');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ Error ending impersonation:', error);
    return apiErrors.internal(error.message || 'Failed to end impersonation');
  }
}

// GET /api/platform-admin/impersonate - Check active impersonation session
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const sessionToken = searchParams.get('sessionToken');

    if (!sessionToken) {
      return NextResponse.json(
        { isActive: false, impersonatedUser: null },
        { status: 200 }
      );
    }

    // Find the impersonation session
    const impersonationSession = await prisma.superAdminSession.findUnique({
      where: { sessionToken },
      include: {
        impersonatedUser: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    if (
      !impersonationSession ||
      !impersonationSession.isActive ||
      impersonationSession.endedAt
    ) {
      return NextResponse.json(
        { isActive: false, impersonatedUser: null },
        { status: 200 }
      );
    }

    // Update last activity
    await prisma.superAdminSession.update({
      where: { sessionToken },
      data: { lastActivity: new Date() },
    });

    return NextResponse.json({
      isActive: true,
      impersonatedUser: impersonationSession.impersonatedUser,
      startedAt: impersonationSession.startedAt,
    });
  } catch (error: any) {
    console.error('Error checking impersonation session:', error);
    return apiErrors.internal(error.message || 'Failed to check session');
  }
}
