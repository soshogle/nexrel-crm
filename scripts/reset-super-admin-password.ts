#!/usr/bin/env tsx
/**
 * Reset Super Admin Password
 * 
 * This script resets the password for the super admin user.
 * Usage: npx tsx scripts/reset-super-admin-password.ts
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🔐 Resetting Super Admin password...\n');

  const email = 'superadmin@soshogle.com';
  const newPassword = 'SuperAdmin@2024!'; // Change this after login

  try {
    // Find the super admin user
    const superAdmin = await prisma.user.findUnique({
      where: { email },
    });

    if (!superAdmin) {
      console.log('❌ Super Admin account not found with email:', email);
      console.log('   Please create the account first using: npx tsx scripts/create-super-admin.ts');
      return;
    }

    if (superAdmin.role !== 'SUPER_ADMIN') {
      console.log('⚠️  Warning: User found but role is not SUPER_ADMIN:', superAdmin.role);
      console.log('   Proceeding with password reset anyway...\n');
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update the password
    await prisma.user.update({
      where: { id: superAdmin.id },
      data: { password: hashedPassword },
    });

    console.log('✅ Super Admin password reset successfully!\n');
    console.log('═══════════════════════════════════════════════');
    console.log('📧 Email:', email);
    console.log('🔑 New Password:', newPassword);
    console.log('═══════════════════════════════════════════════');
    console.log('');
    console.log('⚠️  IMPORTANT SECURITY NOTE:');
    console.log('   1. Please change this password immediately after login');
    console.log('   2. Access the Platform Admin dashboard at: /platform-admin');
    console.log('   3. This account has full access to all users and data');
    console.log('');
  } catch (error: any) {
    console.error('❌ Error resetting password:', error.message);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
