/**
 * Download external images in website structure and replace with stored URLs
 * Uses WebsiteImageStorage (Vercel Blob / S3 / R2) - one store for all tenants
 * Path isolation: website-images/{userId}/{websiteId}/...
 *
 * Called automatically during website build when ENABLE_IMAGE_DOWNLOAD=true
 */

import { WebsiteImageStorage } from './image-storage';

const IMAGE_PROPS = ['imageUrl', 'image', 'backgroundImage', 'src', 'ogImage'];

function isExternalImageUrl(url: unknown): boolean {
  if (typeof url !== 'string' || !url.trim()) return false;
  if (!url.startsWith('http://') && !url.startsWith('https://')) return false;
  try {
    const host = new URL(url).hostname;
    return !host.includes('vercel-storage.com') && !host.includes('blob.vercel-storage.com') && !host.includes('.s3.') && !host.includes('.r2.') && !host.includes('r2.dev');
  } catch {
    return false;
  }
}

function collectImageUrls(obj: any, urls: Set<string>): void {
  if (obj === null || obj === undefined) return;
  if (typeof obj === 'string') {
    if (isExternalImageUrl(obj)) urls.add(obj);
    return;
  }
  if (Array.isArray(obj)) {
    obj.forEach((item) => collectImageUrls(item, urls));
    return;
  }
  if (typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      if (IMAGE_PROPS.includes(k) && typeof v === 'string' && isExternalImageUrl(v)) {
        urls.add(v);
      }
      collectImageUrls(v, urls);
    }
  }
}

function replaceUrlsInObject(obj: any, urlMap: Map<string, string>): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    return urlMap.get(obj) ?? obj;
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

export async function downloadExternalImagesInStructure(
  structure: any,
  userId: string,
  websiteId: string
): Promise<any> {
  const provider = (process.env.IMAGE_STORAGE_PROVIDER || 'vercel') as 'vercel' | 's3' | 'r2';
  const hasBlob = !!process.env.BLOB_READ_WRITE_TOKEN;
  const enabled = process.env.ENABLE_IMAGE_DOWNLOAD === 'true';

  if (!enabled || (provider === 'vercel' && !hasBlob)) {
    return structure;
  }

  const urls = new Set<string>();
  collectImageUrls(structure, urls);
  if (urls.size === 0) return structure;

  const storage = new WebsiteImageStorage({ provider, userId, websiteId });
  const urlMap = new Map<string, string>();

  for (const url of urls) {
    try {
      const stored = await storage.downloadAndStore(url, undefined, {
        createOptimized: true,
        createThumbnail: false,
        maxWidth: 1920,
        maxHeight: 1080,
      });
      urlMap.set(url, stored.optimizedUrl || stored.url);
    } catch (e: any) {
      console.warn(`[Download external images] Failed ${url}:`, e.message);
    }
  }

  if (urlMap.size === 0) return structure;

  console.log(`[Website Build] Downloaded ${urlMap.size} external images to blob storage`);
  return replaceUrlsInObject(JSON.parse(JSON.stringify(structure)), urlMap);
}
