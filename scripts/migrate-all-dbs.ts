#!/usr/bin/env tsx
/**
 * Run Prisma migrate deploy on each DATABASE_URL_* set in .env
 *
 * Use for Phase 4: apply schema to all 15 DBs (Meta + 14 industry).
 *
 * Usage: npx tsx scripts/migrate-all-dbs.ts [--dry-run]
 */

import dotenv from 'dotenv'
import { readFileSync, existsSync } from 'fs'
import { spawnSync } from 'child_process'
import { join } from 'path'

// Load .env – try cwd first, then script-relative (for npx from any dir)
const root = process.cwd() || join(__dirname, '..')
for (const r of [root, join(__dirname, '..')]) {
  dotenv.config({ path: join(r, '.env') })
  dotenv.config({ path: join(r, '.env.local') })
  if (process.env.DATABASE_URL_META) break
}
if (!process.env.DATABASE_URL_META) {
  for (const f of ['.env', '.env.local']) {
    const p = join(root, f)
    if (existsSync(p)) {
      try {
        const content = readFileSync(p, 'utf8')
        for (const line of content.split('\n')) {
          const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
          if (m) {
            const val = m[2].trim().replace(/^["']|["']$/g, '')
            if (val && !process.env[m[1]]) process.env[m[1]] = val
          }
        }
      } catch (_) {}
    }
  }
}

const DRY_RUN = process.argv.includes('--dry-run')

const DB_VARS = [
  'DATABASE_URL_META',
  'DATABASE_URL_ACCOUNTING',
  'DATABASE_URL_RESTAURANT',
  'DATABASE_URL_SPORTS_CLUB',
  'DATABASE_URL_CONSTRUCTION',
  'DATABASE_URL_LAW',
  'DATABASE_URL_MEDICAL',
  'DATABASE_URL_DENTIST',
  'DATABASE_URL_MEDICAL_SPA',
  'DATABASE_URL_OPTOMETRIST',
  'DATABASE_URL_HEALTH_CLINIC',
  'DATABASE_URL_REAL_ESTATE',
  'DATABASE_URL_HOSPITAL',
  'DATABASE_URL_TECHNOLOGY',
  'DATABASE_URL_ORTHODONTIST',
]

async function main() {
  console.log('Running Prisma migrate deploy on each DATABASE_URL_*\n')
  if (DRY_RUN) {
    console.log('🔍 DRY RUN – would migrate these DBs:\n')
    for (const v of DB_VARS) {
      const url = process.env[v]
      console.log(`  ${v}: ${url ? '✅ set' : '⏭️  not set'}`)
    }
    return
  }

  let ok = 0
  let fail = 0

  for (const envVar of DB_VARS) {
    const url = process.env[envVar]
    if (!url) {
      console.log(`⏭️  ${envVar} not set, skipping`)
      continue
    }

    const name = envVar.replace('DATABASE_URL_', '') || 'META'
    process.stdout.write(`▶ ${name}... `)

    const r = spawnSync(
      'npx',
      ['prisma', 'migrate', 'deploy'],
      {
        stdio: ['inherit', 'pipe', 'pipe'],
        env: { ...process.env, DATABASE_URL: url },
        cwd: process.cwd(),
      }
    )

    if (r.status === 0) {
      console.log('✅')
      ok++
    } else {
      console.log('❌')
      if (r.stderr) process.stderr.write(r.stderr.toString())
      fail++
    }
    // Delay between migrations to avoid advisory lock timeouts on Neon
    await new Promise((r) => setTimeout(r, 2000))
  }

  console.log(`\nDone: ${ok} migrated, ${fail} failed`)
  if (fail > 0) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
