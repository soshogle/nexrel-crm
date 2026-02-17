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

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { employeeType, contactName, contactPhone } = body as {
      employeeType?: ProfessionalAIEmployeeType;
      contactName?: string;
      contactPhone?: string;
    };

    if (!employeeType || !contactName || !contactPhone) {
      return NextResponse.json(
        { error: 'employeeType, contactName, and contactPhone are required' },
        { status: 400 }
      );
    }

    const agent = await prisma.professionalAIEmployeeAgent.findUnique({
      where: {
        userId_employeeType: { userId: session.user.id, employeeType },
      },
    });

    if (!agent) {
      return NextResponse.json(
        { error: 'Professional AI agent not provisioned. Please provision this agent first.' },
        { status: 404 }
      );
    }

    if (!agent.elevenLabsAgentId) {
      return NextResponse.json(
        { error: 'Agent is not fully configured for voice calls.' },
        { status: 400 }
      );
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
    return NextResponse.json(
      { error: error.message || 'Failed to initiate call' },
      { status: 500 }
    );
  }
}
