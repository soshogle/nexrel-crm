#!/usr/bin/env tsx
/**
 * One-command deploy for Theodora's website.
 * 1. Sync template → Theodora (applies latest template updates)
 * 2. Push to GitHub (triggers Vercel auto-deploy)
 *
 * Prerequisites:
 *   - GITHUB_TOKEN (repo scope)
 *
 * Run: npx tsx scripts/deploy-theodora.ts
 * Skip sync (only push): SKIP_SYNC=1 npx tsx scripts/deploy-theodora.ts
 */

import { execSync } from "child_process";
import { cpSync, existsSync, readFileSync, writeFileSync, mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const TEMPLATE = join(ROOT, "nexrel-service-template");
const THEODORA = join(ROOT, "Theodora-Stavropoulos-Remax");
const TARGET_OWNER = "soshogle";
const TARGET_REPO = "Theodora-Stavropoulos-Remax";

function main() {
  const dryRun = process.env.DRY_RUN === "1";
  const skipSync = process.env.SKIP_SYNC === "1";

  console.log("🚀 Deploy Theodora's website\n");

  if (!existsSync(THEODORA)) {
    console.error("❌ Theodora-Stavropoulos-Remax not found");
    process.exit(1);
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error("❌ GITHUB_TOKEN required (repo scope)");
    process.exit(1);
  }

  // Step 1: Sync template → Theodora
  if (!skipSync && existsSync(TEMPLATE)) {
    console.log("1️⃣  Syncing template...");
    const theodoraEnv = existsSync(join(THEODORA, ".env"))
      ? readFileSync(join(THEODORA, ".env"), "utf-8")
      : null;

    if (!dryRun) {
      cpSync(TEMPLATE, THEODORA, {
        recursive: true,
        filter: (src) => {
          const rel = src.replace(TEMPLATE + "/", "").replace(TEMPLATE + "\\", "");
          if ([".env", ".git", "node_modules", ".vercel", "dist"].some((p) => rel === p || rel.startsWith(p + "/") || rel.startsWith(p + "\\")))
            return false;
          return true;
        },
      });
      if (theodoraEnv) writeFileSync(join(THEODORA, ".env"), theodoraEnv);
    }
    console.log("   ✅ Done\n");
  } else if (skipSync) {
    console.log("1️⃣  Skipping sync (SKIP_SYNC=1)\n");
  } else {
    console.log("1️⃣  Template not found, skipping sync\n");
  }

  // Step 2: Publish to GitHub
  console.log("2️⃣  Pushing to GitHub...");
  const remote = `https://${token}@github.com/${TARGET_OWNER}/${TARGET_REPO}.git`;
  const workDir = mkdtempSync(join(tmpdir(), "nexrel-deploy-theodora-"));

  try {
    execSync(`git clone --depth 1 ${remote} ${workDir}`, { stdio: "pipe" });
    if (existsSync(join(workDir, "node_modules")))
      rmSync(join(workDir, "node_modules"), { recursive: true });

    if (!dryRun) {
      cpSync(THEODORA, workDir, {
        recursive: true,
        filter: (src) => {
          const rel = src.replace(THEODORA + "/", "").replace(THEODORA + "\\", "");
          if (["node_modules", ".git", ".vercel"].some((p) => rel === p || rel.startsWith(p + "/") || rel.startsWith(p + "\\")))
            return false;
          return true;
        },
      });
      if (existsSync(join(workDir, "node_modules")))
        rmSync(join(workDir, "node_modules"), { recursive: true });

      execSync("git add -A", { cwd: workDir, stdio: "pipe" });
      const status = execSync("git status --porcelain", { cwd: workDir, encoding: "utf-8" });
      if (!status.trim()) {
        console.log("   No changes (already up to date)");
      } else {
        execSync('git commit -m "chore: sync from template + deploy"', { cwd: workDir, stdio: "pipe" });
        execSync("git push origin main", { cwd: workDir, stdio: "inherit" });
        console.log("   ✅ Pushed to GitHub");
      }
    } else {
      console.log("   [dry] Would push to GitHub");
    }
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }

  console.log("\n✅ Done. Vercel will auto-deploy from the updated repo.");
}

main();
