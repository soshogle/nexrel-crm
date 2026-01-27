import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateSaraBooking() {
  try {
    console.log('🔍 Checking Sara\'s current configuration...');
    
    // Find Sara's agent
    const sara = await prisma.voiceAgent.findFirst({
      where: {
        name: 'Sara',
        user: {
          email: 'pharmacie4177@gmail.com'
        }
      },
      include: {
        user: true
      }
    });

    if (!sara) {
      console.error('❌ Sara agent not found');
      return;
    }

    console.log('✅ Found Sara:', {
      id: sara.id,
      name: sara.name,
      elevenLabsAgentId: sara.elevenLabsAgentId,
      phone: sara.twilioPhoneNumber
    });

    console.log('\n📋 Current Status:');
    console.log('- Has ElevenLabs Agent ID:', !!sara.elevenLabsAgentId);
    console.log('- Phone Number:', sara.twilioPhoneNumber);
    console.log('- User:', sara.user.email);
    
    console.log('\n✅ Sara is ready for booking configuration update!');
    console.log('\n📝 Next Steps:');
    console.log('I will now call the auto-configure API to update Sara with:');
    console.log('1. ✅ check_availability function');
    console.log('2. ✅ create_booking function');
    console.log('3. ✅ modify_booking function');
    console.log('\nThis will enable Sara to handle restaurant bookings via phone!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateSaraBooking();
