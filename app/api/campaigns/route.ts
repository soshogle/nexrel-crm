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

    return paginatedResponse(campaigns, total, pagination, 'campaigns');
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

    const rawBody = await request.json().catch(() => null);
    if (!rawBody || typeof rawBody !== 'object') {
      return apiErrors.badRequest('Request body must be valid JSON');
    }
    const body = rawBody as Record<string, unknown>;

    const name = typeof body.name === 'string' ? body.name : undefined;
    const description = typeof body.description === 'string' ? body.description : undefined;
    const type = typeof body.type === 'string' ? body.type : undefined;
    const emailSubject = typeof body.emailSubject === 'string' ? body.emailSubject : undefined;
    const emailBody = typeof body.emailBody === 'string' ? body.emailBody : undefined;
    const emailHtml = typeof body.emailHtml === 'string' ? body.emailHtml : undefined;
    const smsTemplate = typeof body.smsTemplate === 'string' ? body.smsTemplate : undefined;
    const voiceAgentId = typeof body.voiceAgentId === 'string' ? body.voiceAgentId : undefined;
    const callScript = typeof body.callScript === 'string' ? body.callScript : undefined;
    const targetAudience = (body.targetAudience && typeof body.targetAudience === 'object' ? body.targetAudience : {}) as Record<string, unknown>;
    const scheduledFor = typeof body.scheduledFor === 'string' ? body.scheduledFor : undefined;
    const frequency = typeof body.frequency === 'string' ? body.frequency : 'ONE_TIME';
    const recurringDays = Array.isArray(body.recurringDays) ? body.recurringDays : [];
    const aiGenerated = typeof body.aiGenerated === 'boolean' ? body.aiGenerated : false;
    const aiPrompt = typeof body.aiPrompt === 'string' ? body.aiPrompt : undefined;
    const minLeadScore = typeof body.minLeadScore === 'number' ? body.minLeadScore : 75;
    const maxCallsPerDay = typeof body.maxCallsPerDay === 'number' ? body.maxCallsPerDay : 50;
    const callWindowStart = typeof body.callWindowStart === 'string' ? body.callWindowStart : '09:00';
    const callWindowEnd = typeof body.callWindowEnd === 'string' ? body.callWindowEnd : '17:00';
    const retryFailedCalls = typeof body.retryFailedCalls === 'boolean' ? body.retryFailedCalls : true;
    const maxRetries = typeof body.maxRetries === 'number' ? body.maxRetries : 2;

    // Validation
    if (!name || name.length > 255) {
      return apiErrors.badRequest('Campaign name is required (max 255 characters)');
    }

    if (!type || !(['EMAIL', 'SMS', 'VOICE_CALL', 'MULTI_CHANNEL', 'CUSTOM'] as string[]).includes(type)) {
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
      targetAudience,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
      frequency,
      recurringDays,
      aiGenerated,
      aiPrompt,
      ...(type === 'VOICE_CALL' && {
        minLeadScore,
        maxCallsPerDay,
        callWindowStart,
        callWindowEnd,
        retryFailedCalls,
        maxRetries,
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
    console.error('Error creating campaign:', error.message);
    return apiErrors.internal('Failed to create campaign');
  }
}
