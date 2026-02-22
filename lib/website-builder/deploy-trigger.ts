/**
 * Trigger Vercel deployment for a website when structure/content changes.
 * Model B: Auto-deploy on save — owner edits in CRM, site redeploys automatically.
 *
 * Uses vercelDeployHookUrl (preferred) or Vercel API (vercelProjectId + VERCEL_TOKEN).
 * Lazy-creates deploy hook for existing sites that have vercelProjectId but no hook.
 */

import { createDalContext } from '@/lib/context/industry-context';
import { getCrmDb } from '@/lib/dal';
import { createOrFetchDeployHook } from './deploy-hook';

const VERCEL_API = 'https://api.vercel.com/v13';
const TEAM_ID = process.env.VERCEL_TEAM_ID || 'team_vJ3wdbf3QXa3R4KzaZjDEkLP';

/** Minimum seconds between deploy triggers per website (rate limit) */
const DEPLOY_COOLDOWN_SEC = 60;

/** Sites we've already tried to lazy-create deploy hook for (avoid repeated API calls) */
const lazyCreateAttempted = new Set<string>();

const lastDeployByWebsite = new Map<string, number>();

/**
 * Trigger a Vercel deployment for a website.
 * Prefers vercelDeployHookUrl (no token); falls back to Vercel API if vercelProjectId set.
 * Lazy-creates deploy hook once for existing sites.
 */
export async function triggerWebsiteDeploy(websiteId: string): Promise<{ ok: boolean; error?: string }> {
  if (process.env.WEBSITE_AUTO_DEPLOY === 'false') {
    return { ok: false, error: 'WEBSITE_AUTO_DEPLOY is disabled' };
  }

  const db = getCrmDb(createDalContext('bootstrap'));
  const website = await db.website.findUnique({
    where: { id: websiteId },
    select: { vercelProjectId: true, vercelDeployHookUrl: true, name: true },
  });

  if (!website) {
    return { ok: false, error: 'Website not found' };
  }

  const now = Date.now();
  const last = lastDeployByWebsite.get(websiteId) ?? 0;
  if (now - last < DEPLOY_COOLDOWN_SEC * 1000) {
    return { ok: false, error: 'Rate limited (cooldown)' };
  }

  // Option 1: Deploy hook (preferred — no token, works for any Vercel project)
  let hookUrl = (website.vercelDeployHookUrl as string)?.trim();

  // Lazy-create: if no hook but we have vercelProjectId, try to create/fetch once
  if (!hookUrl && website.vercelProjectId && !lazyCreateAttempted.has(websiteId)) {
    lazyCreateAttempted.add(websiteId);
    try {
      const created = await createOrFetchDeployHook(website.vercelProjectId);
      if (created) {
        await db.website.update({
          where: { id: websiteId },
          data: { vercelDeployHookUrl: created },
        });
        hookUrl = created;
      }
    } catch {
      // Ignore — fall through to API
    }
  }

  if (hookUrl && hookUrl.startsWith('https://')) {
    try {
      const res = await fetch(hookUrl, { method: 'POST' });
      if (res.ok) {
        lastDeployByWebsite.set(websiteId, now);
        return { ok: true };
      }
      const text = await res.text();
      return { ok: false, error: `Deploy hook: ${res.status} ${text}` };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'Deploy hook request failed' };
    }
  }

  // Option 2: Vercel API (requires vercelProjectId + VERCEL_TOKEN)
  if (!website.vercelProjectId) {
    return { ok: false, error: 'Website has no vercelProjectId. Auto-deploy requires a Vercel project.' };
  }

  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    return { ok: false, error: 'VERCEL_TOKEN not configured' };
  }

  try {
    // Fetch project to get git link (repoId, productionBranch) — required for Git deployments
    const projectRes = await fetch(
      `https://api.vercel.com/v9/projects/${website.vercelProjectId}?teamId=${TEAM_ID}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const project = projectRes.ok ? await projectRes.json() : null;
    const link = project?.link;
    const repoId = link?.repoId;
    const ref = link?.productionBranch || link?.gitRepository?.defaultBranch || 'main';

    const body: Record<string, unknown> = {
      project: website.vercelProjectId,
      name: website.name || 'website',
      target: 'production',
    };

    if (repoId) {
      body.gitSource = { type: 'github', ref, repoId };
    }

    const res = await fetch(
      `${VERCEL_API}/deployments?projectId=${website.vercelProjectId}&teamId=${TEAM_ID}&forceNew=1`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `Vercel API: ${res.status} ${text}` };
    }

    lastDeployByWebsite.set(websiteId, now);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Unknown error' };
  }
}
