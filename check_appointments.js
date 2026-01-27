const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAppointments() {
  try {
    // Get all appointments
    const appointments = await prisma.bookingAppointment.findMany({
      include: {
        lead: true,
        contact: true,
      },
      orderBy: {
        startTime: 'desc'
      }
    });
    
    console.log('\n📅 TOTAL APPOINTMENTS:', appointments.length);
    
    if (appointments.length > 0) {
      console.log('\n📊 APPOINTMENT DETAILS:\n');
      appointments.forEach((apt, index) => {
        console.log(`${index + 1}. Title: ${apt.title}`);
        console.log(`   Start: ${apt.startTime}`);
        console.log(`   End: ${apt.endTime}`);
        console.log(`   Status: ${apt.status}`);
        console.log(`   Lead: ${apt.lead?.businessName || 'N/A'}`);
        console.log(`   Contact: ${apt.contact?.name || 'N/A'}`);
        console.log(`   User ID: ${apt.userId}`);
        console.log('');
      });
    } else {
      console.log('\n❌ NO APPOINTMENTS FOUND IN DATABASE\n');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAppointments();
