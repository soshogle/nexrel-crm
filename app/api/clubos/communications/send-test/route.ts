
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { clubOSCommunicationService } from '@/lib/clubos-communication-service';
import { apiErrors } from '@/lib/api-error';

// POST /api/clubos/communications/send-test - Send test notification

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const body = await request.json();
    const { type, data } = body;

    if (!type || !data) {
      return apiErrors.badRequest('Missing required fields: type, data');
    }

    // Send test notification based on type
    switch (type) {
      case 'registration':
        await clubOSCommunicationService.sendRegistrationConfirmation(data);
        break;
      case 'payment':
        await clubOSCommunicationService.sendPaymentConfirmation(data);
        break;
      case 'schedule':
        await clubOSCommunicationService.sendScheduleReminder(data);
        break;
      case 'balance':
        await clubOSCommunicationService.sendBalanceReminder(data);
        break;
      default:
        return apiErrors.badRequest('Invalid notification type');
    }

    return NextResponse.json({ 
      success: true,
      message: `${type} notification sent successfully` 
    });
  } catch (error: any) {
    console.error('Error sending test notification:', error);
    return apiErrors.internal(error.message || 'Failed to send notification');
  }
}
