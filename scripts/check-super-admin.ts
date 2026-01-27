import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

async function checkSuperAdmin() {
  try {
    const superAdmin = await prisma.user.findUnique({
      where: { email: 'superadmin@soshogle.com' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        industry: true,
        onboardingCompleted: true
      }
    });
    
    if (superAdmin) {
      console.log('✅ Super Admin account found:');
      console.log(JSON.stringify(superAdmin, null, 2));
    } else {
      console.log('❌ Super Admin account not found!');
      console.log('Creating super admin account...');
      
      const hashedPassword = await bcryptjs.hash('SuperAdmin@2024!', 10);
      
      const newSuperAdmin = await prisma.user.create({
        data: {
          email: 'superadmin@soshogle.com',
          password: hashedPassword,
          name: 'Super Administrator',
          role: 'SUPER_ADMIN',
          onboardingCompleted: true,
          industry: null
        }
      });
      
      console.log('✅ Super Admin account created:');
      console.log(JSON.stringify(newSuperAdmin, null, 2));
      console.log('');
      console.log('🔐 Login credentials:');
      console.log('Email: superadmin@soshogle.com');
      console.log('Password: SuperAdmin@2024!');
      console.log('URL: https://soshogleagents.com/platform-admin');
    }
  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkSuperAdmin();
