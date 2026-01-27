import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking for samara users...\n');
  
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: 'samara', mode: 'insensitive' } },
        { name: { contains: 'samara', mode: 'insensitive' } }
      ]
    }
  });
  
  console.log(`Found ${users.length} user(s):\n`);
  users.forEach((user, i) => {
    console.log(`User ${i + 1}:`);
    console.log(`  ID: ${user.id}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Name: ${user.name}`);
    console.log(`  Role: ${user.role}`);
    console.log(`  Created: ${user.createdAt}`);
    console.log('');
  });
  
  await prisma.$disconnect();
}

main();
