import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Checking appointment ownership...\n');
  
  const appointments = await prisma.bookingAppointment.findMany({
    where: {
      appointmentDate: {
        gte: new Date('2025-11-01'),
        lt: new Date('2025-12-01'),
      },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    take: 5,
  });

  if (appointments.length > 0) {
    console.log('Sample appointments with user info:');
    appointments.forEach(apt => {
      console.log(`- ${apt.customerName} -> User: ${apt.user.name} (${apt.user.email})`);
    });
    
    // Group by user
    const allAppointments = await prisma.bookingAppointment.groupBy({
      by: ['userId'],
      where: {
        appointmentDate: {
          gte: new Date('2025-11-01'),
          lt: new Date('2025-12-01'),
        },
      },
      _count: true,
    });
    
    console.log('\nAppointments by user:');
    for (const group of allAppointments) {
      const user = await prisma.user.findUnique({
        where: { id: group.userId },
        select: { name: true, email: true },
      });
      console.log(`${user?.name} (${user?.email}): ${group._count} appointments`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
