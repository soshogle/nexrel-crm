#!/usr/bin/env node
/**
 * Publish nexrel-ecommerce-template and nexrel-service-template to GitHub.
 * Creates repos, pushes code, enables "Template repository" for provisioning.
 *
 * Prerequisites:
 *   - GITHUB_TOKEN (repo scope)
 *   - GITHUB_ORG (target org; omit to use token owner)
 *
 * Usage:
 *   npx tsx scripts/publish-templates-to-github.ts
 */

import { execSync } from 'child_process';
import { cpSync, existsSync, mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const TEMPLATES = [
  { dir: 'nexrel-ecommerce-template', repo: 'nexrel-ecommerce-template' },
  { dir: 'nexrel-service-template', repo: 'nexrel-service-template' },
];

async function main() {
  const token = process.env.GITHUB_TOKEN;
  const org = process.env.GITHUB_ORG;

  if (!token) {
    console.error('❌ GITHUB_TOKEN required');
    process.exit(1);
  }

  const owner = org || (await getTokenOwner(token));
  console.log(`Target owner: ${owner}\n`);

  for (const { dir, repo } of TEMPLATES) {
    const srcPath = join(ROOT, dir);
    if (!existsSync(srcPath)) {
      console.warn(`⚠️  Skipping ${dir} (not found)`);
      continue;
    }

    const fullRepo = `${owner}/${repo}`;
    console.log(`\n📦 ${repo}`);

    const workDir = mkdtempSync(join(tmpdir(), `nexrel-publish-${repo}-`));
    try {
      cpSync(srcPath, workDir, { recursive: true });
      const nodeModules = join(workDir, 'node_modules');
      if (existsSync(nodeModules)) {
        rmSync(nodeModules, { recursive: true });
      }
      const gitDir = join(workDir, '.git');
      if (existsSync(gitDir)) {
        rmSync(gitDir, { recursive: true });
      }

      // Create repo if it doesn't exist
      const createRes = await fetch(`https://api.github.com/repos/${fullRepo}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (createRes.status === 404) {
        const createBody = {
          name: repo,
          description: `Nexrel ${dir.includes('ecommerce') ? 'ecommerce' : 'service'} template`,
          private: true,
        };
        const createUrl = org
          ? `https://api.github.com/orgs/${org}/repos`
          : 'https://api.github.com/user/repos';
        const res = await fetch(createUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(createBody),
        });
        if (!res.ok) {
          const err = await res.text();
          throw new Error(`Create repo failed: ${err}`);
        }
        console.log(`   Created ${fullRepo}`);
      } else if (createRes.ok) {
        console.log(`   Repo exists: ${fullRepo}`);
      } else {
        throw new Error(`Check failed: ${await createRes.text()}`);
      }

      // Enable template repository
      const patchRes = await fetch(`https://api.github.com/repos/${fullRepo}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_template: true }),
      });
      if (patchRes.ok) {
        console.log(`   Template repository: enabled`);
      } else {
        console.warn(`   Template enable failed (non-fatal): ${await patchRes.text()}`);
      }

      const remote = `https://${token}@github.com/${fullRepo}.git`;
      execSync('git init', { cwd: workDir, stdio: 'pipe' });
      execSync('git add -A', { cwd: workDir, stdio: 'pipe' });
      execSync('git commit -m "Initial template"', { cwd: workDir, stdio: 'pipe' });
      execSync('git branch -M main', { cwd: workDir, stdio: 'pipe' });
      execSync(`git remote add origin ${remote}`, { cwd: workDir, stdio: 'pipe' });
      execSync('git push -u origin main --force', { cwd: workDir, stdio: 'inherit' });
      console.log(`   Pushed to ${fullRepo}`);
    } catch (err: any) {
      console.error(`   ❌ ${err.message}`);
    } finally {
      rmSync(workDir, { recursive: true, force: true });
    }
  }

  console.log('\n✅ Done. Add to CRM .env:');
  console.log(`NEXREL_ECOM_TEMPLATE_OWNER=${owner}`);
  console.log('NEXREL_ECOM_TEMPLATE_REPO=nexrel-ecommerce-template');
  console.log(`NEXREL_SERVICE_TEMPLATE_OWNER=${owner}`);
  console.log('NEXREL_SERVICE_TEMPLATE_REPO=nexrel-service-template');
  if (org) console.log(`GITHUB_ORG=${org}`);
}

async function getTokenOwner(token: string): Promise<string> {
  const res = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to get GitHub user');
  const u = await res.json();
  return u.login;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
