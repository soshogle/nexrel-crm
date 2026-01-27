import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

config();
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking user details...\n');
  
  const user1 = await prisma.user.findUnique({
    where: { email: 'samara@soshogleagents.com' },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      parentRole: true,
      businessCategory: true,
      businessDescription: true,
      industry: true,
      onboardingCompleted: true,
      createdAt: true
    }
  });
  
  const user2 = await prisma.user.findUnique({
    where: { email: 'samara-temp-backup@soshogleagents.com' },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      parentRole: true,
      businessCategory: true,
      businessDescription: true,
      industry: true,
      onboardingCompleted: true,
      createdAt: true
    }
  });
  
  console.log('📋 User: samara@soshogleagents.com');
  console.log(JSON.stringify(user1, null, 2));
  console.log('\n📋 User: samara-temp-backup@soshogleagents.com');
  console.log(JSON.stringify(user2, null, 2));
  
  await prisma.$disconnect();
}

main();
