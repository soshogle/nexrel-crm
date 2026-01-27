import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking for impersonation sessions related to samara users...\n');
  
  // Get all samara users
  const samaraUsers = await prisma.user.findMany({
    where: {
      email: {
        contains: 'samara',
        mode: 'insensitive'
      }
    },
    select: {
      id: true,
      email: true,
      name: true
    }
  });
  
  console.log('Found Samara users:');
  samaraUsers.forEach(user => {
    console.log(`  - ${user.email} (${user.name}) - ID: ${user.id}`);
  });
  console.log('');
  
  // Check for any SuperAdminSession records involving these users
  const userIds = samaraUsers.map(u => u.id);
  
  const sessions = await prisma.superAdminSession.findMany({
    where: {
      OR: [
        { superAdminId: { in: userIds } },
        { impersonatedUserId: { in: userIds } }
      ]
    },
    include: {
      superAdmin: {
        select: {
          email: true,
          name: true
        }
      },
      impersonatedUser: {
        select: {
          email: true,
          name: true
        }
      }
    },
    orderBy: {
      startedAt: 'desc'
    }
  });
  
  if (sessions.length === 0) {
    console.log('✅ No impersonation sessions found for samara users');
  } else {
    console.log(`⚠️  Found ${sessions.length} impersonation session(s):\n`);
    
    sessions.forEach((session, i) => {
      console.log(`Session ${i + 1}:`);
      console.log(`  Session ID: ${session.id}`);
      console.log(`  Super Admin: ${session.superAdmin.email} (${session.superAdmin.name})`);
      console.log(`  Impersonating: ${session.impersonatedUser.email} (${session.impersonatedUser.name})`);
      console.log(`  Is Active: ${session.isActive}`);
      console.log(`  Started: ${session.startedAt}`);
      console.log(`  Last Activity: ${session.lastActivity || 'N/A'}`);
      console.log(`  Ended: ${session.endedAt || 'Still active'}`);
      console.log('');
    });
  }
  
  await prisma.$disconnect();
}

main();
