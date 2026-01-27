import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🔐 Creating Super Admin account...')

  const email = 'superadmin@soshogle.com'
  const password = 'SuperAdmin@2024!' // Change this after first login
  const name = 'Super Administrator'

  // Check if super admin already exists
  const existingSuperAdmin = await prisma.user.findUnique({
    where: { email }
  })

  if (existingSuperAdmin) {
    console.log('❌ Super Admin account already exists with email:', email)
    console.log('   If you need to reset the password, please delete this user first.')
    return
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 12)

  // Create the super admin user
  const superAdmin = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      role: 'SUPER_ADMIN',
      onboardingCompleted: true, // Super admin doesn't need onboarding
      industry: null, // Super admin doesn't have an industry
    },
  })

  console.log('✅ Super Admin account created successfully!')
  console.log('')
  console.log('═══════════════════════════════════════════════')
  console.log('📧 Email:', email)
  console.log('🔑 Password:', password)
  console.log('🔗 Login URL: https://go-high-or-show-goog-staging.abacusai.app/auth/signin')
  console.log('═══════════════════════════════════════════════')
  console.log('')
  console.log('⚠️  IMPORTANT SECURITY NOTE:')
  console.log('   1. Please change this password immediately after first login')
  console.log('   2. Access the Platform Admin dashboard at: /platform-admin')
  console.log('   3. This account has full access to all users and data')
  console.log('')
}

main()
  .catch((e) => {
    console.error('❌ Error creating Super Admin:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
