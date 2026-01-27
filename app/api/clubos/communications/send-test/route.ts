
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { clubOSCommunicationService } from '@/lib/clubos-communication-service';

// POST /api/clubos/communications/send-test - Send test notification
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, data } = body;

    if (!type || !data) {
      return NextResponse.json(
        { error: 'Missing required fields: type, data' },
        { status: 400 }
      );
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
        return NextResponse.json({ error: 'Invalid notification type' }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true,
      message: `${type} notification sent successfully` 
    });
  } catch (error: any) {
    console.error('Error sending test notification:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send notification' },
      { status: 500 }
    );
  }
}
