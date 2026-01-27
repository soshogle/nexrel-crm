
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // Debug logging
    console.log('=== CONTACTS STATS API DEBUG ===');
    console.log('Session:', session ? 'exists' : 'null');
    console.log('Session.user.id:', session?.user?.id);
    console.log('Session.user.email:', session?.user?.email);
    
    if (!session?.user?.id) {
      console.log('ERROR: No user ID in session for stats - returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    console.log('Fetching stats for userId:', session.user.id);

    const [
      total,
      newThisMonth,
      customers,
      prospects,
      partners,
      totalWithActivity,
    ] = await Promise.all([
      prisma.lead.count({
        where: { userId: session.user.id },
      }),
      prisma.lead.count({
        where: {
          userId: session.user.id,
          createdAt: {
            gte: firstDayOfMonth,
          },
        },
      }),
      prisma.lead.count({
        where: {
          userId: session.user.id,
          contactType: 'customer',
        },
      }),
      prisma.lead.count({
        where: {
          userId: session.user.id,
          contactType: 'prospect',
        },
      }),
      prisma.lead.count({
        where: {
          userId: session.user.id,
          contactType: 'partner',
        },
      }),
      prisma.lead.count({
        where: {
          userId: session.user.id,
          lastContactedAt: {
            not: null,
          },
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
