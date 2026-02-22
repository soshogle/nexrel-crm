#!/usr/bin/env tsx
/**
 * Phase 4: Migrate CRM tables to Industry DBs
 *
 * For each industry, copies User (subset) + CRM tables (Lead, Deal, Campaign, etc.)
 * from source (DATABASE_URL) to industry DB (DATABASE_URL_{INDUSTRY}).
 *
 * Prerequisites:
 * - migrate-to-meta-db.ts run first (User in Meta)
 * - DATABASE_URL_{INDUSTRY} set for industries to migrate
 * - Migrations applied on each industry DB
 *
 * Usage: tsx scripts/migrate-to-industry-dbs.ts [--dry-run] [--industry=REAL_ESTATE]
 */

import 'dotenv/config'
import { prisma } from '@/lib/db'
import { getIndustryDb } from '@/lib/db/industry-db'
import type { IndustryDbKey } from '@/lib/db/industry-db'

const DRY_RUN = process.argv.includes('--dry-run')
const INDUSTRY_ARG = process.argv.find((a) => a.startsWith('--industry='))
const SINGLE_INDUSTRY = INDUSTRY_ARG?.split('=')[1] as IndustryDbKey | undefined

const INDUSTRIES: IndustryDbKey[] = [
  'ACCOUNTING', 'RESTAURANT', 'SPORTS_CLUB', 'CONSTRUCTION', 'LAW',
  'MEDICAL', 'DENTIST', 'MEDICAL_SPA', 'OPTOMETRIST', 'HEALTH_CLINIC',
  'REAL_ESTATE', 'HOSPITAL', 'TECHNOLOGY', 'ORTHODONTIST',
]

const BATCH_SIZE = 500

// CRM tables with userId - order respects FK (User first, then tables that only ref User)
const CRM_TABLES: { key: string; name: string }[] = [
  { key: 'lead', name: 'Lead' },
  { key: 'deal', name: 'Deal' },
  { key: 'campaign', name: 'Campaign' },
  { key: 'website', name: 'Website' },
  { key: 'task', name: 'Task' },
  { key: 'conversation', name: 'Conversation' },
  { key: 'workflow', name: 'Workflow' },
  { key: 'workflowTemplate', name: 'WorkflowTemplate' },
  { key: 'note', name: 'Note' },
  { key: 'message', name: 'Message' },
  { key: 'pipeline', name: 'Pipeline' },
  { key: 'referral', name: 'Referral' },
]

function toScalarData(r: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(r)) {
    if (v === null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' || v instanceof Date) {
      out[k] = v
    } else if (Array.isArray(v)) {
      // Skip relation arrays
    } else if (typeof v === 'object' && v !== null) {
      if (!('id' in v)) out[k] = v
    }
  }
  return out
}

async function migrateIndustry(industry: IndustryDbKey) {
  const envVar = `DATABASE_URL_${industry}`
  if (!process.env[envVar] && !DRY_RUN) {
    console.log(`⏭️  Skipping ${industry} (${envVar} not set)`)
    return
  }

  const source = prisma
  const target = getIndustryDb(industry)

  const users = await source.user.findMany({
    where: { industry },
    select: { id: true },
  })
  const userIds = new Set(users.map((u) => u.id))

  if (userIds.size === 0) {
    console.log(`⏭️  ${industry}: 0 users, skipping`)
    return
  }

  console.log(`\n📦 ${industry}: ${userIds.size} users`)

  if (DRY_RUN) {
    for (const { key, name } of CRM_TABLES) {
      const model = (source as any)[key]
      if (!model) continue
      const count = await model.count({ where: { userId: { in: Array.from(userIds) } } })
      if (count > 0) console.log(`   ${name}: ${count} rows`)
    }
    return
  }

  // 1. Copy User subset for FK integrity
  const userRows = await source.user.findMany({
    where: { id: { in: Array.from(userIds) } },
  })
  let migrated = 0
  for (const row of userRows) {
    try {
      const data = toScalarData(row as any)
      await target.user.upsert({
        where: { id: row.id },
        create: data as any,
        update: data as any,
      })
      migrated++
    } catch (e) {
      console.error(`   Error User ${row.id}:`, (e as Error).message)
    }
  }
  console.log(`   User: ${migrated} rows`)

  // 2. Copy CRM tables
  for (const { key, name } of CRM_TABLES) {
    const model = (source as any)[key]
    const targetModel = (target as any)[key]
    if (!model || !targetModel) continue

    const count = await model.count({ where: { userId: { in: Array.from(userIds) } } })
    if (count === 0) continue

    let tableMigrated = 0
    let cursor: string | undefined

    do {
      const batch = await model.findMany({
        where: { userId: { in: Array.from(userIds) } },
        take: BATCH_SIZE,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { id: 'asc' as const },
      })

      if (batch.length === 0) break

      for (const row of batch) {
        try {
          const data = toScalarData(row as any)
          await targetModel.upsert({
            where: { id: row.id },
            create: data as any,
            update: data as any,
          })
          tableMigrated++
        } catch (e) {
          console.error(`   Error ${name} ${row.id}:`, (e as Error).message)
        }
      }

      cursor = batch[batch.length - 1]?.id
    } while (cursor)

    console.log(`   ${name}: ${tableMigrated} rows`)
  }
}

async function main() {
  console.log('Phase 4: Migrate CRM tables to Industry DBs\n')
  if (DRY_RUN) console.log('🔍 DRY RUN - no writes\n')

  const industries = SINGLE_INDUSTRY ? [SINGLE_INDUSTRY] : INDUSTRIES

  try {
    await prisma.$queryRaw`SELECT 1`
    console.log('✅ Source DB connected')
  } catch (e) {
    console.error('❌ Source DB connection failed:', e)
    process.exit(1)
  }

  for (const industry of industries) {
    await migrateIndustry(industry)
  }

  console.log('\n✅ Industry DB migration complete')
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
