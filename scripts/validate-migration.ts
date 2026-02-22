#!/usr/bin/env tsx
/**
 * Phase 4: Validate migration - compare row counts between source and targets
 *
 * Compares Meta DB and Industry DBs against source (DATABASE_URL) to verify
 * migration completeness.
 *
 * Usage: tsx scripts/validate-migration.ts
 */

import 'dotenv/config'
import { prisma } from '@/lib/db'
import { getMetaDb } from '@/lib/db/meta-db'
import { getIndustryDb } from '@/lib/db/industry-db'
import type { IndustryDbKey } from '@/lib/db/industry-db'

const META_TABLES = ['agency', 'user', 'account', 'session', 'adminSession', 'superAdminSession']
const CRM_TABLES = ['lead', 'deal', 'campaign', 'website', 'task', 'conversation', 'workflow', 'workflowTemplate', 'note', 'message', 'pipeline', 'referral']

const INDUSTRIES: IndustryDbKey[] = [
  'ACCOUNTING', 'RESTAURANT', 'SPORTS_CLUB', 'CONSTRUCTION', 'LAW',
  'MEDICAL', 'DENTIST', 'MEDICAL_SPA', 'OPTOMETRIST', 'HEALTH_CLINIC',
  'REAL_ESTATE', 'HOSPITAL', 'TECHNOLOGY', 'ORTHODONTIST',
]

async function getCount(db: any, tableKey: string): Promise<number> {
  const model = (db as any)[tableKey]
  if (!model) return -1
  try {
    return await model.count()
  } catch {
    return -1
  }
}

async function main() {
  console.log('Phase 4: Validate migration\n')

  const source = prisma

  try {
    await source.$queryRaw`SELECT 1`
    console.log('✅ Source DB connected\n')
  } catch (e) {
    console.error('❌ Source DB connection failed:', e)
    process.exit(1)
  }

  // Meta DB validation
  if (process.env.DATABASE_URL_META) {
    console.log('📊 Meta DB validation')
    const meta = getMetaDb()
    try {
      await meta.$queryRaw`SELECT 1`
    } catch (e) {
      console.error('❌ Meta DB connection failed:', e)
    }

    let metaOk = true
    for (const key of META_TABLES) {
      const srcCount = await getCount(source, key)
      const metaCount = await getCount(meta, key)
      const status = srcCount === metaCount ? '✅' : '❌'
      if (srcCount !== metaCount) metaOk = false
      console.log(`   ${key}: source=${srcCount} meta=${metaCount} ${status}`)
    }
    console.log(metaOk ? '   Meta DB: PASS\n' : '   Meta DB: FAIL\n')
  } else {
    console.log('⏭️  DATABASE_URL_META not set, skipping Meta validation\n')
  }

  // Industry DB validation
  console.log('📊 Industry DB validation')
  for (const industry of INDUSTRIES) {
    const envVar = `DATABASE_URL_${industry}`
    if (!process.env[envVar]) continue

    const target = getIndustryDb(industry)
    const userIds = new Set((await source.user.findMany({ where: { industry }, select: { id: true } })).map((u) => u.id))

    if (userIds.size === 0) {
      console.log(`   ${industry}: 0 users, skipping`)
      continue
    }

    let industryOk = true
    for (const key of CRM_TABLES) {
      const model = (source as any)[key]
      if (!model) continue

      const srcCount = await model.count({ where: { userId: { in: Array.from(userIds) } } })
      const tgtCount = await getCount(target, key)

      // Target may have more (from other runs) - we check source <= target for migrated tables
      const status = tgtCount >= srcCount ? '✅' : '❌'
      if (tgtCount < srcCount) industryOk = false
      if (srcCount > 0 || tgtCount > 0) {
        console.log(`   ${industry} ${key}: source=${srcCount} target=${tgtCount} ${status}`)
      }
    }
    console.log(`   ${industry}: ${industryOk ? 'PASS' : 'FAIL'}\n`)
  }

  console.log('✅ Validation complete')
  await source.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
