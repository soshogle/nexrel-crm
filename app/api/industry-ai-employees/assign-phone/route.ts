/**
 * Assign a Twilio phone number to an Industry AI Employee's ElevenLabs agent
 * POST: Import phone to ElevenLabs and link to the industry agent
 * Same setup as Voice Agents and Professional AI Employees.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Industry } from '@prisma/client';
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
    const { industry, employeeType, phoneNumber } = body as {
      industry?: Industry;
      employeeType?: string;
      phoneNumber?: string;
    };

    if (!industry || !employeeType || !phoneNumber) {
      return apiErrors.badRequest('industry, employeeType, and phoneNumber are required');
    }

    const agent = await prisma.industryAIEmployeeAgent.findUnique({
      where: {
        userId_industry_employeeType: {
          userId: session.user.id,
          industry,
          employeeType,
        },
      },
    });

    if (!agent) {
      return apiErrors.notFound('Industry AI agent not provisioned. Please provision this agent first.');
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

    await prisma.industryAIEmployeeAgent.update({
      where: {
        userId_industry_employeeType: {
          userId: session.user.id,
          industry,
          employeeType,
        },
      },
      data: { twilioPhoneNumber: formattedPhone, updatedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      message: 'Phone number assigned to agent',
      twilioPhoneNumber: formattedPhone,
    });
  } catch (error: any) {
    console.error('Industry assign-phone error:', error);
    return apiErrors.internal(error.message || 'Failed to assign phone');
  }
}
