import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();
const prisma = new PrismaClient();

async function checkUserRole() {
  try {
    // Get all super admin users
    const superAdmins = await prisma.user.findMany({
      where: { role: 'SUPER_ADMIN' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      }
    });
    
    console.log('\n🔑 Super Admin Users:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (superAdmins.length === 0) {
      console.log('⚠️ No super admin users found!');
    } else {
      superAdmins.forEach(admin => {
        console.log(`\nName: ${admin.name || 'N/A'}`);
        console.log(`Email: ${admin.email}`);
        console.log(`Role: ${admin.role}`);
        console.log(`ID: ${admin.id}`);
      });
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserRole();
