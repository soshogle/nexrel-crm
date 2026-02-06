import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🔐 Creating Orthodontist Admin account...\n')

  const email = 'orthodontist@nexrel.com'
  const password = 'Orthodontist@2026!' // Change this after first login
  const name = 'Orthodontist Admin'

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email }
  })

  if (existingUser) {
    console.log('❌ User account already exists with email:', email)
    console.log('   If you need to reset the password, please delete this user first.')
    return
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 12)

  // Create the orthodontist admin user
  // Note: Using DENTIST industry since orthodontists are dentists
  const orthodontistAdmin = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      role: 'BUSINESS_OWNER',
      industry: 'DENTIST', // Orthodontists use DENTIST industry
      onboardingCompleted: true, // Skip onboarding for admin account
      businessCategory: 'Orthodontist', // Specify orthodontist in business category
    },
  })

  console.log('✅ Orthodontist Admin account created successfully!')
  console.log('')
  console.log('═══════════════════════════════════════════════')
  console.log('📧 Email:', email)
  console.log('🔑 Password:', password)
  console.log('🏢 Industry: DENTIST')
  console.log('🏥 Business Category: Orthodontist')
  console.log('👤 Role: BUSINESS_OWNER')
  console.log('═══════════════════════════════════════════════')
  console.log('')
  console.log('⚠️  IMPORTANT SECURITY NOTE:')
  console.log('   1. Please change this password immediately after first login')
  console.log('   2. This account has admin access to Dental/Orthodontist features')
  console.log('   3. Access the dashboard at: /dashboard')
  console.log('   4. Test dental features at: /dashboard/dental-test')
  console.log('')
  console.log('🎯 Available Features:')
  console.log('   - Odontogram (2D & 3D)')
  console.log('   - Periodontal Charts')
  console.log('   - Treatment Plans')
  console.log('   - Procedure Logs')
  console.log('   - Dynamic Forms')
  console.log('   - Document Management')
  console.log('   - X-Ray Upload & AI Analysis')
  console.log('   - Touch-Screen Welcome System')
  console.log('   - Multi-Chair Agenda')
  console.log('   - RAMQ Integration')
  console.log('   - Electronic Signature')
  console.log('')
}

main()
  .catch((e) => {
    console.error('❌ Error creating Orthodontist Admin:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
