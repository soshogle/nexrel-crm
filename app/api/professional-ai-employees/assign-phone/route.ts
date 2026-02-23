/**
 * Assign a Twilio phone number to a Professional AI Employee's ElevenLabs agent
 * POST: Import phone to ElevenLabs and link to the professional agent
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ProfessionalAIEmployeeType } from '@prisma/client';
import { elevenLabsProvisioning } from '@/lib/elevenlabs-provisioning';
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
    const { employeeType, phoneNumber } = body as {
      employeeType?: ProfessionalAIEmployeeType;
      phoneNumber?: string;
    };

    if (!employeeType || !phoneNumber) {
      return apiErrors.badRequest('employeeType and phoneNumber are required');
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

    const formattedPhone = phoneNumber.trim().startsWith('+')
      ? phoneNumber.trim()
      : phoneNumber.replace(/\D/g, '').length === 10
        ? '+1' + phoneNumber.replace(/\D/g, '')
        : '+' + phoneNumber.replace(/\D/g, '');

    const importResult = await elevenLabsProvisioning.importPhoneNumber(
      formattedPhone,
      agent.elevenLabsAgentId,
      session.user.id
    );

    if (!importResult.success) {
      return apiErrors.internal(importResult.error || 'Failed to assign phone to agent');
    }

    await prisma.professionalAIEmployeeAgent.update({
      where: { userId_employeeType: { userId: session.user.id, employeeType } },
      data: { twilioPhoneNumber: formattedPhone, updatedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      message: 'Phone number assigned to agent',
      twilioPhoneNumber: formattedPhone,
    });
  } catch (error: any) {
    console.error('Professional assign-phone error:', error);
    return apiErrors.internal(error.message || 'Failed to assign phone');
  }
}
