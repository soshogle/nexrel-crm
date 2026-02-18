/**
 * Trigger Vercel deployment for a website when structure/content changes.
 * Used so Eyal, Theodora, and future sites get automatic deploys when edited in the CRM.
 */

import { prisma } from '@/lib/db';

const VERCEL_API = 'https://api.vercel.com/v13';
const TEAM_ID = process.env.VERCEL_TEAM_ID || 'team_vJ3wdbf3QXa3R4KzaZjDEkLP';

/** Minimum seconds between deploy triggers per website (rate limit) */
const DEPLOY_COOLDOWN_SEC = 60;

const lastDeployByWebsite = new Map<string, number>();

/**
 * Trigger a Vercel deployment for a website.
 * Safeguards: only if vercelProjectId set, rate limited, optional feature flag.
 */
export async function triggerWebsiteDeploy(websiteId: string): Promise<{ ok: boolean; error?: string }> {
  if (process.env.WEBSITE_AUTO_DEPLOY === 'false') {
    return { ok: false, error: 'WEBSITE_AUTO_DEPLOY is disabled' };
  }

  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    return { ok: false, error: 'VERCEL_TOKEN not configured' };
  }

  const website = await prisma.website.findUnique({
    where: { id: websiteId },
    select: { vercelProjectId: true, name: true },
  });

  if (!website?.vercelProjectId) {
    return { ok: false, error: 'Website has no vercelProjectId' };
  }

  const now = Date.now();
  const last = lastDeployByWebsite.get(websiteId) ?? 0;
  if (now - last < DEPLOY_COOLDOWN_SEC * 1000) {
    return { ok: false, error: 'Rate limited (cooldown)' };
  }

  try {
    const res = await fetch(
      `${VERCEL_API}/deployments?projectId=${website.vercelProjectId}&teamId=${TEAM_ID}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: website.name || 'website',
          target: 'production',
        }),
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
