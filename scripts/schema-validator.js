#!/usr/bin/env node
/**
 * Schema Validator
 * 
 * Validates that TypeScript files use correct Prisma enums and models.
 * Run: node scripts/schema-validator.js [file1.ts] [file2.ts]
 * Or:  node scripts/schema-validator.js --all (to check all files)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

function parseSchema() {
  const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  
  const result = {
    enums: {},
    models: {},
    enumNames: new Set(),
    modelNames: new Set()
  };
  
  const enumRegex = /enum\s+(\w+)\s*\{([^}]+)\}/g;
  let match;
  while ((match = enumRegex.exec(schema)) !== null) {
    const enumName = match[1];
    const values = match[2].match(/^\s*(\w+)/gm)?.map(v => v.trim()) || [];
    result.enums[enumName] = new Set(values);
    result.enumNames.add(enumName);
  }
  
  const modelRegex = /model\s+(\w+)\s*\{([^}]+)\}/g;
  while ((match = modelRegex.exec(schema)) !== null) {
    const modelName = match[1];
    const body = match[2];
    const fields = new Set();
    
    const fieldLines = body.split('\n');
    for (const line of fieldLines) {
      const fieldMatch = line.match(/^\s*(\w+)\s+/);
      if (fieldMatch && !fieldMatch[1].startsWith('//') && !fieldMatch[1].startsWith('@@')) {
        fields.add(fieldMatch[1]);
      }
    }
    
    result.models[modelName] = fields;
    result.modelNames.add(modelName);
  }
  
  return result;
}

function validateFile(filePath, schema) {
  const errors = [];
  const warnings = [];
  
  if (!fs.existsSync(filePath)) {
    return { errors: [{ message: `File not found: ${filePath}` }], warnings: [] };
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  for (const [enumName, values] of Object.entries(schema.enums)) {
    const dotPattern = new RegExp(`\\b${enumName}\\.(\\w+)\\b`, 'g');
    let match;
    let lineNum = 0;
    
    for (const line of lines) {
      lineNum++;
      dotPattern.lastIndex = 0;
      while ((match = dotPattern.exec(line)) !== null) {
        const value = match[1];
        if (!values.has(value)) {
          errors.push({
            line: lineNum,
            column: match.index,
            message: `Invalid enum value '${enumName}.${value}'`,
            suggestion: `Valid values: ${Array.from(values).slice(0, 10).join(', ')}${values.size > 10 ? '...' : ''}`
          });
        }
      }
    }
  }
  
  const prismaImportMatch = content.match(/import\s*\{([^}]+)\}\s*from\s*['"]@prisma\/client['"]/);
  if (prismaImportMatch) {
    const imports = prismaImportMatch[1].split(',').map(s => s.trim());
    for (const imp of imports) {
      const cleanImp = imp.replace(/\s+as\s+\w+/, '').trim();
      if (cleanImp && !schema.enumNames.has(cleanImp) && !schema.modelNames.has(cleanImp) && cleanImp !== 'Prisma' && cleanImp !== 'PrismaClient') {
        warnings.push({
          message: `Import '${cleanImp}' from @prisma/client may not exist`,
          suggestion: `Check if ${cleanImp} is defined in schema.prisma`
        });
      }
    }
  }
  
  return { errors, warnings };
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage:');
    console.log('  node scripts/schema-validator.js file1.ts file2.ts');
    console.log('  node scripts/schema-validator.js --all');
    console.log('  node scripts/schema-validator.js --changed');
    process.exit(0);
  }
  
  log(COLORS.blue, '\n\ud83d\udd0d Schema Validator\n');
  
  const schema = parseSchema();
  log(COLORS.cyan, `Loaded ${Object.keys(schema.enums).length} enums and ${Object.keys(schema.models).length} models\n`);
  
  let files = [];
  
  if (args[0] === '--all') {
    const findResult = execSync('find . -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v .next', {
      encoding: 'utf-8',
      cwd: process.cwd()
    });
    files = findResult.split('\n').filter(f => f);
  } else if (args[0] === '--changed') {
    try {
      const gitResult = execSync('git diff --name-only HEAD~5 HEAD 2>/dev/null || git diff --name-only --cached', {
        encoding: 'utf-8',
        cwd: process.cwd()
      });
      files = gitResult.split('\n').filter(f => f && (f.endsWith('.ts') || f.endsWith('.tsx')));
    } catch (e) {
      files = [];
    }
  } else {
    files = args;
  }
  
  log(COLORS.cyan, `Validating ${files.length} file(s)...\n`);
  
  let totalErrors = 0;
  let totalWarnings = 0;
  
  for (const file of files) {
    const fullPath = file.startsWith('/') ? file : path.join(process.cwd(), file);
    const { errors, warnings } = validateFile(fullPath, schema);
    
    if (errors.length > 0 || warnings.length > 0) {
      console.log(`\n\ud83d\udcc4 ${file}`);
      
      for (const err of errors) {
        log(COLORS.red, `   \u274c Line ${err.line || '?'}: ${err.message}`);
        if (err.suggestion) {
          log(COLORS.yellow, `      \ud83d\udca1 ${err.suggestion}`);
        }
        totalErrors++;
      }
      
      for (const warn of warnings) {
        log(COLORS.yellow, `   \u26a0\ufe0f  ${warn.message}`);
        if (warn.suggestion) {
          log(COLORS.cyan, `      \ud83d\udca1 ${warn.suggestion}`);
        }
        totalWarnings++;
      }
    }
  }
  
  console.log('\n' + '='.repeat(50));
  if (totalErrors > 0) {
    log(COLORS.red, `\n\u274c Found ${totalErrors} error(s) and ${totalWarnings} warning(s)\n`);
    process.exit(1);
  } else if (totalWarnings > 0) {
    log(COLORS.yellow, `\n\u26a0\ufe0f  Found ${totalWarnings} warning(s), no errors\n`);
    process.exit(0);
  } else {
    log(COLORS.green, `\n\u2705 All files validated successfully\n`);
    process.exit(0);
  }
}

main();
