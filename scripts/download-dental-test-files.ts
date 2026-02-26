/**
 * Download Real Dental 3D Scan Files from the Internet
 * Sources: GitHub (dentistfrankchen/dental-models, MatthewMong/DentalImplants)
 *
 * Printables and GrabCAD block automated downloads (Cloudflare/CloudFront).
 * DTU 3Shape dataset (6.67 GB) requires manual registration at data.dtu.dk.
 *
 * Run: npx ts-node --skip-project scripts/download-dental-test-files.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

const BASE_DIR = path.join(process.cwd(), 'public', 'test-assets', 'dental', '3d-scans');

const FILES: { url: string; dest: string; desc: string }[] = [
  // Real 3Shape intraoral scans (dentistfrankchen/dental-models)
  {
    url: 'https://raw.githubusercontent.com/dentistfrankchen/dental-models/main/Mandibular_export.stl',
    dest: 'mandibular-3shape-real.stl',
    desc: 'Lower arch - real 3Shape TRIOS intraoral scan (GitHub)',
  },
  {
    url: 'https://raw.githubusercontent.com/dentistfrankchen/dental-models/main/Maxillary_export.stl',
    dest: 'maxillary-3shape-real.stl',
    desc: 'Upper arch - real 3Shape TRIOS intraoral scan (GitHub)',
  },
  // Individual tooth STLs (MatthewMong/DentalImplants - Blender dental plugin)
  {
    url: 'https://raw.githubusercontent.com/MatthewMong/DentalImplants/main/STLTeeth/1.stl',
    dest: 'tooth-1-molar.stl',
    desc: 'Tooth #1 (upper right 3rd molar) - DentalImplants repo',
  },
  {
    url: 'https://raw.githubusercontent.com/MatthewMong/DentalImplants/main/STLTeeth/14.stl',
    dest: 'tooth-14-molar.stl',
    desc: 'Tooth #14 (upper left 1st molar) - DentalImplants repo',
  },
  {
    url: 'https://raw.githubusercontent.com/MatthewMong/DentalImplants/main/STLTeeth/19.stl',
    dest: 'tooth-19-molar.stl',
    desc: 'Tooth #19 (lower left 1st molar) - DentalImplants repo',
  },
];

function download(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Nexrel-CRM/1.0' } }, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        const redirect = res.headers.location;
        if (redirect) return download(redirect.startsWith('http') ? redirect : new URL(redirect, url).href).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      const chunks: Buffer[] = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(120000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

async function main() {
  console.log('\n📥 Downloading Real Dental 3D Scan Files\n');
  fs.mkdirSync(BASE_DIR, { recursive: true });

  for (const f of FILES) {
    try {
      process.stdout.write(`   ${f.dest} ... `);
      const buf = await download(f.url);
      fs.writeFileSync(path.join(BASE_DIR, f.dest), buf);
      console.log(`✅ ${(buf.length / 1024).toFixed(1)} KB — ${f.desc}`);
    } catch (err: any) {
      console.log(`❌ ${err.message}`);
    }
  }

  console.log('\n📌 MANUAL DOWNLOADS (blocked for automation):');
  console.log('   • Printables (teeth model): https://www.printables.com/model/83327-set-of-teeth-dental-model-3d-scan-test-with-raspi-');
  console.log('   • GrabCAD (dental models):  https://grabcad.com/library?query=dental+teeth');
  console.log('   • DTU 3Shape dataset (6.67 GB, PLY): https://data.dtu.dk/articles/dataset/3Shape_FDI_16_Meshes_from_Intraoral_Scans/23626650');
  console.log('   Place downloaded files in: public/test-assets/dental/3d-scans/\n');
}

main().catch(console.error);
