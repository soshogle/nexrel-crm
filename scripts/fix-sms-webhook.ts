import { PrismaClient } from '@prisma/client';
import fetch from 'node-fetch';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function fixSMSWebhook() {
  console.log('\n🔧 Fixing SMS Webhook Configuration...');
  console.log('=====================================\n');

  const phoneNumber = '+14506391671';
  const targetEmail = 'michaelmendeznow@gmail.com';

  try {
    // 1. Find the user
    console.log(`📧 Looking up user: ${targetEmail}`);
    const user = await prisma.user.findUnique({
      where: { email: targetEmail },
    });

    if (!user) {
      console.error('❌ User not found!');
      return;
    }
    console.log(`✅ Found user: ${user.name} (${user.id})`);

    // 2. Check if phone number exists in database
    console.log(`\n📱 Checking database for phone number: ${phoneNumber}`);
    let purchasedNumber = await prisma.purchasedPhoneNumber.findFirst({
      where: {
        phoneNumber: phoneNumber,
      },
    });

    if (!purchasedNumber) {
      console.log('⚠️  Phone number not found in database, creating entry...');
      
      // Get Twilio credentials
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      
      if (!accountSid || !authToken) {
        console.error('❌ Twilio credentials not found in environment');
        return;
      }

      // Fetch phone number details from Twilio
      console.log('🔍 Fetching phone number details from Twilio...');
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json`;
      const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
      
      const response = await fetch(twilioUrl, {
        headers: {
          'Authorization': `Basic ${auth}`,
        },
      });

      if (!response.ok) {
        console.error('❌ Failed to fetch from Twilio:', response.statusText);
        return;
      }

      const data: any = await response.json();
      const twilioNumber = data.incoming_phone_numbers.find((num: any) => 
        num.phone_number === phoneNumber
      );

      if (!twilioNumber) {
        console.error('❌ Phone number not found in Twilio account');
        return;
      }

      console.log('✅ Found in Twilio, creating database entry...');
      purchasedNumber = await prisma.purchasedPhoneNumber.create({
        data: {
          userId: user.id,
          phoneNumber: phoneNumber,
          twilioSid: twilioNumber.sid,
          friendlyName: twilioNumber.friendly_name || phoneNumber,
          country: twilioNumber.iso_country,
          status: 'ACTIVE',
          capabilities: {
            voice: twilioNumber.capabilities.voice,
            sms: twilioNumber.capabilities.SMS,
            mms: twilioNumber.capabilities.MMS,
          },
        },
      });
      console.log('✅ Database entry created');
    } else {
      console.log(`✅ Found in database (Owner: ${purchasedNumber.userId})`);
      
      // Check if the phone number belongs to the correct user
      if (purchasedNumber.userId !== user.id) {
        console.log(`⚠️  Phone number belongs to different user, updating...`);
        purchasedNumber = await prisma.purchasedPhoneNumber.update({
          where: { id: purchasedNumber.id },
          data: { userId: user.id },
        });
        console.log('✅ Updated phone number ownership');
      }
    }

    // 3. Configure SMS webhook in Twilio
    console.log('\n🔗 Configuring SMS webhook in Twilio...');
    
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const baseUrl = process.env.NEXTAUTH_URL || 'https://soshogleagents.com';
    const smsWebhookUrl = `${baseUrl}/api/twilio/sms-webhook`;

    if (!accountSid || !authToken) {
      console.error('❌ Twilio credentials not found in environment');
      return;
    }

    console.log(`📍 SMS Webhook URL: ${smsWebhookUrl}`);

    const updateUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers/${purchasedNumber.twilioSid}.json`;
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    const updateResponse = await fetch(updateUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        SmsUrl: smsWebhookUrl,
        SmsMethod: 'POST',
      }),
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('❌ Failed to update Twilio webhook:', errorText);
      return;
    }

    console.log('✅ SMS webhook configured successfully!');

    // 4. Verify the configuration
    console.log('\n✅ Verification...');
    const verifyResponse = await fetch(updateUrl.replace('.json', '.json'), {
      headers: {
        'Authorization': `Basic ${auth}`,
      },
    });

    if (verifyResponse.ok) {
      const verifyData: any = await verifyResponse.json();
      console.log('📋 Current Configuration:');
      console.log(`   Phone Number: ${verifyData.phone_number}`);
      console.log(`   Friendly Name: ${verifyData.friendly_name}`);
      console.log(`   SMS URL: ${verifyData.sms_url}`);
      console.log(`   SMS Method: ${verifyData.sms_method}`);
      console.log(`   Voice URL: ${verifyData.voice_url}`);
      console.log(`   Status: ${verifyData.status}`);
    }

    console.log('\n✅ SMS Webhook Fix Complete!');
    console.log('=====================================');
    console.log('\n📱 Testing Instructions:');
    console.log('1. Send an SMS to: +1 (450) 639-1671');
    console.log('2. The message should now appear in the Messages tab');
    console.log('3. You should be able to reply from the CRM');
    console.log('\n💡 Note: It may take a few seconds for Twilio to apply the webhook changes.');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

fixSMSWebhook();
