#!/usr/bin/env tsx
/**
 * Sync nexrel-service-template → Theodora-Stavropoulos-Remax.
 * Applies template updates (new pages, API routes, fixes) while preserving Theodora's .env.
 *
 * Run: npx tsx scripts/sync-template-to-theodora.ts
 * Dry run: DRY_RUN=1 npx tsx scripts/sync-template-to-theodora.ts
 */

import { cpSync, existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const TEMPLATE = join(ROOT, "nexrel-service-template");
const THEODORA = join(ROOT, "Theodora-Stavropoulos-Remax");

const PRESERVE = [".env", ".git", "node_modules", ".vercel"];
const PRESERVE_FILES = [".env"];

function main() {
  const dryRun = process.env.DRY_RUN === "1";
  if (dryRun) console.log("🔍 DRY RUN – no files will be modified\n");

  if (!existsSync(TEMPLATE)) {
    console.error("❌ nexrel-service-template not found");
    process.exit(1);
  }
  if (!existsSync(THEODORA)) {
    console.error("❌ Theodora-Stavropoulos-Remax not found");
    process.exit(1);
  }

  // Preserve Theodora's .env
  const theodoraEnv = existsSync(join(THEODORA, ".env"))
    ? readFileSync(join(THEODORA, ".env"), "utf-8")
    : null;

  console.log("📦 Syncing nexrel-service-template → Theodora-Stavropoulos-Remax\n");

  if (!dryRun) {
    cpSync(TEMPLATE, THEODORA, {
      recursive: true,
      filter: (src) => {
        const rel = src.replace(TEMPLATE + "/", "");
        if (PRESERVE.some((p) => rel === p || rel.startsWith(p + "/"))) return false;
        if (PRESERVE_FILES.includes(rel)) return false;
        return true;
      },
    });
    if (theodoraEnv) {
      writeFileSync(join(THEODORA, ".env"), theodoraEnv);
      console.log("   Preserved .env");
    }
  } else {
    console.log("   [dry] Would copy template → Theodora (preserving .env, .git, node_modules)");
  }

  console.log("\n✅ Sync complete. Next: npx tsx scripts/publish-theodora-to-github.ts");
}

main();
