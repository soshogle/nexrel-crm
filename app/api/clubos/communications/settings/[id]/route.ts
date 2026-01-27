
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/clubos/communications/settings/[id] - Get specific notification setting

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const setting = await prisma.clubOSNotificationSetting.findUnique({
      where: { id: params.id },
    });

    if (!setting) {
      return NextResponse.json({ error: 'Setting not found' }, { status: 404 });
    }

    // Verify ownership
    if (setting.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json({ setting });
  } catch (error: any) {
    console.error('Error fetching notification setting:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch setting' },
      { status: 500 }
    );
  }
}

// PUT /api/clubos/communications/settings/[id] - Update notification setting
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      enabled,
      sendEmail,
      sendSMS,
      reminderHoursBefore,
      reminderDaysInterval,
      emailSubject,
      emailBody,
      smsTemplate,
    } = body;

    // Verify ownership
    const existingSetting = await prisma.clubOSNotificationSetting.findUnique({
      where: { id: params.id },
    });

    if (!existingSetting) {
      return NextResponse.json({ error: 'Setting not found' }, { status: 404 });
    }

    if (existingSetting.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Update setting
    const setting = await prisma.clubOSNotificationSetting.update({
      where: { id: params.id },
      data: {
        enabled,
        sendEmail,
        sendSMS,
        reminderHoursBefore,
        reminderDaysInterval,
        emailSubject,
        emailBody,
        smsTemplate,
      },
    });

    return NextResponse.json({ setting });
  } catch (error: any) {
    console.error('Error updating notification setting:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update setting' },
      { status: 500 }
    );
  }
}
