#!/usr/bin/env tsx
/**
 * Audit Website Template Preview URLs
 * Checks which template previewUrls are blocked (Cloudflare, bot protection, etc.)
 * and sets previewUrlBlocked=true for those templates.
 *
 * Run: npx tsx scripts/audit-template-preview-urls.ts
 */

import { prisma } from '@/lib/db';

function looksLikeBlocked(html: string): boolean {
  const lower = html.toLowerCase();
  const suspicious = [
    'enable javascript',
    'please enable javascript',
    'cloudflare',
    'checking your browser',
    'ddos protection',
    'access denied',
    'blocked',
    'captcha',
    'challenge',
    'ray id',
    'cf-browser-verification',
    'datadome',
    'perimeterx',
  ];
  return suspicious.some((s) => lower.includes(s)) || html.length < 500;
}

async function checkUrl(url: string): Promise<{ blocked: boolean; reason?: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (response.status === 403 || response.status === 429) {
      return { blocked: true, reason: `HTTP ${response.status}` };
    }
    if (!response.ok) {
      return { blocked: false, reason: `HTTP ${response.status} (non-blocking)` };
    }

    const html = await response.text();
    if (looksLikeBlocked(html)) {
      return { blocked: true, reason: 'Block/challenge page detected' };
    }
    return { blocked: false };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return { blocked: true, reason: 'Timeout' };
    }
    return { blocked: true, reason: err?.message || 'Fetch failed' };
  }
}

async function main() {
  console.log('Auditing Website Template preview URLs...\n');

  const templates = await prisma.websiteTemplate.findMany({
    where: { previewUrl: { not: null } },
    select: { id: true, name: true, previewUrl: true, previewUrlBlocked: true },
  });

  if (templates.length === 0) {
    console.log('No templates with previewUrl found.');
    return;
  }

  for (const tpl of templates) {
    const url = tpl.previewUrl!;
    console.log(`Checking: ${tpl.name}`);
    console.log(`  URL: ${url}`);

    const { blocked, reason } = await checkUrl(url);

    if (blocked) {
      console.log(`  Result: BLOCKED (${reason})`);
      await prisma.websiteTemplate.update({
        where: { id: tpl.id },
        data: { previewUrlBlocked: true },
      });
      console.log(`  Updated: previewUrlBlocked = true`);
    } else {
      console.log(`  Result: OK`);
      if (tpl.previewUrlBlocked) {
        await prisma.websiteTemplate.update({
          where: { id: tpl.id },
          data: { previewUrlBlocked: false },
        });
        console.log(`  Updated: previewUrlBlocked = false (was previously blocked)`);
      }
    }
    console.log('');
  }

  console.log('Audit complete.');
}

main().catch(console.error);
