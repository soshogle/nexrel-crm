import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/widget/config - Get widget configuration for current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate widget ID based on user ID
    const widgetId = `widget-${session.user.id}`;

    // Get the base URL from request or environment
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const host = request.headers.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;

    return NextResponse.json({
      userId: session.user.id,
      widgetId,
      baseUrl,
    });
  } catch (error: any) {
    console.error('❌ Widget config error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get widget config' },
      { status: 500 }
    );
  }
}
