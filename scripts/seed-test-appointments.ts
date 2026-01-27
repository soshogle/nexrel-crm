import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🎯 Starting appointment seeding for pharmacie4177@gmail.com...\n');

  // Find the user
  const user = await prisma.user.findUnique({
    where: { email: 'pharmacie4177@gmail.com' },
  });

  if (!user) {
    console.error('❌ User not found!');
    return;
  }

  console.log(`✅ Found user: ${user.name} (${user.email})\n`);

  // Create or update booking settings
  await prisma.bookingSettings.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      businessName: 'Pharmacie Test',
      bookingUrl: `book/${user.id}`,
      slotDuration: 30,
      bufferTime: 15,
      minNoticeHours: 2,
      advanceBookingDays: 30,
      availabilitySchedule: {
        monday: { enabled: true, start: '09:00', end: '18:00' },
        tuesday: { enabled: true, start: '09:00', end: '18:00' },
        wednesday: { enabled: true, start: '09:00', end: '18:00' },
        thursday: { enabled: true, start: '09:00', end: '18:00' },
        friday: { enabled: true, start: '09:00', end: '17:00' },
        saturday: { enabled: false, start: '', end: '' },
        sunday: { enabled: false, start: '', end: '' },
      },
    },
    update: {},
  });

  console.log('✅ Booking settings configured\n');

  // Get today's date and upcoming dates
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(today);
  dayAfter.setDate(dayAfter.getDate() + 2);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  // Create test appointments
  const appointments = [
    {
      userId: user.id,
      customerName: 'John Smith',
      customerEmail: 'john.smith@example.com',
      customerPhone: '+15551234567',
      appointmentDate: new Date(tomorrow.setHours(10, 0, 0, 0)),
      duration: 30,
      meetingType: 'PHONE_CALL',
      status: 'SCHEDULED',
      notes: 'Initial consultation call',
      confirmationCode: 'CALL001',
    },
    {
      userId: user.id,
      customerName: 'Sarah Johnson',
      customerEmail: 'sarah.j@example.com',
      customerPhone: '+15559876543',
      appointmentDate: new Date(tomorrow.setHours(14, 30, 0, 0)),
      duration: 45,
      meetingType: 'VIDEO_CALL',
      status: 'CONFIRMED',
      notes: 'Follow-up video consultation',
      confirmationCode: 'VIDEO001',
    },
    {
      userId: user.id,
      customerName: 'Michael Brown',
      customerEmail: 'mbrown@example.com',
      customerPhone: '+15552468135',
      appointmentDate: new Date(dayAfter.setHours(11, 0, 0, 0)),
      duration: 60,
      meetingType: 'IN_PERSON',
      status: 'SCHEDULED',
      notes: 'In-person pharmacy consultation',
      confirmationCode: 'PERSON001',
    },
    {
      userId: user.id,
      customerName: 'Emma Davis',
      customerEmail: 'emma.davis@example.com',
      customerPhone: '+15553692581',
      appointmentDate: new Date(dayAfter.setHours(15, 0, 0, 0)),
      duration: 30,
      meetingType: 'PHONE_CALL',
      status: 'CONFIRMED',
      notes: 'Prescription review call',
      confirmationCode: 'CALL002',
    },
    {
      userId: user.id,
      customerName: 'David Wilson',
      customerEmail: 'david.w@example.com',
      customerPhone: '+15558527419',
      appointmentDate: new Date(nextWeek.setHours(10, 30, 0, 0)),
      duration: 30,
      meetingType: 'PHONE_CALL',
      status: 'SCHEDULED',
      notes: 'Medication management consultation',
      confirmationCode: 'CALL003',
    },
    {
      userId: user.id,
      customerName: 'Lisa Anderson',
      customerEmail: 'lisa.anderson@example.com',
      customerPhone: '+15557531596',
      appointmentDate: new Date(nextWeek.setHours(13, 0, 0, 0)),
      duration: 45,
      meetingType: 'VIDEO_CALL',
      status: 'SCHEDULED',
      notes: 'Virtual health screening',
      confirmationCode: 'VIDEO002',
    },
  ];

  console.log('📅 Creating test appointments...\n');

  for (const appointmentData of appointments) {
    const created = await prisma.bookingAppointment.create({
      data: appointmentData,
    });
    console.log(`✅ Created: ${created.customerName} - ${created.meetingType} on ${created.appointmentDate.toLocaleString()}`);
    console.log(`   Confirmation Code: ${created.confirmationCode}`);
    console.log(`   Status: ${created.status}\n`);
  }

  // Summary
  console.log('\n📊 Summary:');
  const total = await prisma.bookingAppointment.count({ where: { userId: user.id } });
  const byType = await prisma.bookingAppointment.groupBy({
    by: ['meetingType'],
    where: { userId: user.id },
    _count: true,
  });
  
  console.log(`Total Appointments: ${total}`);
  byType.forEach(({ meetingType, _count }) => {
    console.log(`  ${meetingType}: ${_count}`);
  });

  console.log('\n✅ Appointment seeding complete!');
  console.log('\n🎤 You can now test the voice AI booking system:');
  console.log('   - Call your Twilio number');
  console.log('   - Say "I want to book an appointment"');
  console.log('   - The AI will check availability and book slots');
  console.log('   - Try different meeting types: phone, video, or in-person');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
