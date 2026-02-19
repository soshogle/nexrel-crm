#!/usr/bin/env tsx
/**
 * Update soshogle/Theodora-Stavropoulos-Remax with CRM navConfig, pageLabels, resolveNavLabel.
 * Clones the existing repo, copies our changes over, commits and pushes (no force).
 *
 * Prerequisites:
 *   - GITHUB_TOKEN (repo scope)
 *
 * Usage:
 *   npx tsx scripts/publish-theodora-to-github.ts
 */

import { execSync } from "child_process";
import { cpSync, existsSync, mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SRC_DIR = join(ROOT, "Theodora-Stavropoulos-Remax");
const TARGET_OWNER = "soshogle";
const TARGET_REPO = "Theodora-Stavropoulos-Remax";

async function main() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error("❌ GITHUB_TOKEN required (repo scope)");
    process.exit(1);
  }

  if (!existsSync(SRC_DIR)) {
    console.error("❌ Theodora-Stavropoulos-Remax not found");
    process.exit(1);
  }

  const fullRepo = `${TARGET_OWNER}/${TARGET_REPO}`;
  const remote = `https://${token}@github.com/${fullRepo}.git`;
  console.log(`📦 Updating ${fullRepo}\n`);

  const workDir = mkdtempSync(join(tmpdir(), `nexrel-publish-theodora-`));
  try {
    // Clone existing repo
    execSync(`git clone --depth 1 ${remote} ${workDir}`, { stdio: "pipe" });
    const nodeModules = join(workDir, "node_modules");
    if (existsSync(nodeModules)) rmSync(nodeModules, { recursive: true });

    // Copy our template over (overwrites files, preserves .git)
    cpSync(SRC_DIR, workDir, { recursive: true });
    if (existsSync(nodeModules)) rmSync(nodeModules, { recursive: true });

    execSync("git add -A", { cwd: workDir, stdio: "pipe" });
    const status = execSync("git status --porcelain", { cwd: workDir, encoding: "utf-8" });
    if (!status.trim()) {
      console.log("   No changes (repo already up to date)");
      return;
    }
    execSync('git commit -m "feat: full router + CRM navConfig, pageLabels, resolveNavLabel"', {
      cwd: workDir,
      stdio: "pipe",
    });
    execSync("git push origin main --force", { cwd: workDir, stdio: "inherit" });
    console.log(`   Pushed to ${fullRepo}`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`   ❌ ${msg}`);
    process.exit(1);
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }

  console.log("\n✅ Done. Vercel will auto-deploy from the updated repo.");
}

main();
