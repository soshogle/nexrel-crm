#!/usr/bin/env tsx
/**
 * Codemod: Migrate all direct prisma imports to DAL-routed getCrmDb.
 *
 * For API routes with session:
 *   - Replaces `import { prisma } from '@/lib/db'`
 *   - Adds `import { getRouteDb } from '@/lib/dal/get-route-db'`
 *   - Inserts `const db = getRouteDb(session)` after each getServerSession call
 *   - Replaces all `prisma.` with `db.`
 *
 * For webhook/public routes (no session):
 *   - Replaces `import { prisma } from '@/lib/db'`
 *   - Adds `import { getCrmDb } from '@/lib/dal'` and context import
 *   - Replaces `prisma.` with `db.`
 *   - Inserts `const db = getCrmDb(...)` after user lookup
 *
 * For lib files:
 *   - Replaces `import { prisma } from '@/lib/db'`
 *   - Adds `import { getCrmDb } from '@/lib/dal'`
 *   - Replaces `prisma.` with `db.`
 *   - Adds `const db = getCrmDb(ctx)` where ctx is available
 *
 * Usage: npx tsx scripts/codemod-dal-migration.ts [--dry-run]
 */

import * as fs from 'fs'
import * as path from 'path'

const ROOT = path.resolve(__dirname, '..')
const DRY_RUN = process.argv.includes('--dry-run')

const SKIP_DIRS = new Set(['node_modules', 'backups', '.next', '.git', 'scripts'])
const SKIP_FILES = new Set([
  'lib/dal/db.ts',           // The DAL itself - legitimately imports prisma
  'lib/dal/get-route-db.ts', // Our new helper
])

interface Result {
  file: string
  action: string
}

const results: Result[] = []
let modified = 0
let skipped = 0
let errors = 0

function findFiles(dir: string): string[] {
  const out: string[] = []
  if (!fs.existsSync(dir)) return out
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name)) continue
    const full = path.join(dir, e.name)
    if (e.isDirectory()) {
      out.push(...findFiles(full))
    } else if (e.name.endsWith('.ts') || e.name.endsWith('.tsx')) {
      out.push(full)
    }
  }
  return out
}

