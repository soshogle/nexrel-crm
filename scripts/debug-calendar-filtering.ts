import { PrismaClient } from '@prisma/client';
import { isSameDay, format } from 'date-fns';

const prisma = new PrismaClient();

async function debugCalendarFiltering() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'michaelmendeznow@gmail.com' }
    });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('✅ User found:', user.id);
    
    // Simulate API call - get all appointments
    const dbAppointments = await prisma.bookingAppointment.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        appointmentDate: 'asc',
      },
    });
    
    // Transform like the API does
    const appointments = dbAppointments
      .filter((apt) => {
        if (!apt.appointmentDate) return false;
        const testDate = new Date(apt.appointmentDate);
        return !isNaN(testDate.getTime());
      })
      .map((apt) => {
        const startTime = new Date(apt.appointmentDate);
        const durationMinutes = apt.duration || 30;
        const endTime = new Date(startTime.getTime() + durationMinutes * 60000);
        
        return {
          id: apt.id,
          title: apt.customerName || 'Untitled',
          description: apt.notes || null,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          location: apt.meetingLocation || null,
          meetingType: 'PHONE',
          status: apt.status || 'SCHEDULED',
        };
      });
    
    console.log(`\n📊 Total transformed appointments: ${appointments.length}`);
    
    // Now simulate what the calendar does for each day in November 2025
    console.log('\n🗓️ Simulating calendar filtering for November 2025...');
    
    // Test specific days where we know appointments exist
    const testDates = [
      new Date('2025-11-26'), // ddwwd and test
      new Date('2025-11-27'), // Test
      new Date('2025-11-28'), // team
      new Date('2025-11-30'), // a[pppi
    ];
    
    testDates.forEach(date => {
      console.log(`\n📅 Testing date: ${format(date, 'MMMM d, yyyy')}`);
      
      // Simulate getAppointmentsForDate function
      const dayAppointments = appointments.filter(apt => {
        try {
          if (!apt || !apt.startTime || !apt.status) {
            console.warn('  ⚠️  Appointment missing required fields:', apt);
            return false;
          }
          
          const aptDate = new Date(apt.startTime);
          if (isNaN(aptDate.getTime())) {
            console.warn('  ⚠️  Invalid date for appointment:', apt.id, apt.startTime);
            return false;
          }
          
          const matches = isSameDay(aptDate, date) && apt.status !== 'CANCELLED';
          
          if (matches) {
            console.log(`  ✅ Matched: "${apt.title}" at ${format(aptDate, 'HH:mm')}`);
            console.log(`     - startTime: ${apt.startTime}`);
            console.log(`     - aptDate: ${aptDate.toISOString()}`);
            console.log(`     - testDate: ${date.toISOString()}`);
            console.log(`     - isSameDay: ${isSameDay(aptDate, date)}`);
            console.log(`     - status: ${apt.status}`);
          }
          
          return matches;
        } catch (error) {
          console.error('  ❌ Error filtering appointment:', error, apt);
          return false;
        }
      });
      
      console.log(`  📊 Found ${dayAppointments.length} appointments for this day`);
    });
    
    console.log('\n\n=== TIMEZONE ANALYSIS ===');
    const testAppointment = dbAppointments[0];
    if (testAppointment) {
      const dbDate = testAppointment.appointmentDate;
      console.log('Database date (raw):', dbDate);
      console.log('Database date (ISO string):', dbDate.toISOString());
      console.log('Database date (local string):', dbDate.toLocaleString());
      console.log('Database date (UTC string):', dbDate.toUTCString());
      
      const parsedDate = new Date(dbDate);
      console.log('\nParsed date (ISO string):', parsedDate.toISOString());
      console.log('Parsed date (local string):', parsedDate.toLocaleString());
      
      // Test isSameDay logic
      const testDate = new Date('2025-11-26');
      console.log('\nTest date:', testDate.toISOString());
      console.log('isSameDay result:', isSameDay(parsedDate, testDate));
    }
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

debugCalendarFiltering();
