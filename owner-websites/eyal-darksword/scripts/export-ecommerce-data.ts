#!/usr/bin/env tsx
/**
 * Export products and pages to JSON for CRM seed script.
 * Run: npx tsx scripts/export-ecommerce-data.ts
 * Output: data/ecommerce-export.json
 */
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { products } from '../client/src/data/products';
import { pages } from '../client/src/data/pages';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outPath = join(root, 'data', 'ecommerce-export.json');

if (!existsSync(join(root, 'data'))) {
  mkdirSync(join(root, 'data'), { recursive: true });
}

const data = { products, pages };
writeFileSync(outPath, JSON.stringify(data), 'utf-8');
console.log('Exported', products.length, 'products,', pages.length, 'pages to', outPath);
