const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRecentCalls() {
  try {
    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    console.log('🔍 Checking calls from:', today.toISOString(), 'to', tomorrow.toISOString());
    
    // Check CallLogs from today
    const callLogs = await prisma.callLog.findMany({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        voiceAgent: {
          select: {
            name: true,
            userId: true
          }
        }
      }
    });
    
    console.log('\n📞 Found', callLogs.length, 'calls today');
    
    callLogs.forEach((call, index) => {
      const callTime = new Date(call.createdAt);
      console.log(`\n--- Call ${index + 1} ---`);
      console.log('Time:', callTime.toLocaleString());
      console.log('Agent:', call.voiceAgent?.name || 'N/A');
      console.log('From:', call.fromNumber);
      console.log('To:', call.toNumber);
      console.log('Direction:', call.direction);
      console.log('Status:', call.status);
      console.log('Duration:', call.duration, 'seconds');
      console.log('Email Sent:', call.emailSent ? 'YES ✅' : 'NO ❌');
      if (call.emailSent && call.emailSentAt) {
        console.log('Email Sent At:', new Date(call.emailSentAt).toLocaleString());
      }
      console.log('ElevenLabs Conv ID:', call.elevenLabsConversationId || 'N/A');
      console.log('Twilio SID:', call.twilioCallSid || 'N/A');
    });
    
    // Check for voice reservations created today
    console.log('\n\n🗓️ Checking Voice AI Reservations...');
    const reservations = await prisma.reservation.findMany({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log('Found', reservations.length, 'reservations created today');
    
    reservations.forEach((res, index) => {
      console.log(`\n--- Reservation ${index + 1} ---`);
      console.log('Time Created:', new Date(res.createdAt).toLocaleString());
      console.log('Customer:', res.customerName);
      console.log('Phone:', res.customerPhone);
      console.log('Party Size:', res.partySize);
      console.log('Date:', res.reservationDate);
      console.log('Time:', res.reservationTime);
      console.log('Status:', res.status);
      console.log('Confirmation Code:', res.confirmationCode);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRecentCalls();
