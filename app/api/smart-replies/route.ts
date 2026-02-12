/**
 * GET /api/smart-replies - One-click contextual replies for messages
 * Query: leadId or conversationId (to resolve lead from conversation)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    let leadId = searchParams.get('leadId');
    const conversationId = searchParams.get('conversationId');

    if (!leadId && conversationId) {
      const conv = await prisma.conversation.findFirst({
        where: { id: conversationId, userId: user.id },
        select: { leadId: true },
      });
      leadId = conv?.leadId ?? null;
    }

    const lead = leadId
      ? await prisma.lead.findFirst({
          where: { id: leadId, userId: user.id },
          include: {
            deals: { take: 1, include: { stage: true } },
            notes: { take: 3, orderBy: { createdAt: 'desc' } },
            tasks: {
              where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
              take: 1,
              orderBy: { dueDate: 'asc' },
            },
          },
        })
      : null;

    const baseReplies = [
      { id: 'follow_up', label: 'Follow up', text: 'Hi! Just following up on our conversation. Would love to connect soon.' },
      { id: 'thank_you', label: 'Thank you', text: 'Thank you for your time today. I\'ll be in touch with next steps.' },
      { id: 'meeting', label: 'Schedule meeting', text: 'Would you have 15 minutes this week for a quick call? I\'d love to show you how we can help.' },
      { id: 'documents', label: 'Send documents', text: 'I\'m sending over the materials we discussed. Let me know if you have any questions.' },
      { id: 'check_in', label: 'Check in', text: 'Hi! Wanted to check in and see how things are going. Any questions I can help with?' },
    ];

    const contextReplies: { id: string; label: string; text: string }[] = [];

    if (lead) {
      const openDeal = lead.deals?.[0];
      const lastNote = lead.notes?.[0];
      const nextTask = lead.tasks?.[0];

      if (openDeal?.stage?.name?.toLowerCase().includes('proposal')) {
        contextReplies.push({
          id: 'proposal_followup',
          label: 'Proposal follow-up',
          text: 'Hope you\'ve had a chance to review the proposal. Happy to hop on a call to answer any questions.',
        });
      }
      if (nextTask?.dueDate && new Date(nextTask.dueDate) <= new Date(Date.now() + 24 * 60 * 60 * 1000)) {
        contextReplies.push({
          id: 'task_reminder',
          label: 'Task reminder',
          text: 'Just a friendly reminder about our pending item. Let me know if we need to reschedule.',
        });
      }
      if (lastNote?.content?.toLowerCase().includes('documents') || lastNote?.content?.toLowerCase().includes('materials')) {
        contextReplies.push({
          id: 'docs_ready',
          label: 'Documents ready',
          text: 'The materials we discussed are ready. I\'ll send them over shortly.',
        });
      }
    }

    const replies = [...contextReplies, ...baseReplies].slice(0, 8);

    return NextResponse.json({
      replies,
      leadName: lead?.contactPerson || lead?.businessName,
    });
  } catch (error: any) {
    console.error('Error fetching smart replies:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch smart replies' },
      { status: 500 }
    );
  }
}
