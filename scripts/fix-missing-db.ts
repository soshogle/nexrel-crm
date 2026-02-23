#!/usr/bin/env tsx
/**
 * Fix files where prisma. was replaced with db. but no db variable was created.
 * Adds `const db = getCrmDb({ userId: '', industry: null })` where needed.
 */
import * as fs from 'fs'
import * as path from 'path'

const ROOT = path.resolve(__dirname, '..')

const files = fs.readFileSync('/tmp/db-missing-files.txt', 'utf8')
  .trim()
  .split('\n')
  .filter(Boolean)

let fixed = 0

for (const relPath of files) {
  const filePath = path.join(ROOT, relPath)
  if (!fs.existsSync(filePath)) {
    console.log(`SKIP (not found): ${relPath}`)
    continue
  }

  let content = fs.readFileSync(filePath, 'utf8')
  const isApiRoute = relPath.startsWith('app/api/')
  const isLibFile = relPath.startsWith('lib/')

  // Check if db is already defined somewhere
  if (/\bconst\s+db\s*=/.test(content) || /\blet\s+db\s*=/.test(content)) {
    // db IS defined somewhere but maybe not in all scopes
    // For these, we need to check each function scope individually
    // For now, skip - these are the scope mismatch cases handled below
  }

  if (isApiRoute) {
    // Check if getCrmDb is already imported
    const hasGetCrmDb = content.includes('getCrmDb')
    const hasGetRouteDb = content.includes('getRouteDb')

    if (!hasGetCrmDb && !hasGetRouteDb) {
      // Need to add import
      const lines = content.split('\n')
      let lastImport = -1
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].match(/^import\s/) || lines[i].match(/^\s*import\s/)) {
          lastImport = i
        }
      }
      if (lastImport >= 0) {
        lines.splice(lastImport + 1, 0, "import { getCrmDb } from '@/lib/dal'")
        content = lines.join('\n')
      }
    }

    // For API routes: add db at the top of each handler function that uses db. but doesn't have it
    const handlers = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
    for (const h of handlers) {
      // Find the function body
      const funcPattern = new RegExp(
        `export\\s+async\\s+function\\s+${h}\\s*\\([^)]*\\)\\s*\\{`,
        'g'
      )
      let match
      while ((match = funcPattern.exec(content)) !== null) {
        const funcStart = match.index + match[0].length
        // Check if db is used in this function but not defined
        // Look ahead a few hundred chars for `db.` usage
        const funcSlice = content.substring(funcStart, funcStart + 500)
        const hasDbUsage = /\bdb\./.test(funcSlice)
        const hasDbDecl = /\bconst\s+db\s*=/.test(funcSlice.substring(0, 200))

        if (hasDbUsage && !hasDbDecl) {
          // Check if getRouteDb is available and session exists in this function
          const hasSession = /getServerSession/.test(funcSlice)
          let insertion: string
          if (hasSession && hasGetRouteDb) {
            // Session route but db was missed
            insertion = '\n  const db = getRouteDb(session);'
          } else if (hasGetCrmDb || content.includes('getCrmDb')) {
            insertion = "\n  const db = getCrmDb({ userId: '', industry: null });"
          } else {
            insertion = "\n  const db = getCrmDb({ userId: '', industry: null });"
          }
          content = content.substring(0, funcStart) + insertion + content.substring(funcStart)
          // Reset regex since content changed
          funcPattern.lastIndex = funcStart + insertion.length
        }
      }
    }
  } else if (isLibFile) {
    // For lib files: add const db after imports
    if (!content.includes("const db =") && !content.includes("let db =")) {
      const lines = content.split('\n')
      let lastImport = -1
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].match(/^import\s/) || lines[i].match(/^\s*import\s/)) {
          lastImport = i
        }
      }
      if (lastImport >= 0) {
        // Check if getCrmDb is imported
        if (!content.includes('getCrmDb')) {
          lines.splice(lastImport + 1, 0, "import { getCrmDb } from '@/lib/dal'")
          lastImport++
        }
        lines.splice(lastImport + 1, 0, "const db = getCrmDb({ userId: '', industry: null })")
        content = lines.join('\n')
      }
    }
  }

  fs.writeFileSync(filePath, content)
  fixed++
  console.log(`Fixed: ${relPath}`)
}

console.log(`\nTotal fixed: ${fixed}`)
