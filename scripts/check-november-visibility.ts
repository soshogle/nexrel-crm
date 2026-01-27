import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkNovemberAppointments() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'michaelmendeznow@gmail.com' }
    });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('✅ User found:', user.id);
    
    const appointments = await prisma.bookingAppointment.findMany({
      where: {
        userId: user.id,
        appointmentDate: {
          gte: new Date('2025-11-01T00:00:00Z'),
          lt: new Date('2025-12-01T00:00:00Z')
        }
      },
      select: {
        id: true,
        customerName: true,
        customerEmail: true,
        appointmentDate: true,
        duration: true,
        status: true,
        notes: true
      },
      orderBy: { appointmentDate: 'asc' }
    });
    
    console.log(`\n📊 November 2025 Appointments: ${appointments.length}`);
    
    if (appointments.length > 0) {
      console.log('\n🔍 First 10 appointments:');
      appointments.slice(0, 10).forEach((apt, index) => {
        console.log(`\n${index + 1}. ${apt.customerName}`);
        console.log(`   Date: ${apt.appointmentDate.toISOString()}`);
        console.log(`   Status: ${apt.status}`);
        console.log(`   Duration: ${apt.duration} minutes`);
      });
    } else {
      console.log('\n⚠️ No appointments found for November 2025');
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkNovemberAppointments();
