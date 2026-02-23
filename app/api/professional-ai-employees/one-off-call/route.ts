/**
 * One-off call with Professional AI Employee
 * POST: Initiate an immediate call to a contact using a provisioned professional agent
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { elevenLabsService } from '@/lib/elevenlabs';
import { ProfessionalAIEmployeeType } from '@prisma/client';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const body = await request.json().catch(() => ({}));
    const { employeeType, contactName, contactPhone } = body as {
      employeeType?: ProfessionalAIEmployeeType;
      contactName?: string;
      contactPhone?: string;
    };

    if (!employeeType || !contactName || !contactPhone) {
      return apiErrors.badRequest('employeeType, contactName, and contactPhone are required');
    }

    const agent = await prisma.professionalAIEmployeeAgent.findUnique({
      where: {
        userId_employeeType: { userId: session.user.id, employeeType },
      },
    });

    if (!agent) {
      return apiErrors.notFound('Professional AI agent not provisioned. Please provision this agent first.');
    }

    if (!agent.elevenLabsAgentId) {
      return apiErrors.badRequest('Agent is not fully configured for voice calls.');
    }

    let formattedPhone = contactPhone.trim().replace(/\D/g, '');
    if (formattedPhone.length === 10) {
      formattedPhone = '+1' + formattedPhone;
    } else if (formattedPhone.length === 11 && formattedPhone.startsWith('1')) {
      formattedPhone = '+' + formattedPhone;
    } else if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+' + formattedPhone;
    }

    const callResult = await elevenLabsService.initiatePhoneCall(
      agent.elevenLabsAgentId,
      formattedPhone
    );

    return NextResponse.json({
      success: true,
      callId: callResult.call_id,
      message: `Call to ${contactName} initiated. They should receive the call shortly.`,
    });
  } catch (error: any) {
    console.error('Professional one-off call error:', error);
    return apiErrors.internal(error.message || 'Failed to initiate call');
  }
}
