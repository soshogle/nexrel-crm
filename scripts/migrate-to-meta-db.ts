#!/usr/bin/env tsx
/**
 * Phase 4: Migrate auth tables to Meta DB
 *
 * Copies User, Session, Account, Agency, AdminSession, SuperAdminSession
 * from source (DATABASE_URL) to target (DATABASE_URL_META).
 *
 * Prerequisites:
 * - DATABASE_URL_META set and migrations applied on Meta DB
 * - Full backup of source DB
 *
 * Usage: tsx scripts/migrate-to-meta-db.ts [--dry-run]
 */

import 'dotenv/config'
import { prisma } from '@/lib/db'
import { getMetaDb } from '@/lib/db/meta-db'

const DRY_RUN = process.argv.includes('--dry-run')
const BATCH_SIZE = 500

async function main() {
  console.log('Phase 4: Migrate auth tables to Meta DB\n')
  if (DRY_RUN) console.log('🔍 DRY RUN - no writes will be performed\n')

  const metaUrl = process.env.DATABASE_URL_META
  if (!metaUrl && !DRY_RUN) {
    console.error('❌ DATABASE_URL_META not set. Set it to the Meta DB connection string.')
    process.exit(1)
  }

  const source = prisma
  const target = getMetaDb()

  // Verify connections
  try {
    await source.$queryRaw`SELECT 1`
    console.log('✅ Source DB connected')
  } catch (e) {
    console.error('❌ Source DB connection failed:', e)
    process.exit(1)
  }

  try {
    await target.$queryRaw`SELECT 1`
    console.log('✅ Target Meta DB connected\n')
  } catch (e) {
    console.error('❌ Target Meta DB connection failed:', e)
    process.exit(1)
  }

  const tables: { name: string; key: string; order: number }[] = [
    { name: 'Agency', key: 'agency', order: 1 },
    { name: 'User', key: 'user', order: 2 },
    { name: 'Account', key: 'account', order: 3 },
    { name: 'Session', key: 'session', order: 4 },
    { name: 'AdminSession', key: 'adminSession', order: 5 },
    { name: 'SuperAdminSession', key: 'superAdminSession', order: 6 },
  ]

  for (const { name, key } of tables.sort((a, b) => a.order - b.order)) {
    const model = (source as any)[key]
    const targetModel = (target as any)[key]
    if (!model || !targetModel) {
      console.warn(`⚠️  Skipping ${name} (model not found)`)
      continue
    }

    const count = await model.count()
    console.log(`📦 ${name}: ${count} rows`)

    if (count === 0) continue
    if (DRY_RUN) continue

    let migrated = 0
    let cursor: string | undefined

    do {
      const batch = await model.findMany({
        take: BATCH_SIZE,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { id: 'asc' },
      })

      if (batch.length === 0) break

      // Omit relation fields: arrays (one-to-many) and nested objects with id (many-to-one)
      const toScalarData = (r: Record<string, unknown>) => {
        const out: Record<string, unknown> = {}
        for (const [k, v] of Object.entries(r)) {
          if (v === null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' || v instanceof Date) {
            out[k] = v
          } else if (Array.isArray(v)) {
            // Skip relation arrays
          } else if (typeof v === 'object' && v !== null) {
            // Keep Json fields (plain objects), skip relation objects (have id)
            if (!('id' in v) || Array.isArray(v)) {
              out[k] = v
            }
          }
        }
        return out
      }

      for (const row of batch) {
        try {
          const data = toScalarData(row as Record<string, unknown>)
          await targetModel.upsert({
            where: { id: row.id },
            create: data as any,
            update: data as any,
          })
          migrated++
        } catch (e) {
          console.error(`   Error upserting ${name} ${row.id}:`, (e as Error).message)
        }
      }

      cursor = batch[batch.length - 1]?.id
      process.stdout.write(`   Migrated ${migrated}/${count}\r`)
    } while (cursor)

    console.log(`   ✅ ${name}: ${migrated} rows migrated\n`)
  }

  console.log('✅ Meta DB migration complete')
  await source.$disconnect()
  await target.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
