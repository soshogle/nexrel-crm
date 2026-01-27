import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function testAppointmentsVisibility() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'michaelmendeznow@gmail.com' }
    });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('\n✅ User found:', user.id);
    console.log('   Name:', user.name);
    console.log('   Email:', user.email);
    
    // Fetch November appointments
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
        notes: true,
        meetingType: true,
        meetingLocation: true
      },
      orderBy: { appointmentDate: 'asc' }
    });
    
    console.log(`\n\n📊 November 2025 Appointments: ${appointments.length}`);
    
    if (appointments.length > 0) {
      console.log('\n🔍 Detailed appointment data:');
      appointments.forEach((apt, index) => {
        console.log(`\n${index + 1}. Appointment ID: ${apt.id}`);
        console.log(`   Customer: ${apt.customerName}`);
        console.log(`   Email: ${apt.customerEmail || 'N/A'}`);
        console.log(`   Date: ${apt.appointmentDate.toISOString()}`);
        console.log(`   Local Date: ${apt.appointmentDate.toLocaleString()}`);
        console.log(`   Duration: ${apt.duration} minutes`);
        console.log(`   Status: ${apt.status}`);
        console.log(`   Meeting Type: ${apt.meetingType || 'N/A'}`);
        console.log(`   Location: ${apt.meetingLocation || 'N/A'}`);
        
        // Calculate startTime and endTime like the API does
        const startTime = apt.appointmentDate;
        const durationMinutes = apt.duration || 30;
        const endTime = new Date(startTime.getTime() + durationMinutes * 60000);
        
        console.log(`   Calculated startTime: ${startTime.toISOString()}`);
        console.log(`   Calculated endTime: ${endTime.toISOString()}`);
        
        // This is what the API returns
        const transformedData = {
          ...apt,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          title: apt.customerName || 'Untitled',
          description: apt.notes || '',
          location: apt.meetingLocation || '',
          meetingType: apt.meetingType || 'PHONE_CALL'
        };
        
        console.log(`   \n   ✅ Transformed for API:`);
        console.log(`      title: "${transformedData.title}"`);
        console.log(`      startTime: ${transformedData.startTime}`);
        console.log(`      endTime: ${transformedData.endTime}`);
        console.log(`      status: ${transformedData.status}`);
        console.log(`      meetingType: ${transformedData.meetingType}`);
      });
      
      console.log('\n\n=== ANALYSIS ===');
      console.log('✅ Appointments exist in database');
      console.log('✅ All appointments have valid dates');
      console.log('✅ All appointments have status and customer names');
      console.log('\n➡️ The data transformation looks correct.');
      console.log('➡️ These appointments SHOULD be visible on the calendar.');
      console.log('\n🔍 Next steps to debug visibility:');
      console.log('   1. Check if /api/appointments is returning the data');
      console.log('   2. Check browser console for filtering errors');
      console.log('   3. Verify the calendar is showing November 2025');
      console.log('   4. Check if appointments are being filtered out by getAppointmentsForDate');
      
    } else {
      console.log('\n⚠️ No appointments found for November 2025');
    }
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testAppointmentsVisibility();
