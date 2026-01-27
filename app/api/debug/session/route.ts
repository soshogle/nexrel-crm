import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'No session' }, { status: 401 });
    }

    return NextResponse.json({
      userId: session.user?.id,
      userName: session.user?.name,
      userEmail: session.user?.email,
      userRole: session.user?.role,
      isImpersonating: session.user?.isImpersonating || false,
      superAdminId: session.user?.superAdminId || null,
      superAdminName: session.user?.superAdminName || null,
    });
  } catch (error) {
    console.error('Session debug error:', error);
    return NextResponse.json({ error: 'Failed to get session' }, { status: 500 });
  }
}
