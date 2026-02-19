/**
 * Listings Service
 * Fetches and updates property listings in the service template's Neon DB
 */

import { prisma } from '@/lib/db';
import { Pool } from 'pg';

export type GalleryItem = string | { url: string; motionDisabled?: boolean };

export interface PropertyListing {
  id: number;
  title: string;
  slug: string;
  address: string;
  mainImageUrl: string | null;
  galleryImages: GalleryItem[] | null;
}

let poolCache = new Map<string, Pool>();

function getPool(connectionString: string): Pool {
  let pool = poolCache.get(connectionString);
  if (!pool) {
    pool = new Pool({ connectionString });
    poolCache.set(connectionString, pool);
  }
  return pool;
}

export async function getWebsiteListingsCount(websiteId: string): Promise<{ count: number; error?: string }> {
  try {
    const website = await prisma.website.findFirst({
      where: { id: websiteId },
      select: { neonDatabaseUrl: true, templateType: true },
    });

    if (!website?.neonDatabaseUrl || website.templateType !== 'SERVICE') {
      return { count: 0 };
    }

    const pool = getPool(website.neonDatabaseUrl);
    const result = await pool.query('SELECT COUNT(*)::int as c FROM properties');
    const count = result.rows[0]?.c ?? 0;
    return { count };
  } catch (e) {
    return { count: 0, error: (e as Error).message };
  }
}

export async function getWebsiteListings(websiteId: string): Promise<PropertyListing[]> {
  const website = await prisma.website.findFirst({
    where: { id: websiteId },
    select: { neonDatabaseUrl: true, templateType: true },
  });

  if (!website?.neonDatabaseUrl) {
    throw new Error('Website has no database configured');
  }

  if (website.templateType !== 'SERVICE') {
    throw new Error('Listings are only available for service template websites');
  }

  const pool = getPool(website.neonDatabaseUrl);

  const result = await pool.query(
    `SELECT id, title, slug, address, main_image_url, gallery_images
     FROM properties
     ORDER BY updated_at DESC`
  );

  return result.rows.map((row: any) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    address: row.address,
    mainImageUrl: row.main_image_url,
    galleryImages: row.gallery_images as GalleryItem[] | null,
  }));
}

export async function updatePropertyGallery(
  websiteId: string,
  propertyId: number,
  galleryImages: GalleryItem[]
): Promise<void> {
  const website = await prisma.website.findFirst({
    where: { id: websiteId },
    select: { neonDatabaseUrl: true, templateType: true },
  });

  if (!website?.neonDatabaseUrl) {
    throw new Error('Website has no database configured');
  }

  if (website.templateType !== 'SERVICE') {
    throw new Error('Listings are only available for service template websites');
  }

  const pool = getPool(website.neonDatabaseUrl);

  await pool.query(
    `UPDATE properties
     SET gallery_images = $1::jsonb, updated_at = NOW()
     WHERE id = $2`,
    [JSON.stringify(galleryImages), propertyId]
  );
}

export async function getPropertyForEdit(websiteId: string, propertyId: number): Promise<PropertyListing | null> {
  const website = await prisma.website.findFirst({
    where: { id: websiteId },
    select: { neonDatabaseUrl: true, templateType: true },
  });

  if (!website?.neonDatabaseUrl || website.templateType !== 'SERVICE') {
    return null;
  }

  const pool = getPool(website.neonDatabaseUrl);

  const result = await pool.query(
    `SELECT id, title, slug, address, main_image_url, gallery_images
     FROM properties
     WHERE id = $1`,
    [propertyId]
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    address: row.address,
    mainImageUrl: row.main_image_url,
    galleryImages: row.gallery_images as GalleryItem[] | null,
  };
}
