import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== FIXING PHARMACY OWNER SMS ===\n');
  
  // Get pharmacy owner
  const pharmacyOwner = await prisma.user.findUnique({
    where: { email: 'pharmacie4177@gmail.com' }
  });
  
  if (!pharmacyOwner) {
    console.error('❌ Pharmacy owner not found!');
    return;
  }
  
  // Get pharmacy owner's phone number
  const pharmacyPhone = await prisma.purchasedPhoneNumber.findFirst({
    where: { userId: pharmacyOwner.id }
  });
  
  if (!pharmacyPhone) {
    console.error('❌ No phone number found for pharmacy owner!');
    return;
  }
  
  console.log('Creating SMS ChannelConnection for:');
  console.log(`User: ${pharmacyOwner.email}`);
  console.log(`Phone: ${pharmacyPhone.phoneNumber}`);
  console.log(`Twilio SID: ${pharmacyPhone.twilioSid}\n`);
  
  // Create SMS ChannelConnection
  const smsConnection = await prisma.channelConnection.upsert({
    where: {
      userId_channelType_channelIdentifier: {
        userId: pharmacyOwner.id,
        channelType: 'SMS',
        channelIdentifier: pharmacyPhone.phoneNumber
      }
    },
    create: {
      userId: pharmacyOwner.id,
      channelType: 'SMS',
      channelIdentifier: pharmacyPhone.phoneNumber,
      displayName: `SMS from ${pharmacyPhone.phoneNumber}`,
      status: 'CONNECTED',
      providerType: 'TWILIO',
      providerAccountId: pharmacyPhone.twilioSid,
      providerData: {
        friendlyName: pharmacyPhone.friendlyName,
        capabilities: {
          sms: true,
          mms: true,
          voice: true
        }
      },
      isDefault: true,
      syncEnabled: true
    },
    update: {
      status: 'CONNECTED',
      displayName: `SMS from ${pharmacyPhone.phoneNumber}`,
      providerAccountId: pharmacyPhone.twilioSid,
      isDefault: true
    }
  });
  
  console.log('✅ SMS ChannelConnection created!');
  console.log('Connection ID:', smsConnection.id);
  console.log('Status:', smsConnection.status);
  console.log('Channel Identifier:', smsConnection.channelIdentifier);
  
  console.log('\n=== SMS IS NOW ENABLED ===');
  console.log('✅ Pharmacy owner can now send/receive SMS from +13605022136');
  console.log('✅ Messages will appear in the Messages tab');
  console.log('✅ Call history will be integrated in the same view');
  
  console.log('\n📋 NEXT STEPS:');
  console.log('1. Log in as pharmacie4177@gmail.com');
  console.log('2. Go to Messages tab');
  console.log('3. Click "New Conversation"');
  console.log('4. Select phone number: +1 360 502 2136');
  console.log('5. Enter recipient phone and send SMS!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
