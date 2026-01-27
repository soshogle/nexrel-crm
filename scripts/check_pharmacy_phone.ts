import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== CHECKING PHONE NUMBERS ===\n');
  
  // Get pharmacy owner
  const pharmacyOwner = await prisma.user.findUnique({
    where: { email: 'pharmacie4177@gmail.com' },
    select: { id: true, name: true, email: true }
  });
  
  console.log('Pharmacy Owner:', pharmacyOwner);
  
  // Get all phone numbers
  const phoneNumbers = await prisma.purchasedPhoneNumber.findMany({
    include: {
      user: {
        select: { email: true, name: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
  
  console.log('\n=== ALL PURCHASED PHONE NUMBERS ===');
  phoneNumbers.forEach((phone) => {
    console.log(`\nPhone: ${phone.phoneNumber}`);
    console.log(`Owner: ${phone.user?.email || 'No owner'}`);
    console.log(`Friendly Name: ${phone.friendlyName}`);
    console.log(`Status: ${phone.status}`);
    console.log(`Created: ${phone.createdAt}`);
  });
  
  // Check if +14506391671 exists
  const targetPhone = await prisma.purchasedPhoneNumber.findFirst({
    where: { 
      phoneNumber: { contains: '4506391671' }
    },
    include: {
      user: { select: { email: true, name: true } }
    }
  });
  
  console.log('\n=== TARGET PHONE NUMBER (+1 450 639 1671) ===');
  if (targetPhone) {
    console.log('✅ Found in database!');
    console.log('Owner:', targetPhone.user?.email);
    console.log('Phone Number:', targetPhone.phoneNumber);
  } else {
    console.log('❌ NOT FOUND in database');
    console.log('This phone number needs to be purchased/synced first!');
  }
  
  // Check voice agents
  const voiceAgents = await prisma.voiceAgent.findMany({
    where: {
      userId: pharmacyOwner?.id
    },
    select: {
      id: true,
      name: true,
      twilioPhoneNumber: true,
      elevenLabsAgentId: true,
      status: true
    }
  });
  
  console.log('\n=== PHARMACY OWNER VOICE AGENTS ===');
  if (voiceAgents.length > 0) {
    voiceAgents.forEach(agent => {
      console.log(`\nAgent: ${agent.name}`);
      console.log(`Phone: ${agent.twilioPhoneNumber || 'No phone'}`);
      console.log(`Status: ${agent.status}`);
    });
  } else {
    console.log('❌ No voice agents found for pharmacy owner');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
