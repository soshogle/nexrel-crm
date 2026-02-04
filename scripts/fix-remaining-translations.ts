/**
 * Script to find and fix remaining hardcoded English strings
 * Run this to identify all remaining translation issues
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { glob } from 'glob';

const COMPONENT_DIRS = [
  'components',
  'app/dashboard',
];

const TOAST_PATTERNS = [
  /toast\.(success|error|info|warning)\(['"]([^'"]+)['"]/g,
  /toast\.(success|error|info|warning)\(`([^`]+)`/g,
];

interface TranslationIssue {
  file: string;
  line: number;
  match: string;
  message: string;
}

async function findTranslationIssues() {
  const issues: TranslationIssue[] = [];
  
  for (const dir of COMPONENT_DIRS) {
    const files = await glob(`${dir}/**/*.{tsx,ts}`, {
      ignore: ['**/node_modules/**', '**/.next/**'],
    });
    
    for (const file of files) {
      try {
        const content = readFileSync(file, 'utf-8');
        const lines = content.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          
          // Skip if already using translations
          if (line.includes('useTranslations') || line.includes('t(') || line.includes('tToasts')) {
            continue;
          }
          
          for (const pattern of TOAST_PATTERNS) {
            const matches = [...line.matchAll(pattern)];
            for (const match of matches) {
              if (match[2] && !match[2].includes('{') && match[2].length > 3) {
                issues.push({
                  file,
                  line: i + 1,
                  match: match[0],
                  message: match[2],
                });
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error reading ${file}:`, error);
      }
    }
  }
  
  return issues;
}

async function main() {
  console.log('🔍 Finding translation issues...\n');
  const issues = await findTranslationIssues();
  
  console.log(`Found ${issues.length} potential translation issues:\n`);
  
  // Group by file
  const byFile: Record<string, TranslationIssue[]> = {};
  for (const issue of issues) {
    if (!byFile[issue.file]) {
      byFile[issue.file] = [];
    }
    byFile[issue.file].push(issue);
  }
  
  // Print summary
  for (const [file, fileIssues] of Object.entries(byFile)) {
    console.log(`\n📄 ${file} (${fileIssues.length} issues)`);
    for (const issue of fileIssues.slice(0, 5)) {
      console.log(`   Line ${issue.line}: ${issue.message.substring(0, 50)}...`);
    }
    if (fileIssues.length > 5) {
      console.log(`   ... and ${fileIssues.length - 5} more`);
    }
  }
  
  // Save to file
  writeFileSync(
    'translation-issues.json',
    JSON.stringify(issues, null, 2)
  );
  
  console.log(`\n✅ Results saved to translation-issues.json`);
  console.log(`\n💡 Next steps:`);
  console.log(`   1. Review translation-issues.json`);
  console.log(`   2. Add missing keys to messages/en.json`);
  console.log(`   3. Translate to fr.json, es.json, zh.json`);
  console.log(`   4. Update components to use useTranslations hook`);
}

main().catch(console.error);
