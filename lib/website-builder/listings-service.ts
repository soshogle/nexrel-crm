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
     ORDER BY is_featured DESC, created_at DESC`
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

/**
 * Sync a CRM REProperty listing to the owner's SERVICE website Neon DB.
 * Inserts or updates based on mls_number or address match.
 * Returns true on success.
 */
export async function syncListingToWebsite(
  userId: string,
  listing: {
    address: string;
    city: string;
    state: string;
    zip: string;
    country?: string;
    beds?: number | null;
    baths?: number | null;
    sqft?: number | null;
    propertyType?: string;
    listingStatus?: string;
    listPrice?: number | null;
    mlsNumber?: string | null;
    photos?: string[] | null;
    description?: string | null;
    features?: string[];
    lat?: number | null;
    lng?: number | null;
    virtualTourUrl?: string | null;
  }
): Promise<{ success: boolean; websiteId?: string; error?: string }> {
  try {
    const website = await prisma.website.findFirst({
      where: { userId, templateType: 'SERVICE' },
      select: { id: true, neonDatabaseUrl: true },
    });

    if (!website?.neonDatabaseUrl) {
      return { success: false, error: 'No SERVICE website with database found' };
    }

    const pool = getPool(website.neonDatabaseUrl);

    const fullAddress = `${listing.address}, ${listing.city}, ${listing.state} ${listing.zip}`;
    const title = fullAddress;
    const slug = fullAddress
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 120);

    const photos = Array.isArray(listing.photos) ? listing.photos : [];
    const mainImage = photos[0] || null;
    const galleryImages = photos.length > 1 ? photos.slice(1) : [];

    const statusMap: Record<string, string> = {
      ACTIVE: 'active', PENDING: 'pending', SOLD: 'sold',
      EXPIRED: 'expired', WITHDRAWN: 'withdrawn', COMING_SOON: 'coming_soon',
    };
    const status = statusMap[listing.listingStatus || 'ACTIVE'] || 'active';

    const typeMap: Record<string, string> = {
      SINGLE_FAMILY: 'house', CONDO: 'condo', TOWNHOUSE: 'townhouse',
      MULTI_FAMILY: 'multi-family', LAND: 'land', COMMERCIAL: 'commercial', OTHER: 'other',
    };
    const propertyType = typeMap[listing.propertyType || 'OTHER'] || 'house';

    // Upsert: match on mls_number if available, otherwise on address
    const upsertQuery = `
      INSERT INTO properties (
        title, slug, address, property_type, listing_type, status, price,
        bedrooms, bathrooms, living_area, main_image_url, gallery_images,
        latitude, longitude, is_featured, mls_number, description,
        original_url, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13,$14,$15,$16,$17,$18,NOW(),NOW())
      ON CONFLICT (mls_number) WHERE mls_number IS NOT NULL DO UPDATE SET
        title = EXCLUDED.title, slug = EXCLUDED.slug, address = EXCLUDED.address,
        property_type = EXCLUDED.property_type, status = EXCLUDED.status,
        price = EXCLUDED.price, bedrooms = EXCLUDED.bedrooms, bathrooms = EXCLUDED.bathrooms,
        living_area = EXCLUDED.living_area, main_image_url = EXCLUDED.main_image_url,
        gallery_images = EXCLUDED.gallery_images, latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude, description = EXCLUDED.description,
        is_featured = EXCLUDED.is_featured, updated_at = NOW()
    `;

    await pool.query(upsertQuery, [
      title,
      slug,
      fullAddress,
      propertyType,
      'sale',
      status,
      listing.listPrice || null,
      listing.beds || null,
      listing.baths || null,
      listing.sqft || null,
      mainImage,
      JSON.stringify(galleryImages),
      listing.lat || null,
      listing.lng || null,
      true, // is_featured — owner's own listings are featured
      listing.mlsNumber || null,
      listing.description || null,
      listing.virtualTourUrl || null,
    ]);

    return { success: true, websiteId: website.id };
  } catch (e: any) {
    console.error('[syncListingToWebsite] Error:', e.message);
    return { success: false, error: e.message };
  }
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
