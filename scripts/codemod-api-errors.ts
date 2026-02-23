/**
 * Codemod: Migrate inline NextResponse.json({ error: ... }, { status: N })
 * to centralized apiErrors.xxx() calls from @/lib/api-error
 *
 * Run: npx tsx scripts/codemod-api-errors.ts
 * Dry run: npx tsx scripts/codemod-api-errors.ts --dry-run
 */

import * as fs from 'fs'
import * as path from 'path'

const DRY_RUN = process.argv.includes('--dry-run')
const ROOT = path.resolve(__dirname, '..')
const API_DIR = path.join(ROOT, 'app', 'api')

let filesChanged = 0
let totalReplacements = 0

function walkDir(dir: string): string[] {
  const files: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...walkDir(full))
    else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) files.push(full)
  }
  return files
}

function statusToHelper(status: number, quotedMessage: string): string | null {
  // quotedMessage includes its quotes, e.g. "'Unauthorized'" or "`template ${x}`"
  const bare = quotedMessage.replace(/^['"`]|['"`]$/g, '')

  switch (status) {
    case 401: {
      if (bare === 'Unauthorized' || bare === 'Authentication required')
        return `apiErrors.unauthorized()`
      return `apiErrors.unauthorized(${quotedMessage})`
    }
    case 403: {
      if (bare === 'Forbidden') return `apiErrors.forbidden()`
      return `apiErrors.forbidden(${quotedMessage})`
    }
    case 404: {
      if (bare === 'Not found' || bare === 'Not Found')
        return `apiErrors.notFound()`
      return `apiErrors.notFound(${quotedMessage})`
    }
    case 400:
      return `apiErrors.badRequest(${quotedMessage})`
    case 409:
      return `apiErrors.conflict(${quotedMessage})`
    case 429: {
      if (bare === 'Too many requests') return `apiErrors.rateLimited()`
      return `apiErrors.rateLimited(${quotedMessage})`
    }
    case 500: {
      if (bare === 'Internal server error') return `apiErrors.internal()`
      return `apiErrors.internal(${quotedMessage})`
    }
    default:
      return null
  }
}

function processFile(filePath: string): void {
  let content = fs.readFileSync(filePath, 'utf-8')
  let replacements = 0

  // Pattern: return NextResponse.json({ error: <message> }, { status: NNN })
  // <message> can be: 'string', "string", `template`, or expression
  // This regex handles single-line patterns
  const pattern = /return\s+NextResponse\.json\(\s*\{\s*error:\s*((?:'[^']*'|"[^"]*"|`[^`]*`|[^}]+?))\s*\}\s*,\s*\{\s*status:\s*(\d+)\s*\}\s*\)/g

  const newContent = content.replace(pattern, (match, rawMessage: string, statusStr: string) => {
    const message = rawMessage.trim()
    const status = parseInt(statusStr, 10)

    // Skip complex expressions that aren't simple strings/variables
    // (multi-line objects, nested function calls with parens, etc.)
    if (message.includes('{') || message.includes('\n')) return match

    const helper = statusToHelper(status, message)
    if (!helper) return match

    replacements++
    return `return ${helper}`
  })

  if (replacements === 0) return

  // Add import if not present
  let finalContent = newContent
  if (!finalContent.includes("from '@/lib/api-error'") && !finalContent.includes('from "@/lib/api-error"')) {
    const lines = finalContent.split('\n')
    let lastImportIdx = -1
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].match(/^import\s/) || lines[i].match(/^\s*import\s/)) {
        lastImportIdx = i
      }
    }
    if (lastImportIdx >= 0) {
      lines.splice(lastImportIdx + 1, 0, "import { apiErrors } from '@/lib/api-error';")
      finalContent = lines.join('\n')
    }
  }

  if (!DRY_RUN) {
    fs.writeFileSync(filePath, finalContent, 'utf-8')
  }

  const rel = path.relative(ROOT, filePath)
  console.log(`${DRY_RUN ? '[DRY] ' : ''}${rel}: ${replacements} replacements`)
  filesChanged++
  totalReplacements += replacements
}

console.log(`${DRY_RUN ? 'DRY RUN - ' : ''}Scanning ${API_DIR}...\n`)

const files = walkDir(API_DIR)
for (const f of files) {
  processFile(f)
}

console.log(`\n${DRY_RUN ? '[DRY RUN] ' : ''}Done: ${totalReplacements} replacements in ${filesChanged} files`)
