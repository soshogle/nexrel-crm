import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * POST /api/platform-admin/impersonate/end-all
 * Ends ALL active impersonation sessions for the current super admin
 * Used as a fallback when sessionToken is not available
 */
export async function POST(request: NextRequest) {
  try {
    console.log('📡 POST /api/platform-admin/impersonate/end-all called');
    
    // Get the current session
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      console.error('❌ No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // If impersonating, use superAdminId, otherwise use the regular id
    const actualSuperAdminId = (session.user as any).superAdminId || session.user.id;
    
    console.log('👤 Ending sessions for super admin:', {
      actualSuperAdminId,
      sessionUserId: session.user.id,
      isImpersonating: (session.user as any).isImpersonating,
    });
    
    // End ALL active impersonation sessions for this super admin
    const result = await prisma.superAdminSession.updateMany({
      where: {
        superAdminId: actualSuperAdminId,
        isActive: true
      },
      data: {
        isActive: false,
        endedAt: new Date()
      }
    });
    
    console.log(`✅ Ended ${result.count} active impersonation session(s) for super admin:`, actualSuperAdminId);
    
    return NextResponse.json({ 
      success: true, 
      message: `Ended ${result.count} impersonation session(s)`,
      count: result.count 
    });
  } catch (error: any) {
    console.error('❌ Error ending all impersonation sessions:', error);
    return NextResponse.json(
      { error: 'Failed to end impersonation sessions', details: error.message },
      { status: 500 }
    );
  }
}
