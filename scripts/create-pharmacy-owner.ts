import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Creating pharmacy owner account...')

  const email = 'pharmacy@example.com' // Change this
  const password = 'pharmacy123' // Change this
  const name = 'Pharmacy Owner' // Change this

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  })

  if (existingUser) {
    console.log('❌ User with this email already exists')
    return
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 12)

  // Create the pharmacy owner user
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      role: 'BUSINESS_OWNER',
      // Leave industry null - they'll select it during onboarding
      industry: null,
      // Set onboarding as incomplete
      onboardingCompleted: false,
      // Optional: Pre-fill some business details
      businessCategory: 'pharmacy',
      phone: '(555) 123-4567', // Optional
    },
  })

  console.log('✅ Successfully created pharmacy owner account:')
  console.log('   Email:', email)
  console.log('   Password:', password)
  console.log('   Name:', name)
  console.log('   User ID:', user.id)
  console.log('\n📝 Next Steps:')
  console.log('   1. Share the login credentials with the pharmacy owner')
  console.log('   2. They should visit: https://go-high-or-show-goog-staging.abacusai.app/auth/signin')
  console.log('   3. After login, they will automatically be redirected to complete onboarding')
  console.log('   4. During onboarding, they will select "Healthcare" or "Retail" as their industry')
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
