import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { campaignService } from '@/lib/dal';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { apiErrors } from '@/lib/api-error';
import { parsePagination, paginatedResponse } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/campaigns - List all campaigns
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const pagination = parsePagination(request);

    const [campaigns, total] = await Promise.all([
      campaignService.findMany(ctx, {
        status: status || undefined,
        type: type || undefined,
        take: pagination.take,
        skip: pagination.skip,
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
      }),
      campaignService.count(ctx, {
        ...(status ? { status: status as any } : {}),
        ...(type ? { type: type as any } : {}),
      }),
    ]);

    return paginatedResponse(campaigns, total, pagination);
  } catch (error: any) {
    console.error('Error fetching campaigns:', error);
    return apiErrors.internal(error.message || 'Failed to fetch campaigns');
  }
}

// POST /api/campaigns - Create new campaign
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();

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
      return apiErrors.badRequest('Campaign name is required');
    }

    if (!type || !['EMAIL', 'SMS', 'VOICE_CALL', 'MULTI_CHANNEL', 'CUSTOM'].includes(type)) {
      return apiErrors.badRequest('Valid campaign type is required');
    }

    // Type-specific validation
    if (type === 'EMAIL' || type === 'MULTI_CHANNEL') {
      if (!emailSubject || !emailBody) {
        return apiErrors.badRequest('Email campaigns require subject and body');
      }
    }

    if (type === 'SMS' || type === 'MULTI_CHANNEL') {
      if (!smsTemplate) {
        return apiErrors.badRequest('SMS campaigns require a message template');
      }
    }

    if (type === 'VOICE_CALL' || type === 'MULTI_CHANNEL') {
      if (!voiceAgentId) {
        return apiErrors.badRequest('Voice campaigns require a voice agent');
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
    return apiErrors.internal(error.message || 'Failed to create campaign');
  }
}
