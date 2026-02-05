import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') })
dotenv.config({ path: path.join(process.cwd(), '.env') })

const prisma = new PrismaClient()

async function main() {
  console.log('🔐 Creating Real Estate Admin account...')

  const email = 'realestate@nexrel.com'
  const password = 'RealEstate@2026!' // Change this after first login
  const name = 'Real Estate Admin'

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

  // Create the real estate admin user
  const realEstateAdmin = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      role: 'BUSINESS_OWNER',
      industry: 'REAL_ESTATE',
      onboardingCompleted: true, // Skip onboarding for admin account
    },
  })

  console.log('✅ Real Estate Admin account created successfully!')
  console.log('')
  console.log('═══════════════════════════════════════════════')
  console.log('📧 Email:', email)
  console.log('🔑 Password:', password)
  console.log('🏢 Industry: REAL_ESTATE')
  console.log('👤 Role: BUSINESS_OWNER')
  console.log('═══════════════════════════════════════════════')
  console.log('')
  console.log('⚠️  IMPORTANT SECURITY NOTE:')
  console.log('   1. Please change this password immediately after first login')
  console.log('   2. This account has admin access to Real Estate features')
  console.log('   3. Access the dashboard at: /dashboard')
  console.log('')
}

main()
  .catch((e) => {
    console.error('❌ Error creating Real Estate Admin:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
