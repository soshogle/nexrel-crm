import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return apiErrors.unauthorized('No session');
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
    return apiErrors.internal('Failed to get session');
  }
}
