/**
 * Fix: apiErrors.xxx('message', details: expr) → apiErrors.xxx('message', expr)
 * The codemod captured "details: expr" from the original object and placed it as a bare arg.
 * 
 * Also fixes other comma-separated key:value pairs that leaked through.
 * 
 * Run: npx tsx scripts/fix-api-error-details.ts
 */

import * as fs from 'fs'
import * as path from 'path'

const ROOT = path.resolve(__dirname, '..')
const API_DIR = path.join(ROOT, 'app', 'api')
let fixed = 0
let totalFixes = 0

function walkDir(dir: string): string[] {
  const files: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...walkDir(full))
    else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) files.push(full)
  }
  return files
}

for (const filePath of walkDir(API_DIR)) {
  let content = fs.readFileSync(filePath, 'utf-8')
  let localFixes = 0

  // Pattern: apiErrors.xxx('msg', details: expr) → apiErrors.xxx('msg', expr)
  const detailsPattern = /apiErrors\.(\w+)\(([^,]+),\s*details:\s*([^)]+)\)/g
  content = content.replace(detailsPattern, (match, method, msg, detailsExpr) => {
    localFixes++
    return `apiErrors.${method}(${msg.trim()}, ${detailsExpr.trim()})`
  })

  // Pattern: apiErrors.xxx('msg', success: false, ...) or other key:value pairs
  // These are from objects that had multiple properties; strip the extra key:value pairs
  const kvPattern = /apiErrors\.(\w+)\(([^,]+),\s*\w+:\s*[^,)]+(?:,\s*\w+:\s*[^,)]+)*\)/g
  content = content.replace(kvPattern, (match, method, msg) => {
    // Only fix if it still has key: value pairs (not just a simple second arg)
    if (match.includes(':') && !msg.includes(':')) {
      localFixes++
      return `apiErrors.${method}(${msg.trim()})`
    }
    return match
  })

  if (localFixes > 0) {
    fs.writeFileSync(filePath, content, 'utf-8')
    fixed++
    totalFixes += localFixes
    console.log(`${path.relative(ROOT, filePath)}: ${localFixes} fixes`)
  }
}

console.log(`\nFixed ${totalFixes} occurrences in ${fixed} files`)
