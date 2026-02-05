import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') })
dotenv.config({ path: path.join(process.cwd(), '.env') })

const prisma = new PrismaClient()

async function main() {
  console.log('🔐 Creating additional Real Estate Admin user...\n')

  // Get email from command line argument or use default
  const emailArg = process.argv[2]
  const email = emailArg || 'realestate2@nexrel.com'
  
  // Generate password
  const password = 'RealEstateAdmin@2026!'

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email }
  })

  if (existingUser) {
    console.log('❌ User account already exists with email:', email)
    console.log('   Please use a different email address.')
    console.log('   Usage: npx tsx scripts/create-real-estate-admin-user.ts <email>')
    return
  }

  // Get the existing real estate admin to match settings
  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'realestate@nexrel.com' },
    select: {
      industry: true,
      role: true,
      agencyId: true,
    }
  })

  if (!existingAdmin) {
    console.log('❌ Could not find existing real estate admin account (realestate@nexrel.com)')
    return
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 12)

  // Create the new admin user
  const newAdmin = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name: 'Real Estate Admin',
      role: existingAdmin.role, // Match the role of the existing admin
      industry: existingAdmin.industry, // Match the industry
      agencyId: existingAdmin.agencyId, // Match the agency if exists
      onboardingCompleted: true, // Skip onboarding for admin account
    },
  })

  console.log('✅ Real Estate Admin user created successfully!')
  console.log('')
  console.log('═══════════════════════════════════════════════')
  console.log('📧 Email:', email)
  console.log('🔑 Password:', password)
  console.log('🏢 Industry:', newAdmin.industry || 'Not set')
  console.log('👤 Role:', newAdmin.role)
  console.log('🔗 Agency ID:', newAdmin.agencyId || 'None (standalone account)')
  console.log('═══════════════════════════════════════════════')
  console.log('')
  console.log('⚠️  IMPORTANT SECURITY NOTE:')
  console.log('   1. Please change this password immediately after first login')
  console.log('   2. This account has admin access to Real Estate features')
  console.log('   3. Access the dashboard at: /dashboard')
  console.log('')
  console.log('💡 To create another user with a custom email:')
  console.log('   npx tsx scripts/create-real-estate-admin-user.ts <email>')
  console.log('')
}

main()
  .catch((e) => {
    console.error('❌ Error creating Real Estate Admin user:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
