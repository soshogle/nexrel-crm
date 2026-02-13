#!/usr/bin/env tsx
/**
 * Download Darksword Armory scraped images and store in media
 * - Uses WebsiteImageStorage (Vercel Blob / S3 / R2)
 * - Updates website structure with new URLs
 * - Creates WebsiteMedia records for media library
 *
 * Requires: BLOB_READ_WRITE_TOKEN (for Vercel) or S3/R2 config
 * Run: npx tsx scripts/download-darksword-images.ts
 */

import { prisma } from '@/lib/db';
import { WebsiteImageStorage } from '@/lib/website-builder/image-storage';
import * as fs from 'fs';
import * as path from 'path';

const DARKSWORD_DOMAIN = 'darksword-armory.com';

function shouldSkipImage(url: string): boolean {
  const u = url.toLowerCase();
  return (
    u.includes('/flags/') ||
    u.includes('logo') ||
    u.includes('dummy') ||
    u.endsWith('.svg') ||
    u.includes('polylang')
  );
}

function replaceUrlsInObject(obj: any, urlMap: Map<string, string>): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    if (obj.includes(DARKSWORD_DOMAIN) && urlMap.has(obj)) {
      return urlMap.get(obj)!;
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => replaceUrlsInObject(item, urlMap));
  }
  if (typeof obj === 'object') {
    const result: any = {};
    for (const [k, v] of Object.entries(obj)) {
      result[k] = replaceUrlsInObject(v, urlMap);
    }
    return result;
  }
  return obj;
}

async function main() {
  console.log('Downloading Darksword Armory images...\n');

  const structurePath = path.join(process.cwd(), 'darksword-armory-scraped.json');
  if (!fs.existsSync(structurePath)) {
    console.error('darksword-armory-scraped.json not found. Run scrape first.');
    process.exit(1);
  }
  const scraped = JSON.parse(fs.readFileSync(structurePath, 'utf-8'));

  const user = await prisma.user.findUnique({
    where: { email: 'eyal@darksword-armory.com' },
  });
  if (!user) {
    console.error('User eyal@darksword-armory.com not found.');
    process.exit(1);
  }

  const website = await prisma.website.findFirst({
    where: { userId: user.id },
  });
  if (!website) {
    console.error('Darksword website not found for user.');
    process.exit(1);
  }

  const provider = (process.env.IMAGE_STORAGE_PROVIDER || 'vercel') as 'vercel' | 's3' | 'r2';
  const hasBlob = !!process.env.BLOB_READ_WRITE_TOKEN;
  const useLocalFallback = provider === 'vercel' && !hasBlob;

  if (useLocalFallback) {
    console.log('BLOB_READ_WRITE_TOKEN not set. Using local fallback (public/darksword-media/).\n');
  }

  const storage = useLocalFallback
    ? null
    : new WebsiteImageStorage({
        provider,
        userId: user.id,
        websiteId: website.id,
      });
  const images = (scraped.images || []).filter(
    (img: any) => !shouldSkipImage((img.url || img).toString())
  );
  const urls = images.map((img: any) => (img.url || img).toString());

  if (urls.length === 0) {
    console.log('No images to download (all filtered out).');
    return;
  }

  console.log(`Downloading ${urls.length} images...`);
  const urlMap = new Map<string, string>();

  if (useLocalFallback) {
    const localDir = path.join(process.cwd(), 'public', 'darksword-media');
    fs.mkdirSync(localDir, { recursive: true });
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      try {
        const res = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WebsiteBuilder/1.0)' },
          signal: AbortSignal.timeout(30000),
        });
        if (!res.ok) throw new Error(res.statusText);
        const buf = Buffer.from(await res.arrayBuffer());
        const ext = url.match(/\.(webp|png|jpg|jpeg|gif)(\?|$)/i)?.[1] || 'webp';
        const filename = `${i + 1}-${url.split('/').pop()?.split('?')[0] || 'image'}`.replace(/\.[^.]+$/, `.${ext}`);
        const filepath = path.join(localDir, filename);
        fs.writeFileSync(filepath, buf);
        const storedUrl = `/darksword-media/${filename}`;
        urlMap.set(url, storedUrl);
        console.log(`  [${i + 1}/${urls.length}] ${filename} -> public/darksword-media/`);
      } catch (e: any) {
        console.warn(`  [${i + 1}/${urls.length}] ${url} - failed: ${e.message}`);
      }
    }
  } else if (storage) {
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      try {
        const stored = await storage.downloadAndStore(url, undefined, {
          createOptimized: true,
          createThumbnail: true,
          maxWidth: 1920,
          maxHeight: 1080,
        });
        urlMap.set(url, stored.optimizedUrl || stored.url);
        console.log(`  [${i + 1}/${urls.length}] ${url.split('/').pop()?.slice(0, 40)}... -> stored`);
      } catch (e: any) {
        console.warn(`  [${i + 1}/${urls.length}] ${url} - failed: ${e.message}`);
      }
    }
  }

  if (urlMap.size === 0) {
    console.log('\nNo images were stored. Check BLOB_READ_WRITE_TOKEN or storage config.');
    return;
  }

  console.log(`\nStored ${urlMap.size} images. Updating website structure...`);

  const structure = website.structure as any;
  const updated = replaceUrlsInObject(structure, urlMap);

  await prisma.website.update({
    where: { id: website.id },
    data: { structure: updated },
  });

  for (const [originalUrl, storedUrl] of urlMap) {
    const filename = originalUrl.split('/').pop()?.split('?')[0] || 'image';
    await prisma.websiteMedia.create({
      data: {
        websiteId: website.id,
        url: storedUrl,
        path: `website-images/${user.id}/${website.id}/imported/${filename}`,
        filename,
        mimeType: 'image/webp',
        size: 0,
        type: 'IMAGE',
        alt: null,
      },
    });
  }

  console.log('\n✅ Done!');
  console.log(`   Images stored: ${urlMap.size}`);
  console.log(`   Website structure updated.`);
  console.log(`   Media library: ${urlMap.size} images added.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
