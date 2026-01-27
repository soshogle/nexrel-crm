require('dotenv').config();

async function testAPI() {
  try {
    // Simulate fetching from the API endpoint
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    // Get appointments
    const appointments = await prisma.bookingAppointment.findMany({
      where: {
        userId: 'cmhpnsd8e0000n508lgk9ivvm', // Test user ID
      },
      take: 5,
      orderBy: {
        appointmentDate: 'desc',
      },
    });

    console.log('\n📊 Raw DB Data:');
    console.log('Count:', appointments.length);
    
    // Transform like the API does
    const transformedAppointments = appointments.map((apt) => {
      const startTime = new Date(apt.appointmentDate);
      const endTime = new Date(startTime.getTime() + apt.duration * 60000);
      
      return {
        ...apt,
        title: apt.customerName || 'Untitled',
        description: apt.notes,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        location: apt.meetingLocation,
        meetingType: 'PHONE',
      };
    });

    console.log('\n📅 Transformed API Response:');
    console.log(JSON.stringify(transformedAppointments, null, 2));
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

testAPI();
