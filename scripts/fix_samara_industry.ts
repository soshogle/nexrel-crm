import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

config();
const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Fixing samara@soshogleagents.com industry...\n');
  
  const updatedUser = await prisma.user.update({
    where: { email: 'samara@soshogleagents.com' },
    data: {
      industry: 'MEDICAL', // Appropriate for pharmacy business
      onboardingCompleted: true // Mark onboarding as complete
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      businessCategory: true,
      industry: true,
      onboardingCompleted: true
    }
  });
  
  console.log('✅ User updated successfully:');
  console.log(JSON.stringify(updatedUser, null, 2));
  console.log('\n💡 The user can now log in and access the dashboard at /dashboard');
  
  await prisma.$disconnect();
}

main();
