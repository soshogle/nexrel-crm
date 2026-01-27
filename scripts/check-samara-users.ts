import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking all users with "samara" in email...\n');
  
  const users = await prisma.user.findMany({
    where: {
      email: {
        contains: 'samara',
        mode: 'insensitive'
      }
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true
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
