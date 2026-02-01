
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/clubos/communications/settings - Get all notification settings

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all notification settings for the user
    let settings = await prisma.clubOSNotificationSetting.findMany({
      where: { userId: session.user.id },
      orderBy: { notificationType: 'asc' },
    });

    // If no settings exist, initialize default settings
    if (settings.length === 0) {
      settings = await initializeDefaultSettings(session.user.id);
    }

    return NextResponse.json({ settings });
  } catch (error: any) {
    console.error('Error fetching notification settings:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

// POST /api/clubos/communications/settings - Initialize default settings
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await initializeDefaultSettings(session.user.id);

    return NextResponse.json({ settings });
  } catch (error: any) {
    console.error('Error initializing notification settings:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initialize settings' },
      { status: 500 }
    );
  }
}

// Helper function to initialize default settings
async function initializeDefaultSettings(userId: string) {
  const defaultSettings = [
    {
      notificationType: 'REGISTRATION_CONFIRMATION',
      enabled: true,
      sendEmail: true,
      sendSMS: true,
      emailSubject: 'Registration Confirmed - {programName}',
      emailBody: `Hi {parentName},

Thank you for registering {childName} for {programName}!

Your registration has been received and is being processed. You will receive a confirmation email once approved.

Registration Details:
- Program: {programName}
- Division: {divisionName}
- Total Amount: {totalAmount}
- Amount Paid: {amountPaid}
- Balance Due: {balanceDue}

If you have any questions, please don't hesitate to contact us.

Best regards,
{businessName}`,
      smsTemplate: 'Registration confirmed for {childName} in {programName}. Balance due: {balanceDue}. Thank you!',
    },
    {
      notificationType: 'PAYMENT_CONFIRMATION',
      enabled: true,
      sendEmail: true,
      sendSMS: true,
      emailSubject: 'Payment Received - {programName}',
      emailBody: `Hi {parentName},

We have received your payment for {childName}'s registration.

Payment Details:
- Amount Paid: {amount}
- Payment Date: {paidDate}
- Payment Method: {paymentMethod}
- Receipt: {receiptUrl}

Registration Balance:
- Total Amount: {totalAmount}
- Amount Paid: {amountPaid}
- Remaining Balance: {balanceRemaining}

Thank you for your payment!

Best regards,
{businessName}`,
      smsTemplate: 'Payment of {amount} received for {childName}. Receipt: {receiptUrl}. Thank you!',
    },
    {
      notificationType: 'SCHEDULE_UPDATE',
      enabled: false,
      sendEmail: true,
      sendSMS: false,
      emailSubject: 'Schedule Update - {eventTitle}',
      emailBody: `Hi {parentName},

We wanted to let you know about a schedule update for your child's upcoming event.

Event Details:
- Event: {eventTitle}
- Type: {eventType}
- Date: {eventDate}
- Time: {eventTime}
- Venue: {venueName}
- Address: {venueAddress}

Please make note of this update.

Best regards,
{businessName}`,
      smsTemplate: 'Schedule update: {eventTitle} on {eventDate} at {eventTime}. Venue: {venueName}.',
    },
    {
      notificationType: 'SCHEDULE_REMINDER',
      enabled: true,
      sendEmail: true,
      sendSMS: true,
      reminderHoursBefore: 24,
      emailSubject: 'Reminder: {eventTitle} Tomorrow',
      emailBody: `Hi {parentName},

This is a friendly reminder about tomorrow's event.

Event Details:
- Event: {eventTitle}
- Type: {eventType}
- Date: {eventDate}
- Time: {eventTime}
- Venue: {venueName}
- Address: {venueAddress}

Please arrive 15 minutes early.

See you there!

Best regards,
{businessName}`,
      smsTemplate: 'Reminder: {eventTitle} tomorrow at {eventTime}. Venue: {venueName}. See you there!',
    },
    {
      notificationType: 'BALANCE_REMINDER',
      enabled: true,
      sendEmail: true,
      sendSMS: false,
      reminderDaysInterval: 7,
      emailSubject: 'Payment Reminder - Balance Due',
      emailBody: `Hi {parentName},

This is a friendly reminder that you have an outstanding balance for {childName}'s registration.

Balance Details:
- Program: {programName}
- Total Amount: {totalAmount}
- Amount Paid: {amountPaid}
- Balance Due: {balanceDue}
- Due Date: {dueDate}

Please make a payment at your earliest convenience to avoid any interruption in services.

You can make a payment online or contact us for other payment options.

Thank you!

Best regards,
{businessName}`,
      smsTemplate: 'Payment reminder: Balance of {balanceDue} due for {childName} in {programName}. Please pay soon.',
    },
    {
      notificationType: 'REGISTRATION_APPROVED',
      enabled: true,
      sendEmail: true,
      sendSMS: true,
      emailSubject: 'Registration Approved - {programName}',
      emailBody: `Hi {parentName},

Great news! {childName}'s registration for {programName} has been approved!

Registration Details:
- Program: {programName}
- Division: {divisionName}
- Team: {teamName}
- Jersey Number: {jerseyNumber}

Please complete any outstanding payments to ensure {childName}'s spot is secured.

Welcome to the team!

Best regards,
{businessName}`,
      smsTemplate: 'Registration approved! {childName} is now in {programName}. Welcome to the team!',
    },
    {
      notificationType: 'REGISTRATION_WAITLIST',
      enabled: true,
      sendEmail: true,
      sendSMS: false,
      emailSubject: 'Added to Waitlist - {programName}',
      emailBody: `Hi {parentName},

Thank you for your interest in registering {childName} for {programName}.

Unfortunately, the program is currently full, and {childName} has been added to the waitlist.

Waitlist Position: {waitlistPosition}

We will notify you immediately if a spot becomes available. You can also contact us to check on the status.

Thank you for your patience!

Best regards,
{businessName}`,
      smsTemplate: 'Added to waitlist for {programName}. Position: {waitlistPosition}. We\'ll notify you if a spot opens!',
    },
    {
      notificationType: 'TEAM_ASSIGNMENT',
      enabled: true,
      sendEmail: true,
      sendSMS: true,
      emailSubject: 'Team Assignment - {teamName}',
      emailBody: `Hi {parentName},

{childName} has been assigned to a team!

Team Details:
- Team: {teamName}
- Division: {divisionName}
- Jersey Number: {jerseyNumber}
- Coach: {coachName}
- Practice Day: {practiceDay}
- Practice Time: {practiceTime}

The season starts on {seasonStartDate}. We look forward to a great season!

Best regards,
{businessName}`,
      smsTemplate: '{childName} assigned to {teamName}! Jersey #{jerseyNumber}. Practice: {practiceDay} at {practiceTime}.',
    },
  ];

  const settings = [];
  for (const setting of defaultSettings) {
    const { notificationType, ...settingData } = setting;
    const created = await prisma.clubOSNotificationSetting.upsert({
      where: {
        userId_notificationType: {
          userId,
          notificationType: notificationType as any,
        },
      },
      update: {},
      create: {
        userId,
        notificationType: notificationType as any,
        ...settingData,
      },
    });
    settings.push(created);
  }

  return settings;
}
