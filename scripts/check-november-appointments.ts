import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Checking for November 2025 appointments...\n');
  
  const appointments = await prisma.bookingAppointment.findMany({
    where: {
      appointmentDate: {
        gte: new Date('2025-11-01'),
        lt: new Date('2025-12-01'),
      },
    },
    orderBy: { appointmentDate: 'asc' },
  });

  console.log(`Found ${appointments.length} appointments for November 2025`);
  
  if (appointments.length > 0) {
    console.log('\nAppointments:');
    appointments.forEach(apt => {
      console.log(`- ${apt.customerName} on ${apt.appointmentDate.toISOString()} (Status: ${apt.status})`);
    });
  } else {
    console.log('\n❌ No appointments found for November 2025');
    console.log('Mock data needs to be created.');
  }
  
  // Check all appointments
  const allAppointments = await prisma.bookingAppointment.findMany({
    orderBy: { appointmentDate: 'desc' },
    take: 10,
  });
  
  console.log(`\nTotal appointments in database: ${allAppointments.length}`);
  if (allAppointments.length > 0) {
    console.log('Most recent appointments:');
    allAppointments.forEach(apt => {
      console.log(`- ${apt.customerName} on ${apt.appointmentDate.toISOString()}`);
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
