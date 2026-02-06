/**
 * Create Orthodontist Team Members Script
 * 
 * Creates 5 orthodontist team members (professionals) for the dental practice.
 * These will appear in the professional selector for multi-chair agenda.
 * 
 * Usage: npx tsx scripts/create-orthodontist-team-members.ts
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config();

const prisma = new PrismaClient();

const MOCK_DATA_TAG = 'MOCK_DATA';

const orthodontists = [
  {
    name: 'Dr. Sarah Chen',
    email: 'sarah.chen@orthodontics.example.com',
    phone: '514-555-0201',
    role: 'MANAGER' as const,
  },
  {
    name: 'Dr. Marc Tremblay',
    email: 'marc.tremblay@orthodontics.example.com',
    phone: '514-555-0202',
    role: 'AGENT' as const,
  },
  {
    name: 'Dr. Emily Rodriguez',
    email: 'emily.rodriguez@orthodontics.example.com',
    phone: '514-555-0203',
    role: 'AGENT' as const,
  },
  {
    name: 'Dr. James Wilson',
    email: 'james.wilson@orthodontics.example.com',
    phone: '514-555-0204',
    role: 'AGENT' as const,
  },
  {
    name: 'Dr. Marie-Claire Dubois',
    email: 'marieclaire.dubois@orthodontics.example.com',
    phone: '514-555-0205',
    role: 'AGENT' as const,
  },
];

async function main() {
  console.log('👥 Creating Orthodontist Team Members...\n');

  // Find the main orthodontist user (practice owner)
  const practiceOwner = await prisma.user.findUnique({
    where: { email: 'orthodontist@nexrel.com' },
  });

  if (!practiceOwner) {
    console.log('❌ Orthodontist practice owner not found.');
    console.log('   Please run create-orthodontist-admin.ts first.');
    return;
  }

  console.log(`✅ Found practice owner: ${practiceOwner.name} (${practiceOwner.email})\n`);

  const createdMembers = [];

  for (const ortho of orthodontists) {
    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email: ortho.email },
    });

    if (!user) {
      // Create user account for the orthodontist
      const hashedPassword = await bcrypt.hash('Orthodontist2026!', 12);
      
      user = await prisma.user.create({
        data: {
          email: ortho.email,
          password: hashedPassword,
          name: ortho.name,
          role: 'USER',
          industry: 'DENTIST',
          businessCategory: 'Orthodontist',
          onboardingCompleted: true,
        },
      });
      console.log(`   ✅ Created user: ${ortho.name}`);
    } else {
      console.log(`   ℹ️  User already exists: ${ortho.name}`);
    }

    // Check if team member already exists
    const existingMember = await prisma.teamMember.findUnique({
      where: {
        userId_email: {
          userId: practiceOwner.id,
          email: ortho.email,
        },
      },
    });

    if (!existingMember) {
      // Create team member record
      const teamMember = await prisma.teamMember.create({
        data: {
          userId: practiceOwner.id,
          email: ortho.email,
          name: ortho.name,
          role: ortho.role,
          status: 'ACTIVE',
          phone: ortho.phone,
          joinedAt: new Date(),
          lastActiveAt: new Date(),
        },
      });
      createdMembers.push(teamMember);
      console.log(`   ✅ Created team member: ${ortho.name} (${ortho.role})`);
    } else {
      console.log(`   ℹ️  Team member already exists: ${ortho.name}`);
    }
  }

  console.log(`\n✅ Created ${createdMembers.length} orthodontist team members`);
  console.log(`\n📋 Team Members:`);
  orthodontists.forEach((ortho, index) => {
    console.log(`   ${index + 1}. ${ortho.name} - ${ortho.email} (${ortho.role})`);
  });
  console.log(`\n🔑 Default password for all accounts: Orthodontist2026!`);
  console.log(`\n⚠️  IMPORTANT: Change passwords after first login!`);
}

main()
  .catch((e) => {
    console.error('❌ Error creating team members:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
