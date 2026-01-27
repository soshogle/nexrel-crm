import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUserCreator() {
  try {
    // Find the user
    const user = await prisma.user.findUnique({
      where: {
        email: 'beshater@gmail.com'
      },
      include: {
        agency: true,
      }
    });

    if (!user) {
      console.log('❌ User not found with email: beshater@gmail.com');
      return;
    }

    console.log('✅ User found:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('User Details:');
    console.log('  ID:', user.id);
    console.log('  Name:', user.name);
    console.log('  Email:', user.email);
    console.log('  Role:', user.role);
    console.log('  Created At:', user.createdAt);
    console.log('  Agency ID:', user.agencyId);
    console.log('  Account Status:', user.accountStatus);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Check audit logs for this user creation
    console.log('\nChecking audit logs...');
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        OR: [
          { entityId: user.id },
          { 
            action: 'CREATE',
            entityType: 'USER',
            metadata: {
              path: ['email'],
              equals: 'beshater@gmail.com'
            }
          }
        ]
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    if (auditLogs.length > 0) {
      console.log('\n📋 Audit Logs Found:');
      auditLogs.forEach((log, index) => {
        console.log(`\n  Log ${index + 1}:`);
        console.log('    Action:', log.action);
        console.log('    Entity Type:', log.entityType);
        console.log('    Created At:', log.createdAt);
        console.log('    Created By User:');
        console.log('      Name:', log.user?.name || 'N/A');
        console.log('      Email:', log.user?.email || 'N/A');
        console.log('      Role:', log.user?.role || 'N/A');
        if (log.metadata) {
          console.log('    Metadata:', JSON.stringify(log.metadata, null, 2));
        }
      });
    } else {
      console.log('\n⚠️  No audit logs found for this user creation');
    }

    // Check if created via platform admin
    console.log('\n\nChecking platform admin user creation patterns...');
    
    // Find all SUPER_ADMIN users
    const superAdmins = await prisma.user.findMany({
      where: {
        role: 'SUPER_ADMIN'
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true
      }
    });

    console.log('\n👑 Super Admin Users:');
    superAdmins.forEach((admin) => {
      console.log(`  - ${admin.name} (${admin.email})`);
      console.log(`    Created: ${admin.createdAt}`);
    });

    // Check timing - was this user created shortly after any admin actions?
    console.log('\n\n⏰ User Creation Timeline:');
    console.log(`User "${user.name}" was created at: ${user.createdAt}`);
    
    // Check for users created around the same time
    const userCreatedTime = new Date(user.createdAt);
    const fiveMinutesBefore = new Date(userCreatedTime.getTime() - 5 * 60 * 1000);
    const fiveMinutesAfter = new Date(userCreatedTime.getTime() + 5 * 60 * 1000);

    const recentAuditLogs = await prisma.auditLog.findMany({
      where: {
        createdAt: {
          gte: fiveMinutesBefore,
          lte: fiveMinutesAfter
        },
        entityType: 'USER'
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    if (recentAuditLogs.length > 0) {
      console.log('\n📅 Related audit activity within 5 minutes:');
      recentAuditLogs.forEach((log) => {
        console.log(`  - ${log.action} by ${log.user?.name || 'Unknown'} (${log.user?.email || 'N/A'})`);
        console.log(`    Time: ${log.createdAt}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserCreator();
