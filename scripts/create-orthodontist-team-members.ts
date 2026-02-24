/**
 * Create Orthodontist Team Members Script
 *
 * Creates 10 orthodontist team members (human employees) for the dental practice.
 * Uses orthodontist DB when DATABASE_URL_ORTHODONTIST is set.
 *
 * Usage: npx tsx scripts/create-orthodontist-team-members.ts
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { findOrthodontistUser, getOrthoPrisma } from './seed-orthodontist-db-helper';

dotenv.config({ path: '.env.local' });
dotenv.config();

const orthodontists = [
  { name: 'Dr. Sarah Chen', email: 'sarah.chen@orthodontics.example.com', phone: '514-555-0201', role: 'MANAGER' as const },
  { name: 'Dr. Marc Tremblay', email: 'marc.tremblay@orthodontics.example.com', phone: '514-555-0202', role: 'AGENT' as const },
  { name: 'Dr. Emily Rodriguez', email: 'emily.rodriguez@orthodontics.example.com', phone: '514-555-0203', role: 'AGENT' as const },
  { name: 'Dr. James Wilson', email: 'james.wilson@orthodontics.example.com', phone: '514-555-0204', role: 'AGENT' as const },
  { name: 'Dr. Marie-Claire Dubois', email: 'marieclaire.dubois@orthodontics.example.com', phone: '514-555-0205', role: 'AGENT' as const },
  { name: 'Sophie Laurent', email: 'sophie.laurent@orthodontics.example.com', phone: '514-555-0206', role: 'AGENT' as const },
  { name: 'Dr. David Kim', email: 'david.kim@orthodontics.example.com', phone: '514-555-0207', role: 'AGENT' as const },
  { name: 'Isabelle Martin', email: 'isabelle.martin@orthodontics.example.com', phone: '514-555-0208', role: 'AGENT' as const },
  { name: 'Dr. Thomas Nguyen', email: 'thomas.nguyen@orthodontics.example.com', phone: '514-555-0209', role: 'AGENT' as const },
  { name: 'Amélie Bernard', email: 'amelie.bernard@orthodontics.example.com', phone: '514-555-0210', role: 'AGENT' as const },
];

async function main() {
  console.log('👥 Creating Orthodontist Team Members (10 human employees)...\n');

  const practiceOwner = await findOrthodontistUser().catch(() => null);
  if (!practiceOwner) {
    console.log('❌ Orthodontist practice owner not found.');
    console.log('   Please run create-orthodontist-admin.ts first.');
    process.exit(1);
  }

  const prisma = process.env.DATABASE_URL_ORTHODONTIST ? getOrthoPrisma() : new PrismaClient() as any;
  console.log(`✅ Found practice owner: ${practiceOwner.name} (${practiceOwner.email})\n`);

  const createdMembers = [];

  for (const ortho of orthodontists) {
    let user = await prisma.user.findUnique({ where: { email: ortho.email } });

    if (!user) {
      const hashedPassword = await bcrypt.hash('Orthodontist2026!', 12);
      user = await prisma.user.create({
        data: {
          email: ortho.email,
          password: hashedPassword,
          name: ortho.name,
          role: 'USER',
          industry: 'ORTHODONTIST',
          businessCategory: 'Orthodontist',
          onboardingCompleted: true,
        },
      });
      console.log(`   ✅ Created user: ${ortho.name}`);
    } else {
      console.log(`   ℹ️  User already exists: ${ortho.name}`);
    }

    const existingMember = await prisma.teamMember.findUnique({
      where: { userId_email: { userId: practiceOwner.id, email: ortho.email } },
    });

    if (!existingMember) {
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
    const p = process.env.DATABASE_URL_ORTHODONTIST ? getOrthoPrisma() : new PrismaClient();
    await p.$disconnect();
  });
