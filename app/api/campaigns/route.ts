import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { campaignService } from '@/lib/dal';
import { getDalContextFromSession } from '@/lib/context/industry-context';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/campaigns - List all campaigns
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');

    const campaigns = await campaignService.findMany(ctx, {
      status: status || undefined,
      type: type || undefined,
      include: {
        messages: {
          select: {
            id: true,
            status: true,
            sentAt: true,
            deliveredAt: true,
            openedAt: true,
            clickedAt: true,
          },
        },
        _count: {
          select: {
            messages: true,
            campaignLeads: true,
          },
        },
      },
    });

    return NextResponse.json({ campaigns });
  } catch (error: any) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
}

// POST /api/campaigns - Create new campaign
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const {
      name,
      description,
      type,
      emailSubject,
      emailBody,
      emailHtml,
      smsTemplate,
      voiceAgentId,
      callScript,
      targetAudience,
      scheduledFor,
      frequency,
      recurringDays,
      aiGenerated,
      aiPrompt,
      minLeadScore,
      maxCallsPerDay,
      callWindowStart,
      callWindowEnd,
      retryFailedCalls,
      maxRetries,
    } = body;

    // Validation
    if (!name) {
      return NextResponse.json(
        { error: 'Campaign name is required' },
        { status: 400 }
      );
    }

    if (!type || !['EMAIL', 'SMS', 'VOICE_CALL', 'MULTI_CHANNEL', 'CUSTOM'].includes(type)) {
      return NextResponse.json(
        { error: 'Valid campaign type is required' },
        { status: 400 }
      );
    }

    // Type-specific validation
    if (type === 'EMAIL' || type === 'MULTI_CHANNEL') {
      if (!emailSubject || !emailBody) {
        return NextResponse.json(
          { error: 'Email campaigns require subject and body' },
          { status: 400 }
        );
      }
    }

    if (type === 'SMS' || type === 'MULTI_CHANNEL') {
      if (!smsTemplate) {
        return NextResponse.json(
          { error: 'SMS campaigns require a message template' },
          { status: 400 }
        );
      }
    }

    if (type === 'VOICE_CALL' || type === 'MULTI_CHANNEL') {
      if (!voiceAgentId) {
        return NextResponse.json(
          { error: 'Voice campaigns require a voice agent' },
          { status: 400 }
        );
      }
    }

    const campaign = await campaignService.create(ctx, {
      name,
      description,
      type,
      status: 'DRAFT',
      emailSubject,
      emailBody,
      emailHtml,
      smsTemplate,
      voiceAgentId,
      callScript,
      targetAudience: targetAudience || {},
      scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
      frequency: frequency || 'ONE_TIME',
      recurringDays: recurringDays || [],
      aiGenerated: aiGenerated || false,
      aiPrompt,
      ...(type === 'VOICE_CALL' && {
        minLeadScore: minLeadScore ?? 75,
        maxCallsPerDay: maxCallsPerDay ?? 50,
        callWindowStart: callWindowStart ?? '09:00',
        callWindowEnd: callWindowEnd ?? '17:00',
        retryFailedCalls: retryFailedCalls ?? true,
        maxRetries: maxRetries ?? 2,
      }),
    } as any, {
      _count: {
        select: {
          messages: true,
        },
      },
    });

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating campaign:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create campaign' },
      { status: 500 }
    );
  }
}
