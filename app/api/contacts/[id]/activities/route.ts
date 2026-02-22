import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { leadService, dealService, messageService, getCrmDb } from '@/lib/dal';
import { getDalContextFromSession } from '@/lib/context/industry-context';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contact = await leadService.findUnique(ctx, params.id);
    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Fetch recent activities (callLog not in DAL - use getCrmDb)
    const [messages, calls, deals] = await Promise.all([
      messageService.findMany(ctx, { leadId: params.id }, { take: 10 }),
      getCrmDb(ctx).callLog.findMany({
        where: { leadId: params.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      dealService.findMany(ctx, { leadId: params.id, take: 10 }),
    ]);

    // Combine and format activities
    const activities = [
      ...messages.map((m: any) => ({
        type: 'message',
        title: 'Message Sent',
        description: m.content.substring(0, 100) + (m.content.length > 100 ? '...' : ''),
        createdAt: m.createdAt,
      })),
      ...calls.map((c: any) => ({
        type: 'call',
        title: `Call - ${c.direction}`,
        description: `Duration: ${c.duration || 0}s - Status: ${c.status}`,
        createdAt: c.createdAt,
      })),
      ...deals.map((d: any) => ({
        type: 'deal',
        title: 'Deal Created',
        description: `${d.name} - $${d.value || 0}`,
        createdAt: d.createdAt,
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json(activities.slice(0, 20));
  } catch (error) {
    console.error('Error fetching contact activities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activities' },
      { status: 500 }
    );
  }
}
