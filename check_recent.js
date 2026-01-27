const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
  console.log('Checking last 10 calls (any time)...\n');
  
  const calls = await prisma.callLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      voiceAgent: { select: { name: true, userId: true } }
    }
  });
  
  console.log(`Found ${calls.length} recent calls\n`);
  
  calls.forEach((call, i) => {
    console.log(`Call ${i + 1}:`);
    console.log(`  Time: ${call.createdAt.toLocaleString()}`);
    console.log(`  From: ${call.fromNumber} To: ${call.toNumber}`);
    console.log(`  Direction: ${call.direction}`);
    console.log(`  Status: ${call.status}`);
    console.log(`  Duration: ${call.duration}s`);
    console.log(`  Email Sent: ${call.emailSent ? 'YES ✅' : 'NO ❌'}`);
    if (call.emailSentAt) {
      console.log(`  Email Sent At: ${call.emailSentAt.toLocaleString()}`);
    }
    console.log(`  Agent: ${call.voiceAgent?.name || 'N/A'}`);
    console.log(`  ElevenLabs ID: ${call.elevenLabsConversationId || 'N/A'}\n`);
  });
  
  console.log('\nChecking last 10 reservations...\n');
  
  const reservations = await prisma.reservation.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  
  console.log(`Found ${reservations.length} recent reservations\n`);
  
  reservations.forEach((res, i) => {
    console.log(`Reservation ${i + 1}:`);
    console.log(`  Created: ${res.createdAt.toLocaleString()}`);
    console.log(`  Customer: ${res.customerName}`);
    console.log(`  Phone: ${res.customerPhone}`);
    console.log(`  For: ${res.reservationDate} at ${res.reservationTime}`);
    console.log(`  Party Size: ${res.partySize}`);
    console.log(`  Status: ${res.status}\n`);
  });
  
  await prisma.$disconnect();
}

main().catch(console.error);
