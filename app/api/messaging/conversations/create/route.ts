
/**
 * Create New Conversation API
 * Creates a new conversation and channel connection for messaging
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { channelType, contactName, contactIdentifier, fromPhoneNumber } = await req.json();

    // Validate required fields
    if (!channelType || !contactName || !contactIdentifier) {
      return NextResponse.json(
        { error: 'Missing required fields: channelType, contactName, contactIdentifier' },
        { status: 400 }
      );
    }

    // Auto-create Lead if they don't exist
    console.log('🔍 Checking if Lead exists for:', contactIdentifier);
    
    let existingLead = null;
    const isEmail = contactIdentifier.includes('@');
    const isPhone = contactIdentifier.match(/^\+?[\d\s\-()]+$/);

    if (isEmail) {
      // Search for existing Lead by email
      existingLead = await prisma.lead.findFirst({
        where: {
          userId: session.user.id,
          email: contactIdentifier,
        },
      });

      if (!existingLead) {
        console.log('✨ No existing Lead found. Creating new Lead...');
        // Create new Lead
        existingLead = await prisma.lead.create({
          data: {
            userId: session.user.id,
            email: contactIdentifier,
            contactPerson: contactName,
            businessName: contactName, // Use contact name as business name initially
            source: 'Messages',
            status: 'NEW',
          },
        });
        console.log('✅ Created new Lead:', existingLead.id);
      } else {
        console.log('✅ Found existing Lead:', existingLead.id);
      }
    } else if (isPhone) {
      // Search for existing Lead by phone
      existingLead = await prisma.lead.findFirst({
        where: {
          userId: session.user.id,
          phone: contactIdentifier,
        },
      });

      if (!existingLead) {
        console.log('✨ No existing Lead found. Creating new Lead...');
        // Create new Lead
        existingLead = await prisma.lead.create({
          data: {
            userId: session.user.id,
            phone: contactIdentifier,
            contactPerson: contactName,
            businessName: contactName, // Use contact name as business name initially
            source: 'Messages',
            status: 'NEW',
          },
        });
        console.log('✅ Created new Lead:', existingLead.id);
      } else {
        console.log('✅ Found existing Lead:', existingLead.id);
      }
    }

    // For SMS, require fromPhoneNumber
    if (channelType === 'SMS' && !fromPhoneNumber) {
      return NextResponse.json(
        { error: 'fromPhoneNumber is required for SMS' },
        { status: 400 }
      );
    }

    // Get or create channel connection
    let channelConnection;

    if (channelType === 'SMS') {
      // Read Twilio credentials from environment variables
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;

      console.log('📂 Reading Twilio credentials from environment...');
      console.log('✅ Account SID:', accountSid ? 'Found' : 'Missing');
      console.log('✅ Auth Token:', authToken ? 'Found' : 'Missing');

      if (!accountSid || !authToken) {
        return NextResponse.json(
          { error: 'Twilio credentials not configured in environment variables.' },
          { status: 400 }
        );
      }

      // Find or create SMS channel connection for this phone number
      channelConnection = await prisma.channelConnection.findFirst({
        where: {
          userId: session.user.id,
          channelType: 'SMS',
          channelIdentifier: fromPhoneNumber,
        },
      });

      if (!channelConnection) {
        channelConnection = await prisma.channelConnection.create({
          data: {
            userId: session.user.id,
            channelType: 'SMS',
            channelIdentifier: fromPhoneNumber,
            displayName: `SMS - ${fromPhoneNumber}`,
            status: 'CONNECTED',
            providerData: {
              accountSid,
              authToken,
            },
          },
        });
      }
    } else if (channelType === 'EMAIL') {
      // Find or create EMAIL channel connection
      channelConnection = await prisma.channelConnection.findFirst({
        where: {
          userId: session.user.id,
          channelType: 'EMAIL',
          providerType: 'GMAIL', // Assuming Gmail is the provider
        },
      });

      if (!channelConnection) {
        // If no Gmail connection exists, create a basic one
        // In a full implementation, this should be created via OAuth
        return NextResponse.json(
          { error: 'Gmail/Email connection not configured. Please connect your email in Settings.' },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: `Channel type ${channelType} not yet supported for new conversations` },
        { status: 400 }
      );
    }

    // Check if conversation already exists
    const existingConversation = await prisma.conversation.findFirst({
      where: {
        userId: session.user.id,
        channelConnectionId: channelConnection.id,
        contactIdentifier,
      },
    });

    if (existingConversation) {
      return NextResponse.json({
        success: true,
        conversation: existingConversation,
        message: 'Conversation already exists',
      });
    }

    // Create new conversation
    const conversation = await prisma.conversation.create({
      data: {
        userId: session.user.id,
        channelConnectionId: channelConnection.id,
        contactName,
        contactIdentifier,
        status: 'ACTIVE',
      },
      include: {
        channelConnection: true,
      },
    });

    return NextResponse.json({
      success: true,
      conversation,
    });
  } catch (error: any) {
    console.error('Error creating conversation:', error);
    return NextResponse.json(
      { error: 'Failed to create conversation', details: error.message },
      { status: 500 }
    );
  }
}
