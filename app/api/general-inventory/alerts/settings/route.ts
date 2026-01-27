
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET - Get alert settings
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let settings = await prisma.lowStockAlertSettings.findUnique({
      where: { userId: session.user.id },
    });

    // Create default settings if they don't exist
    if (!settings) {
      settings = await prisma.lowStockAlertSettings.create({
        data: {
          userId: session.user.id,
          enabled: true,
          checkDaily: true,
          alertTime: '09:00',
          sendEmail: true,
          emailAddresses: session.user.email || '',
          sendSMS: false,
          smsNumbers: '',
          alertOnLowStock: true,
          alertOnOutOfStock: true,
          alertOnCritical: true,
        },
      });
    }

    return NextResponse.json({ settings });
  } catch (error: any) {
    console.error('Error fetching alert settings:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

// PUT - Update alert settings
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      enabled,
      checkDaily,
      alertTime,
      sendEmail,
      emailAddresses,
      sendSMS,
      smsNumbers,
      alertOnLowStock,
      alertOnOutOfStock,
      alertOnCritical,
    } = body;

    const settings = await prisma.lowStockAlertSettings.upsert({
      where: { userId: session.user.id },
      update: {
        enabled,
        checkDaily,
        alertTime,
        sendEmail,
        emailAddresses,
        sendSMS,
        smsNumbers,
        alertOnLowStock,
        alertOnOutOfStock,
        alertOnCritical,
      },
      create: {
        userId: session.user.id,
        enabled,
        checkDaily,
        alertTime,
        sendEmail,
        emailAddresses,
        sendSMS,
        smsNumbers,
        alertOnLowStock,
        alertOnOutOfStock,
        alertOnCritical,
      },
    });

    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    console.error('Error updating alert settings:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update settings' },
      { status: 500 }
    );
  }
}
