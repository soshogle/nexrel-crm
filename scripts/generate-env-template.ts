#!/usr/bin/env tsx
/**
 * Generate .env.multi-db.template with placeholder DATABASE_URL_* vars
 *
 * Copy to .env and fill in your Neon pooled connection strings.
 *
 * Usage: npx tsx scripts/generate-env-template.ts
 */

import { writeFileSync } from 'fs'
import { join } from 'path'

const template = `# Multi-DB env template – copy to .env and fill in Neon pooled URLs
# Get pooled URLs: Neon Console → Project → Connect → Enable "Connection pooling" → Copy

DATABASE_URL="postgresql://..."   # Source DB (for migration) or same as META

DATABASE_URL_META="postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require"
DATABASE_URL_ACCOUNTING="postgresql://..."
DATABASE_URL_RESTAURANT="postgresql://..."
DATABASE_URL_SPORTS_CLUB="postgresql://..."
DATABASE_URL_CONSTRUCTION="postgresql://..."
DATABASE_URL_LAW="postgresql://..."
DATABASE_URL_MEDICAL="postgresql://..."
DATABASE_URL_DENTIST="postgresql://..."
DATABASE_URL_MEDICAL_SPA="postgresql://..."
DATABASE_URL_OPTOMETRIST="postgresql://..."
DATABASE_URL_HEALTH_CLINIC="postgresql://..."
DATABASE_URL_REAL_ESTATE="postgresql://..."
DATABASE_URL_HOSPITAL="postgresql://..."
DATABASE_URL_TECHNOLOGY="postgresql://..."
DATABASE_URL_ORTHODONTIST="postgresql://..."
`

const out = join(process.cwd(), '.env.multi-db.template')
writeFileSync(out, template)
console.log(`✅ Wrote ${out}`)
console.log('   Copy to .env and fill in your Neon pooled connection strings.')
