/**
 * Fix: move apiErrors import that was incorrectly inserted inside multi-line imports.
 * Finds the pattern where the import was inserted mid-block and moves it after the block.
 * 
 * Run: npx tsx scripts/fix-broken-imports.ts
 */

import * as fs from 'fs'
import * as path from 'path'

const ROOT = path.resolve(__dirname, '..')
const API_DIR = path.join(ROOT, 'app', 'api')
let fixed = 0

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

  // Pattern 1: import inserted between "import {" and the closing "} from '...'"
  // e.g.: import {\nimport { apiErrors } from '@/lib/api-error';\n  foo,\n  bar,\n} from '...'
  const brokenPattern = /(import\s*\{)\n(import \{ apiErrors \} from '@\/lib\/api-error';\n)([\s\S]*?} from ['"][^'"]+['"];?)/g

  if (brokenPattern.test(content)) {
    brokenPattern.lastIndex = 0
    const apiImportLine = "import { apiErrors } from '@/lib/api-error';\n"
    
    // Remove the misplaced import
    content = content.replace(brokenPattern, (match, importOpen, _apiImport, rest) => {
      return importOpen + '\n' + rest
    })

    // Check if we still have the import somewhere (from a non-broken insertion)
    if (!content.includes("from '@/lib/api-error'")) {
      // Find the end of all imports and add it there
      const lines = content.split('\n')
      let lastImportEndIdx = -1
      let inMultiLineImport = false
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        if (line.startsWith('import ') && line.includes(' from ')) {
          lastImportEndIdx = i
        } else if (line.startsWith('import ')) {
          inMultiLineImport = true
        }
        if (inMultiLineImport && line.includes(' from ')) {
          lastImportEndIdx = i
          inMultiLineImport = false
        }
      }

      if (lastImportEndIdx >= 0) {
        lines.splice(lastImportEndIdx + 1, 0, "import { apiErrors } from '@/lib/api-error';")
        content = lines.join('\n')
      }
    }

    fs.writeFileSync(filePath, content, 'utf-8')
    fixed++
    console.log(`Fixed: ${path.relative(ROOT, filePath)}`)
  }
}

console.log(`\nFixed ${fixed} files`)
