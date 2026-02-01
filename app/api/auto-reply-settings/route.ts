
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET auto-reply settings

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
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let settings = await prisma.autoReplySettings.findUnique({
      where: { userId: user.id },
    });

    // Create default settings if none exist
    if (!settings) {
      settings = await prisma.autoReplySettings.create({
        data: {
          userId: user.id,
          isEnabled: false,
          responseTone: 'professional',
          responseLanguage: 'en',
          businessHoursEnabled: true,
          businessHoursStart: '09:00',
          businessHoursEnd: '17:00',
          businessDays: JSON.stringify(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']),
          timezone: 'America/New_York',
          maxResponseLength: 500,
          confidenceThreshold: 0.7,
          useConversationHistory: true,
          historyDepth: 10,
          notifyOnEscalation: true,
        },
      });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Failed to fetch auto-reply settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch auto-reply settings' },
      { status: 500 }
    );
  }
}

// PATCH update auto-reply settings
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();

    // Ensure settings exist
    let settings = await prisma.autoReplySettings.findUnique({
      where: { userId: user.id },
    });

    if (!settings) {
      // Create with defaults
      settings = await prisma.autoReplySettings.create({
        data: {
          userId: user.id,
          ...body,
          businessDays: body.businessDays ? JSON.stringify(body.businessDays) : undefined,
          escalationKeywords: body.escalationKeywords ? JSON.stringify(body.escalationKeywords) : undefined,
          escalationTopics: body.escalationTopics ? JSON.stringify(body.escalationTopics) : undefined,
          channelSettings: body.channelSettings || undefined,
        },
      });
    } else {
      // Update existing
      settings = await prisma.autoReplySettings.update({
        where: { userId: user.id },
        data: {
          ...body,
          businessDays: body.businessDays ? JSON.stringify(body.businessDays) : undefined,
          escalationKeywords: body.escalationKeywords ? JSON.stringify(body.escalationKeywords) : undefined,
          escalationTopics: body.escalationTopics ? JSON.stringify(body.escalationTopics) : undefined,
          channelSettings: body.channelSettings || undefined,
        },
      });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Failed to update auto-reply settings:', error);
    return NextResponse.json(
      { error: 'Failed to update auto-reply settings' },
      { status: 500 }
    );
  }
}
