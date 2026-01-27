import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== CHECKING SMS SETUP ===\n');
  
  // Get pharmacy owner
  const pharmacyOwner = await prisma.user.findUnique({
    where: { email: 'pharmacie4177@gmail.com' },
    select: { id: true, name: true, email: true }
  });
  
  console.log('Pharmacy Owner:', pharmacyOwner);
  
  // Get pharmacy owner's phone number
  const pharmacyPhone = await prisma.purchasedPhoneNumber.findFirst({
    where: { userId: pharmacyOwner?.id },
    select: {
      id: true,
      phoneNumber: true,
      friendlyName: true,
      status: true,
      twilioSid: true
    }
  });
  
  console.log('\n=== PHARMACY OWNER PHONE NUMBER ===');
  console.log(pharmacyPhone);
  
  // Check for SMS channel connections
  const smsConnections = await prisma.channelConnection.findMany({
    where: {
      userId: pharmacyOwner?.id,
      channelType: 'SMS'
    },
    select: {
      id: true,
      channelIdentifier: true,
      providerAccountId: true,
      status: true,
      providerData: true,
      createdAt: true
    }
  });
  
  console.log('\n=== SMS CHANNEL CONNECTIONS ===');
  if (smsConnections.length > 0) {
    console.log('✅ SMS connections found:');
    smsConnections.forEach(conn => {
      console.log(`  Phone: ${conn.channelIdentifier}`);
      console.log(`  Provider Account ID: ${conn.providerAccountId}`);
      console.log(`  Status: ${conn.status}`);
      console.log(`  Provider Data:`, conn.providerData);
    });
  } else {
    console.log('❌ NO SMS connections found for pharmacy owner');
    console.log('   Need to create ChannelConnection for SMS!');
  }
  
  // Check conversations for this user (via their channel connections)
  const conversations = await prisma.conversation.findMany({
    where: {
      channelConnection: {
        userId: pharmacyOwner?.id,
        channelType: 'SMS'
      }
    },
    select: {
      id: true,
      contactName: true,
      contactIdentifier: true,
      lastMessageAt: true,
      _count: {
        select: { messages: true }
      }
    },
    orderBy: { lastMessageAt: 'desc' },
    take: 5
  });
  
  console.log('\n=== RECENT SMS CONVERSATIONS ===');
  if (conversations.length > 0) {
    conversations.forEach(conv => {
      console.log(`\nContact: ${conv.contactName || 'Unknown'}`);
      console.log(`Phone: ${conv.contactIdentifier}`);
      console.log(`Messages: ${conv._count.messages}`);
      console.log(`Last message: ${conv.lastMessageAt}`);
    });
  } else {
    console.log('❌ No SMS conversations found');
  }
  
  console.log('\n\n=== SUMMARY ===');
  console.log('Pharmacy Owner Phone Number: +13605022136');
  console.log('Twilio SID:', pharmacyPhone?.twilioSid);
  console.log('SMS ChannelConnection exists?', smsConnections.length > 0 ? '✅ YES' : '❌ NO');
  console.log('SMS Conversations:', conversations.length);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
