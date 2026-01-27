export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get recent FSBO leads
    const recentLeads = await prisma.rEFSBOListing.findMany({
      where: { assignedUserId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        address: true,
        city: true,
        source: true,
        createdAt: true,
      }
    });

    // Combine into activities
    const activities = recentLeads.map(lead => ({
      id: `lead-${lead.id}`,
      type: 'lead',
      message: `New FSBO lead: ${lead.address}, ${lead.city}`,
      time: formatTimeAgo(lead.createdAt),
      icon: 'Target'
    }));

    return NextResponse.json({ activities });
  } catch (error) {
    console.error('Activity API error:', error);
    return NextResponse.json({ activities: [] });
  }
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hr ago`;
  return `${days} day${days > 1 ? 's' : ''} ago`;
}
