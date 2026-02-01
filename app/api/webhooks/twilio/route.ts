
/**
 * Twilio SMS Webhook Handler
 * Receives incoming SMS messages from Twilio
 */

import { NextRequest, NextResponse } from 'next/server';
import { TwilioService } from '@/lib/messaging-sync/twilio-service';
import { prisma } from '@/lib/db';
import twilio from 'twilio';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const webhookData: any = {};
    
    // Convert FormData to object
    formData.forEach((value, key) => {
      webhookData[key] = value;
    });

    console.log('Twilio webhook received:', webhookData);

    // Get the phone number that received the message
    const toNumber = webhookData.To;

    // Find the channel connection for this Twilio number
    const channelConnection = await prisma.channelConnection.findFirst({
      where: {
        channelType: 'SMS',
        channelIdentifier: toNumber,
        status: 'CONNECTED',
      },
    });

    if (!channelConnection) {
      console.error('No channel connection found for Twilio number:', toNumber);
      return NextResponse.json(
        { error: 'Channel connection not found' },
        { status: 404 }
      );
    }

    // Get Twilio credentials from provider data
    const providerData = channelConnection.providerData as any;
    const accountSid = providerData?.accountSid;
    const authToken = providerData?.authToken;

    if (!accountSid || !authToken) {
      console.error('Missing Twilio credentials in channel connection');
      return NextResponse.json(
        { error: 'Invalid channel configuration' },
        { status: 400 }
      );
    }

    // Validate webhook signature for security
    const twilioSignature = req.headers.get('x-twilio-signature') || '';
    const url = req.url;
    const valid = twilio.validateRequest(
      authToken,
      twilioSignature,
      url,
      webhookData
    );

    if (!valid && process.env.NODE_ENV === 'production') {
      console.error('Invalid Twilio webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Process the incoming message
    const twilioService = new TwilioService(accountSid, authToken, toNumber);
    await twilioService.processIncomingMessage(
      webhookData,
      channelConnection.id,
      channelConnection.userId
    );

    // Respond to Twilio with TwiML (empty response acknowledges receipt)
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        status: 200,
        headers: {
          'Content-Type': 'text/xml',
        },
      }
    );
  } catch (error: any) {
    console.error('Error processing Twilio webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
