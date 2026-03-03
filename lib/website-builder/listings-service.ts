/**
 * Listings Service
 * Fetches and updates property listings in the service template's Neon DB
 */

import { getCrmDb } from '@/lib/dal';
import { createDalContext } from '@/lib/context/industry-context';
import { resolveWebsiteDb } from '@/lib/dal/resolve-website-db';
import { getMetaDb } from '@/lib/db/meta-db';
import { prisma } from '@/lib/db';
import { Pool } from 'pg';

export type GalleryItem = string | { url: string; motionDisabled?: boolean };

export interface PropertyListing {
  id: number;
  title: string;
  slug: string;
  address: string;
  price: string | null;
  mainImageUrl: string | null;
  galleryImages: GalleryItem[] | null;
  isSecret: boolean;
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
    const resolved = await resolveWebsiteDb(websiteId);
    if (!resolved) return { count: 0 };

    const website = await resolved.db.website.findFirst({
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
  const resolved = await resolveWebsiteDb(websiteId);
  if (!resolved) throw new Error('Website not found');

  const website = await resolved.db.website.findFirst({
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
    `SELECT id, title, slug, address, price, main_image_url, gallery_images, COALESCE(is_secret, false) as is_secret
     FROM properties
     ORDER BY is_featured DESC, created_at DESC`
  );

  return result.rows.map((row: any) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    address: row.address,
    price: row.price,
    mainImageUrl: row.main_image_url,
    galleryImages: row.gallery_images as GalleryItem[] | null,
    isSecret: row.is_secret ?? false,
  }));
}

/**
 * Returns website listing order (mls_number, address) for matching CRM properties.
 * Used to sort Listing Management page to match broker's website display order.
 */
export async function getWebsiteListingOrderForCrmMatch(
  websiteId: string
): Promise<Array<{ mls_number: string | null; address: string }>> {
  const resolved = await resolveWebsiteDb(websiteId);
  if (!resolved) return [];

  const website = await resolved.db.website.findFirst({
    where: { id: websiteId },
    select: { neonDatabaseUrl: true, templateType: true },
  });

  if (!website?.neonDatabaseUrl || website.templateType !== 'SERVICE') {
    return [];
  }

  const pool = getPool(website.neonDatabaseUrl);
  const result = await pool.query(
    `SELECT mls_number, address FROM properties
     ORDER BY is_featured DESC, created_at DESC`
  );

  return result.rows.map((row: any) => ({
    mls_number: row.mls_number ?? null,
    address: row.address ?? '',
  }));
}

/**
 * Returns MLS numbers of listings flagged as `is_featured` on the broker's website.
 * These are the broker's own listings (imported from their centrisBrokerUrl).
 */
export async function getBrokerFeaturedMlsNumbers(
  websiteId: string
): Promise<string[]> {
  const resolved = await resolveWebsiteDb(websiteId);
  if (!resolved) return [];

  const website = await resolved.db.website.findFirst({
    where: { id: websiteId },
    select: { neonDatabaseUrl: true, templateType: true },
  });

  if (!website?.neonDatabaseUrl || website.templateType !== 'SERVICE') {
    return [];
  }

  const pool = getPool(website.neonDatabaseUrl);
  const result = await pool.query(
    `SELECT mls_number FROM properties WHERE is_featured = true AND mls_number IS NOT NULL`
  );

  return result.rows.map((row: any) => row.mls_number as string).filter(Boolean);
}

/**
 * Flag CRM REProperty records as broker listings when their MLS number
 * matches a featured listing on the broker's website.
 */
export async function flagBrokerListingsFromWebsite(
  userId: string
): Promise<{ flagged: number; error?: string }> {
  try {
    const ctx = createDalContext(userId, await getUserIndustry(userId));
    const db = getCrmDb(ctx);
    const website = await db.website.findFirst({
      where: { userId: ctx.userId, templateType: 'SERVICE' },
      select: { id: true },
    });

    if (!website) return { flagged: 0 };

    const featuredMls = await getBrokerFeaturedMlsNumbers(website.id);
    if (featuredMls.length === 0) return { flagged: 0 };

    const result = await prisma.rEProperty.updateMany({
      where: {
        userId,
        mlsNumber: { in: featuredMls },
        isBrokerListing: false,
      },
      data: { isBrokerListing: true },
    });

    return { flagged: result.count };
  } catch (e: any) {
    return { flagged: 0, error: e.message };
  }
}

export async function updatePropertySecret(
  websiteId: string,
  propertyId: number,
  isSecret: boolean
): Promise<void> {
  const resolved = await resolveWebsiteDb(websiteId);
  if (!resolved) throw new Error('Website not found');

  const website = await resolved.db.website.findFirst({
    where: { id: websiteId },
    select: { neonDatabaseUrl: true, templateType: true },
  });

  if (!website?.neonDatabaseUrl || website.templateType !== 'SERVICE') {
    throw new Error('Listings are only available for service template websites');
  }

  const pool = getPool(website.neonDatabaseUrl);
  await pool.query(
    `UPDATE properties SET is_secret = $1, updated_at = NOW() WHERE id = $2`,
    [isSecret, propertyId]
  );
}

export async function updatePropertyGallery(
  websiteId: string,
  propertyId: number,
  galleryImages: GalleryItem[]
): Promise<void> {
  const resolved = await resolveWebsiteDb(websiteId);
  if (!resolved) throw new Error('Website not found');

  const website = await resolved.db.website.findFirst({
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
export interface SyncListingInput {
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
  rentPrice?: number | null;
  rentPriceLabel?: string | null;
  listingType?: 'sale' | 'rent';
  mlsNumber?: string | null;
  photos?: string[] | null;
  description?: string | null;
  features?: string[];
  lat?: number | null;
  lng?: number | null;
  virtualTourUrl?: string | null;
  // Extended fields for full Centris-style display
  neighborhood?: string | null;
  rooms?: number | null;
  yearBuilt?: number | null;
  lotSize?: string | null;
  areaUnit?: string | null;
  addendum?: string | null;
  priceLabel?: string | null;
  featuresJson?: {
    heating?: string;
    heatingEnergy?: string;
    waterSupply?: string;
    sewageSystem?: string;
    amenities?: string[];
    proximity?: string[];
    inclusions?: string[];
  } | null;
  roomDetails?: Array<{
    name: string;
    level: string;
    dimensions: string;
    flooring?: string;
    details?: string;
  }> | null;
}

export async function syncListingToWebsite(
  userId: string,
  listing: SyncListingInput
): Promise<{ success: boolean; websiteId?: string; error?: string }> {
  try {
    const industry = await getUserIndustry(userId);
    const ctx = createDalContext(userId, industry);
    const db = getCrmDb(ctx);
    const website = await db.website.findFirst({
      where: { userId: ctx.userId, templateType: 'SERVICE' },
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
      ACTIVE: 'active', PENDING: 'pending', SOLD: 'sold', RENTED: 'rented',
      EXPIRED: 'expired', WITHDRAWN: 'withdrawn', COMING_SOON: 'coming_soon',
    };
    const status = statusMap[listing.listingStatus || 'ACTIVE'] || 'active';

    const typeMap: Record<string, string> = {
      SINGLE_FAMILY: 'house', CONDO: 'condo', TOWNHOUSE: 'townhouse',
      MULTI_FAMILY: 'multi-family', LAND: 'land', COMMERCIAL: 'commercial', OTHER: 'other',
    };
    const propertyType = typeMap[listing.propertyType || 'OTHER'] || 'house';

    const listingType = listing.listingType || 'sale';
    const displayPrice =
      status === 'sold' || status === 'rented'
        ? null
        : listingType === 'rent'
          ? (listing.rentPrice ?? null)
          : (listing.listPrice ?? null);

    // Build the features JSON for the website (amenities, inclusions, proximity, etc.)
    let featuresJson: Record<string, unknown> | null = null;
    if (listing.featuresJson) {
      featuresJson = listing.featuresJson;
    } else if (listing.features && listing.features.length > 0) {
      featuresJson = { amenities: listing.features };
    }

    const upsertQuery = `
      INSERT INTO properties (
        title, slug, address, city, province, postal_code, neighborhood,
        property_type, listing_type, status, price, price_label,
        bedrooms, bathrooms, rooms, area, area_unit, lot_area, year_built,
        main_image_url, gallery_images, features, room_details,
        latitude, longitude, is_featured, mls_number, description, addendum,
        original_url, created_at, updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,
        $20,$21::jsonb,$22::jsonb,$23::jsonb,$24,$25,$26,$27,$28,$29,$30,NOW(),NOW()
      )
      ON CONFLICT (mls_number) WHERE mls_number IS NOT NULL DO UPDATE SET
        title = EXCLUDED.title, slug = EXCLUDED.slug, address = EXCLUDED.address,
        city = EXCLUDED.city, province = EXCLUDED.province,
        postal_code = EXCLUDED.postal_code, neighborhood = EXCLUDED.neighborhood,
        property_type = EXCLUDED.property_type, listing_type = EXCLUDED.listing_type,
        status = EXCLUDED.status, price = EXCLUDED.price, price_label = EXCLUDED.price_label,
        bedrooms = EXCLUDED.bedrooms, bathrooms = EXCLUDED.bathrooms,
        rooms = EXCLUDED.rooms, area = EXCLUDED.area, area_unit = EXCLUDED.area_unit,
        lot_area = EXCLUDED.lot_area, year_built = EXCLUDED.year_built,
        main_image_url = COALESCE(EXCLUDED.main_image_url, properties.main_image_url),
        gallery_images = CASE WHEN jsonb_array_length(COALESCE(EXCLUDED.gallery_images, '[]'::jsonb)) >= jsonb_array_length(COALESCE(properties.gallery_images, '[]'::jsonb)) THEN EXCLUDED.gallery_images ELSE properties.gallery_images END,
        features = COALESCE(EXCLUDED.features, properties.features),
        room_details = COALESCE(EXCLUDED.room_details, properties.room_details),
        latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
        description = CASE WHEN length(COALESCE(EXCLUDED.description, '')) >= length(COALESCE(properties.description, '')) THEN EXCLUDED.description ELSE properties.description END,
        addendum = COALESCE(EXCLUDED.addendum, properties.addendum),
        is_featured = EXCLUDED.is_featured, updated_at = NOW()
    `;

    await pool.query(upsertQuery, [
      title,                                                   // $1
      slug,                                                    // $2
      fullAddress,                                             // $3
      listing.city || '',                                      // $4
      listing.state || null,                                   // $5  province
      listing.zip || null,                                     // $6  postal_code
      listing.neighborhood || null,                            // $7
      propertyType,                                            // $8
      listingType,                                             // $9
      status,                                                  // $10
      displayPrice,                                            // $11
      listing.priceLabel || listing.rentPriceLabel || null,     // $12 price_label
      listing.beds || null,                                    // $13
      listing.baths || null,                                   // $14
      listing.rooms || null,                                   // $15
      listing.sqft ? String(listing.sqft) : null,              // $16 area
      listing.areaUnit || null,                                // $17 area_unit
      listing.lotSize || null,                                 // $18 lot_area
      listing.yearBuilt || null,                               // $19 year_built
      mainImage,                                               // $20
      JSON.stringify(galleryImages),                           // $21 gallery_images
      featuresJson ? JSON.stringify(featuresJson) : null,      // $22 features
      listing.roomDetails ? JSON.stringify(listing.roomDetails) : null, // $23 room_details
      listing.lat || null,                                     // $24
      listing.lng || null,                                     // $25
      true,                                                    // $26 is_featured
      listing.mlsNumber || null,                               // $27
      listing.description || null,                             // $28
      listing.addendum || null,                                // $29
      listing.virtualTourUrl || null,                          // $30 original_url
    ]);

    return { success: true, websiteId: website.id };
  } catch (e: any) {
    console.error('[syncListingToWebsite] Error:', e.message);
    return { success: false, error: e.message };
  }
}

/** Search the owner's website Neon DB by MLS number or address fragment */
export async function searchWebsiteListings(
  userId: string,
  query: string,
  limit = 20
): Promise<{
  results: Array<{
    id: number;
    mls_number: string | null;
    title: string;
    address: string;
    status: string;
    price: number | null;
    bedrooms: number | null;
    bathrooms: number | null;
    living_area: number | null;
    property_type: string | null;
    main_image_url: string | null;
    description: string | null;
    is_featured: boolean;
  }>;
  websiteId?: string;
  error?: string;
}> {
  try {
    const industry = await getUserIndustry(userId);
    const ctx = createDalContext(userId, industry);
    const db = getCrmDb(ctx);
    const website = await db.website.findFirst({
      where: { userId: ctx.userId, templateType: 'SERVICE' },
      select: { id: true, neonDatabaseUrl: true },
    });

    if (!website?.neonDatabaseUrl) {
      return { results: [], error: 'No SERVICE website with database found' };
    }

    const pool = getPool(website.neonDatabaseUrl);
    const q = `%${query}%`;

    const result = await pool.query(
      `SELECT id, mls_number, title, address, status, price,
              bedrooms, bathrooms, living_area, property_type,
              main_image_url, description, is_featured
       FROM properties
       WHERE mls_number ILIKE $1 OR address ILIKE $1 OR title ILIKE $1
       ORDER BY is_featured DESC, created_at DESC
       LIMIT $2`,
      [q, limit]
    );

    return { results: result.rows, websiteId: website.id };
  } catch (e: any) {
    return { results: [], error: e.message };
  }
}

/**
 * Update the status of a property in the owner's website Neon DB.
 * Matches by MLS number first, falls back to address ILIKE match.
 */
export async function syncStatusToWebsite(
  userId: string,
  mlsNumber: string | null,
  address: string | null,
  status: string
): Promise<{ success: boolean; updated: number; error?: string }> {
  try {
    const industry = await getUserIndustry(userId);
    const ctx = createDalContext(userId, industry);
    const db = getCrmDb(ctx);
    const website = await db.website.findFirst({
      where: { userId: ctx.userId, templateType: 'SERVICE' },
      select: { id: true, neonDatabaseUrl: true },
    });

    if (!website?.neonDatabaseUrl) {
      return { success: false, updated: 0, error: 'No SERVICE website with database found' };
    }

    const statusMap: Record<string, string> = {
      ACTIVE: 'active', PENDING: 'pending', SOLD: 'sold', RENTED: 'rented',
      EXPIRED: 'expired', WITHDRAWN: 'withdrawn', COMING_SOON: 'coming_soon',
    };
    const dbStatus = statusMap[status] || 'active';

    const pool = getPool(website.neonDatabaseUrl);
    let result;

    // When sold or rented, hide price on the website (do not reveal sale/rent amounts)
    const hidePrice = dbStatus === 'sold' || dbStatus === 'rented';

    if (mlsNumber) {
      result = hidePrice
        ? await pool.query(
            `UPDATE properties SET status = $1, price = NULL, updated_at = NOW() WHERE mls_number = $2`,
            [dbStatus, mlsNumber]
          )
        : await pool.query(
            `UPDATE properties SET status = $1, updated_at = NOW() WHERE mls_number = $2`,
            [dbStatus, mlsNumber]
          );
    } else if (address) {
      result = hidePrice
        ? await pool.query(
            `UPDATE properties SET status = $1, price = NULL, updated_at = NOW() WHERE address ILIKE $2 AND is_featured = true`,
            [dbStatus, `%${address}%`]
          )
        : await pool.query(
            `UPDATE properties SET status = $1, updated_at = NOW() WHERE address ILIKE $2 AND is_featured = true`,
            [dbStatus, `%${address}%`]
          );
    } else {
      return { success: false, updated: 0, error: 'No MLS number or address to match' };
    }

    return { success: true, updated: result.rowCount ?? 0 };
  } catch (e: any) {
    return { success: false, updated: 0, error: e.message };
  }
}

/**
 * Push SOLD/RENTED status from CRM to owner's website for all matching listings.
 * Matches by MLS number. Hides price for sold/rented listings.
 */
export async function syncStatusChangesToWebsite(userId: string): Promise<{
  soldUpdated: number;
  rentedUpdated: number;
  error?: string;
}> {
  try {
    const [soldProps, rentedListings] = await Promise.all([
      prisma.rEProperty.findMany({
        where: { userId, listingStatus: 'SOLD', mlsNumber: { not: null } },
        select: { mlsNumber: true },
      }),
      prisma.rERentalListing.findMany({
        where: { userId, listingStatus: 'RENTED', mlsNumber: { not: null } },
        select: { mlsNumber: true },
      }),
    ]);

    let soldUpdated = 0;
    let rentedUpdated = 0;

    for (const p of soldProps) {
      if (p.mlsNumber) {
        const r = await syncStatusToWebsite(userId, p.mlsNumber, null, 'SOLD');
        if (r.updated > 0) soldUpdated += r.updated;
      }
    }
    for (const r of rentedListings) {
      if (r.mlsNumber) {
        const res = await syncStatusToWebsite(userId, r.mlsNumber, null, 'RENTED');
        if (res.updated > 0) rentedUpdated += res.updated;
      }
    }

    return { soldUpdated, rentedUpdated };
  } catch (e: any) {
    return { soldUpdated: 0, rentedUpdated: 0, error: e.message };
  }
}

export async function getPropertyForEdit(websiteId: string, propertyId: number): Promise<PropertyListing | null> {
  const resolved = await resolveWebsiteDb(websiteId);
  if (!resolved) return null;

  const website = await resolved.db.website.findFirst({
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

async function getUserIndustry(userId: string): Promise<string | null> {
  try {
    const user = await getMetaDb().user.findUnique({
      where: { id: userId },
      select: { industry: true },
    });
    return user?.industry ?? null;
  } catch {
    return null;
  }
}
