/**
 * Assign a Twilio phone number to a Real Estate AI Employee's ElevenLabs agent
 * POST: Import phone to ElevenLabs and link to the RE agent
 * Same setup as Voice Agents and Professional AI Employees.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { REAIEmployeeType } from '@prisma/client';
import { elevenLabsProvisioning } from '@/lib/elevenlabs-provisioning';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { employeeType, phoneNumber } = body as {
      employeeType?: REAIEmployeeType;
      phoneNumber?: string;
    };

    if (!employeeType || !phoneNumber) {
      return NextResponse.json(
        { error: 'employeeType and phoneNumber are required' },
        { status: 400 }
      );
    }

    const agent = await prisma.rEAIEmployeeAgent.findUnique({
      where: {
        userId_employeeType: { userId: session.user.id, employeeType },
      },
    });

    if (!agent) {
      return NextResponse.json(
        { error: 'RE AI agent not provisioned. Please provision this agent first.' },
        { status: 404 }
      );
    }

    if (!agent.elevenLabsAgentId) {
      return NextResponse.json(
        { error: 'Agent is not fully configured for voice calls.' },
        { status: 400 }
      );
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
      return NextResponse.json(
        { error: importResult.error || 'Failed to assign phone to agent' },
        { status: 500 }
      );
    }

    await prisma.rEAIEmployeeAgent.update({
      where: { userId_employeeType: { userId: session.user.id, employeeType } },
      data: { twilioPhoneNumber: formattedPhone, updatedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      message: 'Phone number assigned to agent',
      twilioPhoneNumber: formattedPhone,
    });
  } catch (error: any) {
    console.error('RE assign-phone error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to assign phone' },
      { status: 500 }
    );
  }
}
