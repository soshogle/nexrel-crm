#!/usr/bin/env tsx
/**
 * Phase 0 Backup: Eyal's Darksword Armory
 *
 * Creates backups before any migrations or changes.
 * Run: npx tsx scripts/phase0-backup-eyal-darksword.ts
 *
 * Outputs to backups/ directory (gitignored):
 * - eyal-darksword-state-YYYYMMDD.json (current state snapshot)
 * - eyal-darksword-crm-YYYYMMDD.json (CRM website record)
 * - eyal-darksword-products-YYYYMMDD.json (products/pages from export)
 */
import { prisma } from '@/lib/db';
import * as fs from 'fs';
import * as path from 'path';

const BACKUPS_DIR = path.join(process.cwd(), 'backups');
const DATE = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD

function ensureBackupsDir() {
  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    console.log(`Created ${BACKUPS_DIR}`);
  }
}

async function main() {
  console.log('\n🔒 Phase 0: Backup Eyal\'s Darksword Armory\n');

  ensureBackupsDir();

  // ─── Step 1: Find Eyal's website ─────────────────────────────────────
  const website = await prisma.website.findFirst({
    where: {
      user: {
        email: { equals: 'eyal@darksword-armory.com', mode: 'insensitive' },
      },
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          companyLogoUrl: true,
          legalEntityName: true,
          address: true,
          phone: true,
        },
      },
    },
  });

  if (!website) {
    console.log('⚠️  Eyal\'s Darksword Armory website not found in CRM.');
    console.log('   This may be expected if the site was never created via CRM.');
    console.log('   Proceeding with product/page backup only.\n');
  } else {
    // ─── Step 2: Document current state ─────────────────────────────────
    const state = {
      documentedAt: new Date().toISOString(),
      websiteId: website.id,
      websiteName: website.name,
      vercelDeploymentUrl: website.vercelDeploymentUrl,
      templateType: website.templateType,
      type: website.type,
      ownerEmail: website.user?.email,
      ownerName: website.user?.name,
      hasEcommerceContent: !!website.ecommerceContent,
      hasAgencyConfig: !!website.agencyConfig,
      productCount: Array.isArray((website.ecommerceContent as any)?.products)
        ? (website.ecommerceContent as any).products.length
        : 0,
      pageCount: Array.isArray((website.ecommerceContent as any)?.pages)
        ? (website.ecommerceContent as any).pages.length
        : 0,
    };

    const statePath = path.join(BACKUPS_DIR, `eyal-darksword-state-${DATE}.json`);
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf-8');
    console.log(`✅ State documented: ${statePath}`);

    // ─── Step 3: Backup CRM website record (exclude large binary if any) ─
    const crmBackup = {
      backedUpAt: new Date().toISOString(),
      website: {
        id: website.id,
        name: website.name,
        type: website.type,
        templateType: website.templateType,
        status: website.status,
        vercelDeploymentUrl: website.vercelDeploymentUrl,
        vercelProjectId: website.vercelProjectId,
        githubRepoUrl: website.githubRepoUrl,
        neonDatabaseUrl: website.neonDatabaseUrl,
        agencyConfig: website.agencyConfig,
        ecommerceContent: website.ecommerceContent,
        voiceAIConfig: website.voiceAIConfig,
        structure: website.structure,
        seoData: website.seoData,
        createdAt: website.createdAt,
        updatedAt: website.updatedAt,
      },
      user: website.user,
    };

    const crmPath = path.join(BACKUPS_DIR, `eyal-darksword-crm-${DATE}.json`);
    fs.writeFileSync(crmPath, JSON.stringify(crmBackup, null, 2), 'utf-8');
    console.log(`✅ CRM backup: ${crmPath}`);
  }

  // ─── Step 4: Backup products/pages from export file ───────────────────
  const exportPath = path.join(
    process.cwd(),
    'owner-websites/eyal-darksword/data/ecommerce-export.json'
  );

  if (fs.existsSync(exportPath)) {
    const exportData = JSON.parse(fs.readFileSync(exportPath, 'utf-8'));
    const productsBackup = {
      backedUpAt: new Date().toISOString(),
      source: exportPath,
      productCount: exportData.products?.length ?? 0,
      pageCount: exportData.pages?.length ?? 0,
      products: exportData.products ?? [],
      pages: exportData.pages ?? [],
    };

    const productsPath = path.join(BACKUPS_DIR, `eyal-darksword-products-${DATE}.json`);
    fs.writeFileSync(productsPath, JSON.stringify(productsBackup, null, 2), 'utf-8');
    console.log(`✅ Products/pages backup: ${productsPath}`);
  } else {
    console.log(`⚠️  Export file not found: ${exportPath}`);
    console.log('   Run: npx tsx owner-websites/eyal-darksword/scripts/export-ecommerce-data.ts');
  }

  console.log('\n📋 Phase 0 backup complete.');
  console.log('   Backups are in backups/ (gitignored).');
  console.log('   See docs/phase0-eyal-isolation-rules.md for isolation rules.\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
