#!/usr/bin/env tsx
/**
 * Phase 4: Pre-migration prerequisite check
 *
 * Validates that all required env vars and DB connections are ready
 * before running migrate-to-meta-db and migrate-to-industry-dbs.
 *
 * Usage: tsx scripts/pre-migration-check.ts
 */

import 'dotenv/config'
import { prisma } from '@/lib/db'
import { getMetaDb } from '@/lib/db/meta-db'
import { getIndustryDb } from '@/lib/db/industry-db'

const INDUSTRIES = [
  'ACCOUNTING', 'RESTAURANT', 'SPORTS_CLUB', 'CONSTRUCTION', 'LAW',
  'MEDICAL', 'DENTIST', 'MEDICAL_SPA', 'OPTOMETRIST', 'HEALTH_CLINIC',
  'REAL_ESTATE', 'HOSPITAL', 'TECHNOLOGY', 'ORTHODONTIST',
]

async function main() {
  console.log('Phase 4: Pre-migration check\n')

  let ok = true

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not set')
    ok = false
  } else {
    try {
      await prisma.$queryRaw`SELECT 1`
      console.log('✅ Source DB (DATABASE_URL) connected')
    } catch (e) {
      console.error('❌ Source DB connection failed:', (e as Error).message)
      ok = false
    }
  }

  if (!process.env.DATABASE_URL_META) {
    console.warn('⚠️  DATABASE_URL_META not set – migrate-to-meta-db will skip (required for full migration)')
  } else {
    try {
      const meta = getMetaDb()
      await meta.$queryRaw`SELECT 1`
      console.log('✅ Meta DB (DATABASE_URL_META) connected')
    } catch (e) {
      console.error('❌ Meta DB connection failed:', (e as Error).message)
      ok = false
    }
  }

  let industryCount = 0
  for (const ind of INDUSTRIES) {
    const envVar = `DATABASE_URL_${ind}`
    if (process.env[envVar]) {
      try {
        const db = getIndustryDb(ind)
        await db.$queryRaw`SELECT 1`
        industryCount++
      } catch (e) {
        console.error(`❌ ${ind} DB connection failed:`, (e as Error).message)
        ok = false
      }
    }
  }
  console.log(`✅ Industry DBs configured: ${industryCount}/14`)

  if (ok) {
    console.log('\n✅ Pre-migration check passed. Ready to run migration.')
  } else {
    console.log('\n❌ Pre-migration check failed. Fix errors above before migrating.')
    process.exit(1)
  }

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
