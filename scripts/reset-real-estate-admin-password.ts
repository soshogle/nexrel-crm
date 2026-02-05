import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') })
dotenv.config({ path: path.join(process.cwd(), '.env') })

const prisma = new PrismaClient()

async function main() {
  console.log('🔐 Resetting Real Estate Admin password...')

  const email = 'realestate@nexrel.com'
  const newPassword = 'RealEstate@2026!' // Change this after first login

  try {
    // Find the user
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      console.log('❌ User account not found with email:', email)
      console.log('   Please create the account first using: npx tsx scripts/create-real-estate-admin.ts')
      return
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12)

    // Update the password
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    })

    console.log('✅ Real Estate Admin password reset successfully!')
    console.log('')
    console.log('═══════════════════════════════════════════════')
    console.log('📧 Email:', email)
    console.log('🔑 New Password:', newPassword)
    console.log('🏢 Industry:', user.industry || 'Not set')
    console.log('👤 Role:', user.role)
    console.log('═══════════════════════════════════════════════')
    console.log('')
    console.log('⚠️  IMPORTANT SECURITY NOTE:')
    console.log('   1. Please change this password immediately after first login')
    console.log('   2. This account has admin access to Real Estate features')
    console.log('   3. Access the dashboard at: /dashboard')
    console.log('')
  } catch (error) {
    console.error('❌ Error resetting password:', error)
    throw error
  }
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
