
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET - Get alert settings
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
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
    return apiErrors.internal(error.message || 'Failed to fetch settings');
  }
}

// PUT - Update alert settings
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
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
    return apiErrors.internal(error.message || 'Failed to update settings');
  }
}
