import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Deactivating active impersonation session...\n');
  
  const activeSession = await prisma.superAdminSession.findFirst({
    where: {
      id: 'cmigsmqux0001o008w275mhlk',
      isActive: true
    },
    include: {
      superAdmin: { select: { email: true } },
      impersonatedUser: { select: { email: true } }
    }
  });
  
  if (!activeSession) {
    console.log('❌ Session not found or already inactive');
    await prisma.$disconnect();
    return;
  }
  
  console.log('Found active session:');
  console.log(`  Super Admin: ${activeSession.superAdmin.email}`);
  console.log(`  Impersonating: ${activeSession.impersonatedUser.email}`);
  console.log(`  Started: ${activeSession.startedAt}`);
  console.log('');
  
  const updated = await prisma.superAdminSession.update({
    where: { id: 'cmigsmqux0001o008w275mhlk' },
    data: {
      isActive: false,
      endedAt: new Date()
    }
  });
  
  console.log('✅ Session deactivated successfully!');
  console.log(`  Ended at: ${updated.endedAt}`);
  
  await prisma.$disconnect();
}

main();
