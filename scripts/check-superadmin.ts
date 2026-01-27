import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking super admin account...\n');
  
  const superAdmin = await prisma.user.findUnique({
    where: { email: 'superadmin@soshogle.com' },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true
    }
  });
  
  console.log('📋 Super Admin details:');
  console.log(JSON.stringify(superAdmin, null, 2));
  
  await prisma.$disconnect();
}

main();
