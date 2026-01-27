import { PrismaClient } from '@prisma/client';
import { addDays, setHours, setMinutes, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns';

const prisma = new PrismaClient();

const EMAIL = 'pharmacie4177@gmail.com';

// Meeting types to vary appointments
const MEETING_TYPES = ['PHONE_CALL', 'VIDEO_CALL', 'IN_PERSON'] as const;

// Time slots throughout the day (9 AM to 5 PM)
const TIME_SLOTS = [
  { hour: 9, minute: 0 },
  { hour: 10, minute: 0 },
  { hour: 11, minute: 0 },
  { hour: 12, minute: 0 },
  { hour: 13, minute: 0 },
  { hour: 14, minute: 0 },
  { hour: 15, minute: 0 },
  { hour: 16, minute: 0 },
  { hour: 17, minute: 0 },
];

// Sample customer data
const CUSTOMERS = [
  { name: 'John Smith', phone: '+15551234567', email: 'john.smith@email.com' },
  { name: 'Sarah Johnson', phone: '+15551234568', email: 'sarah.j@email.com' },
  { name: 'Michael Brown', phone: '+15551234569', email: 'm.brown@email.com' },
  { name: 'Emily Davis', phone: '+15551234570', email: 'emily.d@email.com' },
  { name: 'David Wilson', phone: '+15551234571', email: 'd.wilson@email.com' },
  { name: 'Lisa Anderson', phone: '+15551234572', email: 'lisa.a@email.com' },
  { name: 'Robert Taylor', phone: '+15551234573', email: 'r.taylor@email.com' },
  { name: 'Jennifer Martinez', phone: '+15551234574', email: 'j.martinez@email.com' },
  { name: 'William Garcia', phone: '+15551234575', email: 'w.garcia@email.com' },
  { name: 'Jessica Rodriguez', phone: '+15551234576', email: 'jessica.r@email.com' },
];

async function main() {
  console.log('🗓️  Starting November 2025 appointments seeding...');

  // Find the user
  const user = await prisma.user.findUnique({
    where: { email: EMAIL },
  });

  if (!user) {
    throw new Error(`User with email ${EMAIL} not found`);
  }

  console.log(`✅ Found user: ${user.name} (${user.email})`);

  // Get November 2025 date range
  const november2025 = new Date(2025, 10, 1); // Month is 0-indexed
  const startDate = startOfMonth(november2025);
  const endDate = endOfMonth(november2025);
  
  console.log(`📅 Date range: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`);

  // Get all days in November
  const allDays = eachDayOfInterval({ start: startDate, end: endDate });
  
  // Filter to weekdays only (Monday-Friday)
  const weekdays = allDays.filter(day => {
    const dayOfWeek = getDay(day);
    return dayOfWeek >= 1 && dayOfWeek <= 5; // 1 = Monday, 5 = Friday
  });

  console.log(`📊 Total weekdays in November: ${weekdays.length}`);

  // Delete existing appointments for this user in November 2025
  const deleted = await prisma.bookingAppointment.deleteMany({
    where: {
      userId: user.id,
      appointmentDate: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  console.log(`🗑️  Deleted ${deleted.count} existing November appointments`);

  let appointmentsCreated = 0;
  const appointments = [];

  // For each weekday, create 6-8 appointments (leaving 1-3 slots free)
  for (const day of weekdays) {
    // Randomly decide how many appointments for this day (6-8 out of 9 slots)
    const numAppointments = 6 + Math.floor(Math.random() * 3);
    
    // Shuffle time slots and take the first numAppointments
    const shuffledSlots = [...TIME_SLOTS].sort(() => Math.random() - 0.5);
    const selectedSlots = shuffledSlots.slice(0, numAppointments);

    for (let i = 0; i < selectedSlots.length; i++) {
      const slot = selectedSlots[i];
      const customer = CUSTOMERS[appointmentsCreated % CUSTOMERS.length];
      const meetingType = MEETING_TYPES[appointmentsCreated % MEETING_TYPES.length];
      
      // Create appointment date/time
      let appointmentDateTime = new Date(day);
      appointmentDateTime = setHours(appointmentDateTime, slot.hour);
      appointmentDateTime = setMinutes(appointmentDateTime, slot.minute);

      // Determine status based on date
      const now = new Date();
      let status: 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
      
      if (appointmentDateTime < now) {
        // Past appointments: 80% completed, 10% cancelled, 10% no-show
        const rand = Math.random();
        if (rand < 0.8) status = 'COMPLETED';
        else if (rand < 0.9) status = 'CANCELLED';
        else status = 'SCHEDULED'; // no-show
      } else {
        // Future appointments: 70% confirmed, 30% scheduled
        status = Math.random() < 0.7 ? 'CONFIRMED' : 'SCHEDULED';
      }

      // Generate confirmation code
      const confirmationCode = `APPT${appointmentsCreated.toString().padStart(4, '0')}`;

      const appointment = {
        userId: user.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerEmail: customer.email,
        appointmentDate: appointmentDateTime,
        duration: 30, // 30 minutes
        status,
        confirmationCode,
        meetingType,
        notes: `${meetingType === 'PHONE_CALL' ? 'Phone consultation' : meetingType === 'VIDEO_CALL' ? 'Video meeting' : 'In-person visit'} - Test appointment for voice AI testing`,
        createdAt: new Date(),
      };

      appointments.push(appointment);
      appointmentsCreated++;
    }
  }

  // Bulk insert appointments
  await prisma.bookingAppointment.createMany({
    data: appointments,
  });

  console.log(`✅ Created ${appointmentsCreated} appointments for November 2025`);
  console.log(`\n📊 Appointment Statistics:`);
  console.log(`   - Total weekdays: ${weekdays.length}`);
  console.log(`   - Total appointments: ${appointmentsCreated}`);
  console.log(`   - Average per day: ${(appointmentsCreated / weekdays.length).toFixed(1)}`);
  console.log(`   - Available slots per day: ~${9 - (appointmentsCreated / weekdays.length).toFixed(1)}`);

  // Show breakdown by status
  const statusCounts = {
    SCHEDULED: appointments.filter(a => a.status === 'SCHEDULED').length,
    CONFIRMED: appointments.filter(a => a.status === 'CONFIRMED').length,
    COMPLETED: appointments.filter(a => a.status === 'COMPLETED').length,
    CANCELLED: appointments.filter(a => a.status === 'CANCELLED').length,
  };

  console.log(`\n📋 Status Breakdown:`);
  console.log(`   - Scheduled: ${statusCounts.SCHEDULED}`);
  console.log(`   - Confirmed: ${statusCounts.CONFIRMED}`);
  console.log(`   - Completed: ${statusCounts.COMPLETED}`);
  console.log(`   - Cancelled: ${statusCounts.CANCELLED}`);

  // Show breakdown by meeting type
  const typeCounts = {
    PHONE_CALL: appointments.filter(a => a.meetingType === 'PHONE_CALL').length,
    VIDEO_CALL: appointments.filter(a => a.meetingType === 'VIDEO_CALL').length,
    IN_PERSON: appointments.filter(a => a.meetingType === 'IN_PERSON').length,
  };

  console.log(`\n📞 Meeting Type Breakdown:`);
  console.log(`   - Phone Calls: ${typeCounts.PHONE_CALL}`);
  console.log(`   - Video Calls: ${typeCounts.VIDEO_CALL}`);
  console.log(`   - In-Person: ${typeCounts.IN_PERSON}`);

  console.log(`\n🎯 Testing Scenario:`);
  console.log(`   - The calendar is now ~${Math.round((appointmentsCreated / (weekdays.length * 9)) * 100)}% booked`);
  console.log(`   - This will test the voice AI agent's ability to:`);
  console.log(`     ✓ Handle limited availability`);
  console.log(`     ✓ Suggest alternative time slots`);
  console.log(`     ✓ Navigate a busy schedule`);
  console.log(`     ✓ Find the few remaining openings`);

  console.log(`\n✅ November 2025 calendar seeding complete!`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding appointments:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
