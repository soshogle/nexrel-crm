#!/usr/bin/env tsx
/**
 * Phase 4: Orchestrated migration runner
 *
 * Runs pre-check, then migrate-to-meta-db, migrate-to-industry-dbs, validate-migration
 * in sequence. Use --dry-run to preview without writing.
 *
 * Usage: tsx scripts/run-phase4-migration.ts [--dry-run] [--skip-backup]
 */

import { spawnSync } from 'child_process'
import { join } from 'path'

const DRY_RUN = process.argv.includes('--dry-run')
const SKIP_BACKUP = process.argv.includes('--skip-backup')

const scripts = [
  { name: 'Pre-migration check', cmd: 'tsx', args: [join(process.cwd(), 'scripts', 'pre-migration-check.ts')] },
  ...(SKIP_BACKUP ? [] : [{ name: 'Backup', cmd: 'tsx', args: [join(process.cwd(), 'scripts', 'backup-database.ts') }]),
  { name: 'Migrate Meta DB', cmd: 'tsx', args: [join(process.cwd(), 'scripts', 'migrate-to-meta-db.ts'), ...(DRY_RUN ? ['--dry-run'] : [])] },
  { name: 'Migrate Industry DBs', cmd: 'tsx', args: [join(process.cwd(), 'scripts', 'migrate-to-industry-dbs.ts'), ...(DRY_RUN ? ['--dry-run'] : [])] },
  { name: 'Validate migration', cmd: 'tsx', args: [join(process.cwd(), 'scripts', 'validate-migration.ts')] },
]

function run(script: { name: string; cmd: string; args: string[] }): boolean {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`▶ ${script.name}`)
  console.log('='.repeat(60))
  const r = spawnSync(script.cmd, script.args, { stdio: 'inherit', cwd: process.cwd() })
  if (r.status !== 0) {
    console.error(`\n❌ ${script.name} failed with exit code ${r.status}`)
    return false
  }
  return true
}

function main() {
  console.log('Phase 4: Orchestrated migration')
  if (DRY_RUN) console.log('🔍 DRY RUN – no writes will be performed')
  if (SKIP_BACKUP) console.log('⏭️  Skipping backup')

  for (const script of scripts) {
    if (!run(script)) {
      process.exit(1)
    }
  }

  console.log('\n✅ Phase 4 migration complete')
}

main()
