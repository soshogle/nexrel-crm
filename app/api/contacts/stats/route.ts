import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { leadService } from '@/lib/dal';
import { getDalContextFromSession } from '@/lib/context/industry-context';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const ctx = getDalContextFromSession(session);

    // Debug logging
    console.log('=== CONTACTS STATS API DEBUG ===');
    console.log('Session:', session ? 'exists' : 'null');
    console.log('Session.user.id:', session?.user?.id);
    console.log('Session.user.email:', session?.user?.email);

    if (!ctx) {
      console.log('ERROR: No user ID in session for stats - returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    console.log('Fetching stats for userId:', ctx.userId);

    const [
      total,
      newThisMonth,
      customers,
      prospects,
      partners,
      totalWithActivity,
    ] = await Promise.all([
      leadService.count(ctx),
      leadService.count(ctx, {
        createdAt: {
          gte: firstDayOfMonth,
        },
      }),
      leadService.count(ctx, { contactType: 'customer' }),
      leadService.count(ctx, { contactType: 'prospect' }),
      leadService.count(ctx, { contactType: 'partner' }),
      leadService.count(ctx, {
        lastContactedAt: {
          not: null,
        },
      }),
    ]);

    const engagementRate = total > 0 ? Math.round((totalWithActivity / total) * 100) : 0;

    console.log('Stats results - Total:', total, 'New this month:', newThisMonth);
    
    return NextResponse.json({
      total,
      newThisMonth,
      customers,
      prospects,
      partners,
      engagementRate,
    });
  } catch (error) {
    console.error('Error fetching contact stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
