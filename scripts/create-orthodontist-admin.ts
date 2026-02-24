import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

function getMetaPrisma(): PrismaClient | null {
  const url = process.env.DATABASE_URL_META
  if (!url || url === process.env.DATABASE_URL) return null
  return new PrismaClient({ datasources: { db: { url } } })
}

async function main() {
  console.log('🔐 Creating Orthodontist Admin account...\n')

  const email = 'orthodontist@nexrel.com'
  const password = 'Orthodontist@2026!' // Change this after first login
  const name = 'Orthodontist Admin'

  // Auth uses Meta DB - check there first for credentials login
  const metaPrisma = getMetaPrisma()
  const existingInMeta = metaPrisma
    ? await metaPrisma.user.findUnique({ where: { email } }).catch(() => null)
    : null
  const existingInMain = await prisma.user.findUnique({ where: { email } })

  if (existingInMeta || existingInMain) {
    console.log('❌ User account already exists with email:', email)
    console.log('   If you need to reset the password, please delete this user first.')
    metaPrisma?.$disconnect()
    return
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 12)

  const userData = {
    email,
    password: hashedPassword,
    name,
    role: 'BUSINESS_OWNER',
    industry: 'ORTHODONTIST' as const,
    onboardingCompleted: true,
    businessCategory: 'Orthodontist',
  }

  // Create in Meta DB first (auth reads from here for credentials)
  if (metaPrisma) {
    try {
      await metaPrisma.user.create({
        data: userData,
      })
      console.log('✅ Created user in Meta DB (auth)')
    } catch (e: any) {
      console.warn('⚠️ Could not create in Meta DB:', e?.message?.slice(0, 80))
    }
    await metaPrisma.$disconnect()
  }

  // Create in main DB (for seed scripts, etc.)
  const orthodontistAdmin = await prisma.user.create({
    data: userData,
  })

  console.log('✅ Orthodontist Admin account created successfully!')
  console.log('')
  console.log('═══════════════════════════════════════════════')
  console.log('📧 Email:', email)
  console.log('🔑 Password:', password)
  console.log('🏢 Industry: ORTHODONTIST')
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
