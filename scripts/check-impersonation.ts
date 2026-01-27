import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking for impersonation sessions...\n');
  
  const samaraUser = await prisma.user.findUnique({
    where: { email: 'samara@soshogleagents.com' }
  });
  
  if (!samaraUser) {
    console.log('❌ User not found');
    await prisma.$disconnect();
    return;
  }
  
  console.log('✅ Found user:', {
    id: samaraUser.id,
    email: samaraUser.email,
    name: samaraUser.name,
    role: samaraUser.role
  });
  
  // Check for any active SuperAdminSession for this user
  const impersonationSessions = await prisma.superAdminSession.findMany({
    where: {
      impersonatedUserId: samaraUser.id,
      isActive: true
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
    }
  });
  
  console.log('\n📋 Active impersonation sessions:', impersonationSessions.length);
  if (impersonationSessions.length > 0) {
    impersonationSessions.forEach((sess, i) => {
      console.log(`\nSession ${i + 1}:`);
      console.log(`  Session ID: ${sess.id}`);
      console.log(`  Token: ${sess.sessionToken}`);
      console.log(`  Super Admin: ${sess.superAdmin.name} (${sess.superAdmin.email})`);
      console.log(`  Impersonating: ${sess.impersonatedUser.name} (${sess.impersonatedUser.email})`);
      console.log(`  Created: ${sess.createdAt}`);
      console.log(`  Last Activity: ${sess.lastActivity}`);
    });
  } else {
    console.log('  None found');
  }
  
  // Check for any sessions where this user is the super admin
  const asSuperAdmin = await prisma.superAdminSession.findMany({
    where: {
      superAdminId: samaraUser.id,
      isActive: true
    },
    include: {
      impersonatedUser: {
        select: {
          email: true,
          name: true
        }
      }
    }
  });
  
  console.log('\n📋 Sessions where this user is the super admin:', asSuperAdmin.length);
  if (asSuperAdmin.length > 0) {
    asSuperAdmin.forEach((sess, i) => {
      console.log(`\nSession ${i + 1}:`);
      console.log(`  Session ID: ${sess.id}`);
      console.log(`  Token: ${sess.sessionToken}`);
      console.log(`  Impersonating: ${sess.impersonatedUser.name} (${sess.impersonatedUser.email})`);
      console.log(`  Created: ${sess.createdAt}`);
      console.log(`  Last Activity: ${sess.lastActivity}`);
    });
  } else {
    console.log('  None found');
  }
  
  await prisma.$disconnect();
}

main();
