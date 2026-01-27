import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAppointments() {
  try {
    // Find the pharmacy owner
    const user = await prisma.user.findUnique({
      where: { email: 'samara@soshogleagents.com' },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('\n✅ User found:', user);

    // Get ALL appointments for this user (no filters)
    const allAppointments = await prisma.bookingAppointment.findMany({
      where: {
        userId: user.id,
      },
      select: {
        id: true,
        appointmentDate: true,
        duration: true,
        customerName: true,
        status: true,
        createdAt: true,
      },
      orderBy: {
        appointmentDate: 'asc',
      },
    });

    console.log('\n📊 Total appointments for this user:', allAppointments.length);

    // Filter by November 2025
    const november2025 = allAppointments.filter(apt => {
      if (!apt.appointmentDate) return false;
      const date = new Date(apt.appointmentDate);
      return date.getMonth() === 10 && date.getFullYear() === 2025; // Month 10 = November
    });

    console.log('📅 November 2025 appointments:', november2025.length);

    // Show first 5 November appointments
    if (november2025.length > 0) {
      console.log('\n📋 First 5 November 2025 appointments:');
      november2025.slice(0, 5).forEach((apt, idx) => {
        console.log(`  ${idx + 1}. ${apt.customerName} - ${apt.appointmentDate?.toISOString()} - ${apt.status}`);
      });
    }

    // Check for invalid dates
    const invalidDates = allAppointments.filter(apt => {
      return !apt.appointmentDate || isNaN(new Date(apt.appointmentDate).getTime());
    });

    if (invalidDates.length > 0) {
      console.log('\n⚠️  Found', invalidDates.length, 'appointments with invalid dates');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAppointments();