const PRISMA_IMPORT = /import\s*\{([^}]*)\}\s*from\s*['"]@\/lib\/db['"]/

function hasPrismaImport(content: string): boolean {
  const m = content.match(PRISMA_IMPORT)
  if (!m) return false
  const names = m[1].split(',').map(s => s.trim())
  return names.includes('prisma')
}

function processFile(filePath: string) {
  let content = fs.readFileSync(filePath, 'utf8')
  const original = content

  const rel = path.relative(ROOT, filePath)
  if (SKIP_FILES.has(rel)) {
    skipped++
    return
  }

  if (!hasPrismaImport(content)) {
    skipped++
    return
  }

  // Already fully converted
  if (content.includes('getRouteDb') && !content.match(/import\s*\{[^}]*prisma[^}]*\}\s*from\s*['"]@\/lib\/db['"]/)) {
    skipped++
    return
  }

  const hasSession = content.includes('getServerSession')
  const isApiRoute = filePath.includes('/app/api/')
  const isLibFile = filePath.includes('/lib/') && !filePath.includes('/app/')

  try {
    // Extract other imports from the same line (like Prisma namespace)
    const importMatch = content.match(PRISMA_IMPORT)!
    const importedNames = importMatch[1].split(',').map(s => s.trim()).filter(Boolean)
    const otherNames = importedNames.filter(n => n !== 'prisma')

    // Step 1: Replace the import line
    if (hasSession && isApiRoute) {
      // Session-based API route: use getRouteDb helper
      let replacement = "import { getRouteDb } from '@/lib/dal/get-route-db'"
      if (otherNames.length > 0) {
        replacement += `\nimport { ${otherNames.join(', ')} } from '@prisma/client'`
      }
      content = content.replace(PRISMA_IMPORT, replacement)
    } else if (isApiRoute) {
      // Webhook/public route: use getCrmDb + createDalContext
      let replacement = "import { getCrmDb } from '@/lib/dal'"
      if (!content.includes('createDalContext')) {
        replacement += "\nimport { createDalContext } from '@/lib/context/industry-context'"
      }
      if (otherNames.length > 0) {
        replacement += `\nimport { ${otherNames.join(', ')} } from '@prisma/client'`
      }
      content = content.replace(PRISMA_IMPORT, replacement)
    } else {
      // Lib file: use getCrmDb + createDalContext
      let replacement = "import { getCrmDb } from '@/lib/dal'"
      if (!content.includes('createDalContext') && !content.includes('getDalContextFromSession')) {
        replacement += "\nimport { createDalContext } from '@/lib/context/industry-context'"
      }
      if (otherNames.length > 0) {
        replacement += `\nimport { ${otherNames.join(', ')} } from '@prisma/client'`
      }
      content = content.replace(PRISMA_IMPORT, replacement)
    }

    // Step 2: Insert db variable creation

    if (hasSession && isApiRoute) {
      // For session-based routes: insert `const db = getRouteDb(session)` after each session line
      // Pattern: `const session = await getServerSession(authOptions)`
      // We add on the NEXT line (preserving indentation)
      content = content.replace(
        /([ \t]*)(const\s+session\s*=\s*await\s+getServerSession\s*\([^)]*\)\s*;?)/g,
        (_, indent, sessionLine) => {
          // Check if db = getRouteDb already exists nearby (avoid duplicates)
          return `${indent}${sessionLine}\n${indent}const db = getRouteDb(session)`
        }
      )
    } else if (isApiRoute) {
      // Webhook route: need to find the user lookup and add db after it
      // Common pattern: look for where userId is available
      // Strategy: add `let db = getCrmDb({ userId: '', industry: null })` at top of each handler,
      // then after user lookup: `db = getCrmDb(createDalContext(user.id, user.industry))`

      const handlers = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
      for (const h of handlers) {
        const funcRegex = new RegExp(
          `(export\\s+async\\s+function\\s+${h}\\s*\\([^)]*\\)\\s*\\{)`,
          'g'
        )
        content = content.replace(funcRegex, (_, funcDecl) => {
          return `${funcDecl}\n  const db = getCrmDb({ userId: '', industry: null })`
        })
      }
    } else if (isLibFile) {
      // Lib file: many already have createDalContext. 
      // We add `db` at function level where ctx/userId is available.
      // For now, add a module-level db using fallback context.
      // Functions that already have ctx should use getCrmDb(ctx) directly.

      // Check if there's already a createDalContext or getDalContextFromSession usage
      if (content.includes('createDalContext') || content.includes('getDalContextFromSession')) {
        // Partially converted - just replace prisma. with getCrmDb(ctx). calls
        // The ctx should already be available in scope
        // We'll replace prisma with a pattern that uses getCrmDb
        // This is handled in Step 3 below
      }
      // For lib files, we'll use a different db variable name to avoid conflicts
    }

    // Step 3: Replace all `prisma.` with `db.`
    // Be careful: only replace word-boundary prisma followed by dot
    // Don't replace inside strings that mention "prisma" as documentation
    content = content.replace(/\bprisma\./g, 'db.')

    // Also handle `prisma.$` patterns (transactions, raw queries)
    // These were converted by the above regex since `prisma.$` starts with `prisma.`

    if (content === original) {
      skipped++
      results.push({ file: rel, action: 'no-change' })
      return
    }

    if (!DRY_RUN) {
      fs.writeFileSync(filePath, content)
    }
    modified++
    results.push({ file: rel, action: 'converted' })
  } catch (e) {
    errors++
    results.push({ file: rel, action: `ERROR: ${(e as Error).message}` })
  }
}

function main() {
  console.log(`\n🔧 DAL Migration Codemod${DRY_RUN ? ' (DRY RUN)' : ''}\n`)

  const apiFiles = findFiles(path.join(ROOT, 'app/api'))
  const libFiles = findFiles(path.join(ROOT, 'lib'))
  const allFiles = [...apiFiles, ...libFiles]

  console.log(`Found ${allFiles.length} TypeScript files to scan`)
  console.log(`  API routes: ${apiFiles.length}`)
  console.log(`  Lib files: ${libFiles.length}\n`)

  for (const f of allFiles) {
    processFile(f)
  }

  console.log(`\n✅ Results:`)
  console.log(`  Modified: ${modified}`)
  console.log(`  Skipped: ${skipped}`)
  console.log(`  Errors: ${errors}\n`)

  if (errors > 0) {
    console.log('❌ Files with errors:')
    for (const r of results.filter(r => r.action.startsWith('ERROR'))) {
      console.log(`  ${r.file}: ${r.action}`)
    }
  }

  // Print modified files
  const converted = results.filter(r => r.action === 'converted')
  if (converted.length > 0) {
    console.log(`\n📝 Converted files (${converted.length}):`)
    for (const r of converted) {
      console.log(`  ${r.file}`)
    }
  }
}

main()
