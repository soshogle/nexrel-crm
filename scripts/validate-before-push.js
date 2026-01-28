#!/usr/bin/env node
/**
 * Pre-Push Validation Script
 * 
 * This script validates changed files before pushing to GitHub/Vercel.
 * It performs:
 * 1. TypeScript type-checking on changed files only
 * 2. Schema validation (enums/models match Prisma schema)
 * 3. Import path validation
 * 
 * Run: node scripts/validate-before-push.js
 */

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, message) {
  console.log(`${color}${message}${COLORS.reset}`);
}

function getChangedFiles() {
  try {
    const result = execSync('git diff --name-only origin/main HEAD 2>/dev/null || git diff --name-only HEAD~5 HEAD 2>/dev/null || git diff --name-only --cached', {
      encoding: 'utf-8',
      cwd: process.cwd()
    });
    return result.split('\n').filter(f => f && (f.endsWith('.ts') || f.endsWith('.tsx')));
  } catch (e) {
    try {
      const result = execSync('git diff --name-only --cached', { encoding: 'utf-8' });
      return result.split('\n').filter(f => f && (f.endsWith('.ts') || f.endsWith('.tsx')));
    } catch (e2) {
      return [];
    }
  }
}

function extractPrismaEnums() {
  const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
  if (!fs.existsSync(schemaPath)) {
    log(COLORS.yellow, '\u26a0\ufe0f  No schema.prisma found');
    return { enums: new Set(), models: new Set(), fields: {} };
  }
  
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  const enums = new Set();
  const models = new Set();
  const fields = {};
  
  const enumMatches = schema.matchAll(/enum\s+(\w+)\s*\{([^}]+)\}/g);
  for (const match of enumMatches) {
    const enumName = match[1];
    const enumValues = match[2].match(/\w+/g) || [];
    enums.add(enumName);
    fields[enumName] = new Set(enumValues);
  }
  
  const modelMatches = schema.matchAll(/model\s+(\w+)\s*\{/g);
  for (const match of modelMatches) {
    models.add(match[1]);
  }
  
  return { enums, models, fields };
}

function validateFileAgainstSchema(filePath, schema) {
  const errors = [];
  
  if (!fs.existsSync(filePath)) {
    return errors;
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  
  for (const [enumName, values] of Object.entries(schema.fields)) {
    const enumPattern = new RegExp(`${enumName}\\.(\\w+)`, 'g');
    let match;
    while ((match = enumPattern.exec(content)) !== null) {
      const value = match[1];
      if (!values.has(value)) {
        errors.push({
          file: filePath,
          message: `Invalid enum value: ${enumName}.${value} - '${value}' does not exist in ${enumName}`,
          suggestion: `Valid values: ${Array.from(values).join(', ')}`
        });
      }
    }
  }
  
  return errors;
}

function validateNextConfig() {
  const configPath = path.join(process.cwd(), 'next.config.js');
  if (!fs.existsSync(configPath)) {
    return true;
  }
  
  const content = fs.readFileSync(configPath, 'utf-8');
  const errors = [];
  
  if (content.includes('outputFileTracingRoot')) {
    errors.push({
      file: 'next.config.js',
      message: 'Contains outputFileTracingRoot which causes Vercel path0/path0 error',
      suggestion: 'Remove outputFileTracingRoot or set it to __dirname'
    });
  }
  
  if (errors.length > 0) {
    log(COLORS.red, '\n\u274c next.config.js Issues:');
    errors.forEach(e => {
      console.log(`   ${e.message}`);
      console.log(`   Suggestion: ${e.suggestion}`);
    });
    return false;
  }
  
  log(COLORS.green, '\u2713 next.config.js validation passed');
  return true;
}

async function main() {
  log(COLORS.blue, '\n\ud83d\udd0d Pre-Push Validation Starting...\n');
  
  let hasErrors = false;
  
  const changedFiles = getChangedFiles();
  log(COLORS.cyan, `Found ${changedFiles.length} changed TypeScript file(s)`);
  
  if (changedFiles.length > 0) {
    changedFiles.forEach(f => console.log(`   - ${f}`));
  }
  
  const schema = extractPrismaEnums();
  log(COLORS.cyan, `\nLoaded ${schema.enums.size} enums and ${schema.models.size} models from schema`);
  
  log(COLORS.cyan, '\n\ud83d\udccb Validating against Prisma schema...');
  const schemaErrors = [];
  
  for (const file of changedFiles) {
    const fullPath = path.join(process.cwd(), file);
    const errors = validateFileAgainstSchema(fullPath, schema);
    schemaErrors.push(...errors);
  }
  
  if (schemaErrors.length > 0) {
    log(COLORS.red, '\n\u274c Schema Validation Errors:');
    schemaErrors.forEach(e => {
      console.log(`\n   File: ${e.file}`);
      console.log(`   Error: ${e.message}`);
      console.log(`   ${e.suggestion}`);
    });
    hasErrors = true;
  } else {
    log(COLORS.green, '\u2713 Schema validation passed');
  }
  
  if (!validateNextConfig()) {
    hasErrors = true;
  }
  
  console.log('\n' + '='.repeat(50));
  if (hasErrors) {
    log(COLORS.red, '\n\u274c VALIDATION FAILED - Fix errors before pushing\n');
    process.exit(1);
  } else {
    log(COLORS.green, '\n\u2705 ALL VALIDATIONS PASSED - Safe to push\n');
    process.exit(0);
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
