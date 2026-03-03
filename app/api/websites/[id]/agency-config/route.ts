/**
 * GET /api/websites/[id]/agency-config
 * Returns agency config for a website (logo, name, contact, nav, page labels).
 * Used by owner-deployed templates to fetch config at runtime.
 * Auth: session OR x-website-secret header (for template server fetches)
 *
 * Preview mode: ?previewToken=JWT — when present and valid, returns draft config
 * from the JWT payload instead of saved config. Used for "preview before publish".
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import jwt from 'jsonwebtoken';
import { authOptions } from '@/lib/auth';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { getCrmDb } from '@/lib/dal';
import { resolveWebsiteDb } from '@/lib/dal/resolve-website-db';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Default nav structure for SERVICE template — used when navConfig is empty */
const DEFAULT_NAV_CONFIG = {
  navItems: [
    { label: 'Selling', href: '/selling', children: [{ label: 'For Sale', href: '/for-sale' }, { label: 'Sold Properties', href: '/sold' }, { label: 'Property Concierge', href: '/property-concierge' }, { label: 'Market Appraisal', href: '/market-appraisal' }] },
    { label: 'Buying', href: '/buying', children: [{ label: 'For Sale', href: '/for-sale' }, { label: 'Prestige Properties', href: '/prestige' }, { label: 'Secret Properties', href: '/secret-properties' }] },
    { label: 'Renting', href: '/renting', children: [{ label: 'For Lease', href: '/for-lease' }] },
    { label: 'About', href: '/about', children: undefined },
    { label: 'News & Media', href: '/news', children: [{ label: 'Blog', href: '/blog' }, { label: 'Videos', href: '/videos' }, { label: 'Podcasts', href: '/podcasts' }] },
  ],
  topLinks: [
    { label: 'Home', href: '/' },
    { label: 'Properties', href: '/properties' },
    { label: 'Secret Properties', href: '/secret-properties' },
    { label: 'Contact', href: '/contact' },
  ],
  footerLinks: [
    { label: 'Properties', href: '/properties' },
    { label: 'Buying', href: '/buying' },
    { label: 'Selling', href: '/selling' },
    { label: 'Renting', href: '/renting' },
    { label: 'About', href: '/about' },
    { label: 'Blog', href: '/blog' },
    { label: 'Contact', href: '/contact' },
  ],
};

/** Default page labels — used when pageLabels is empty */
const DEFAULT_PAGE_LABELS: Record<string, string> = {
  properties: 'Properties',
  forSale: 'For Sale',
  forLease: 'For Lease',
  selling: 'Selling',
  buying: 'Buying',
  renting: 'Renting',
  prestige: 'Prestige Properties',
  secretProperties: 'Secret Properties',
};

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const websiteId = params.id;
    if (!websiteId) {
      return apiErrors.badRequest('Website ID required');
    }

    const { searchParams } = new URL(request.url);
    const previewToken = searchParams.get('previewToken');
    const secret = request.headers.get('x-website-secret');
    const expectedSecret = process.env.WEBSITE_VOICE_CONFIG_SECRET;

    // Preview mode: valid JWT with draft config overrides saved config
    if (previewToken && expectedSecret) {
      try {
        const decoded = jwt.verify(previewToken, expectedSecret) as {
          websiteId: string;
          config: Record<string, unknown>;
          exp?: number;
        };
        if (decoded.websiteId === websiteId && decoded.config) {
          const draft = decoded.config;
          const navConfig = (draft.navConfig as Record<string, unknown>) || DEFAULT_NAV_CONFIG;
          const pageLabels = (draft.pageLabels as Record<string, string>) || DEFAULT_PAGE_LABELS;
          const crmOrigin = request.nextUrl?.origin || process.env.NEXREL_PUBLIC_URL || process.env.NEXREL_CRM_URL || '';
          const mapsScriptUrl =
            process.env.GOOGLE_MAPS_API_KEY && crmOrigin
              ? `${crmOrigin.replace(/\/$/, '')}/api/maps/js`
              : null;

          const config = {
            brokerName: (draft.brokerName as string) || 'Real Estate Professional',
            name: (draft.name as string) || 'Your Agency',
            logoUrl: (draft.logoUrl as string) || '/placeholder-logo.svg',
            mapsScriptUrl: (draft.mapsScriptUrl as string) || mapsScriptUrl,
            tagline: (draft.tagline as string) || 'Your trusted real estate partner',
            address: (draft.address as string) || '',
            neighborhood: (draft.neighborhood as string) || '',
            city: (draft.city as string) || '',
            province: (draft.province as string) || '',
            postalCode: (draft.postalCode as string) || '',
            fullAddress: (draft.fullAddress as string) || (draft.address as string) || '',
            phone: (draft.phone as string) || '',
            fax: (draft.fax as string) || '',
            email: (draft.email as string) || '',
            languages: Array.isArray(draft.languages) ? draft.languages : ['English'],
            remaxProfileUrl: (draft.remaxProfileUrl as string) || '',
            tranquilliT: draft.tranquilliT === true,
            tranquilliTUrl: (draft.tranquilliTUrl as string) || '',
            fullAgencyMode: draft.fullAgencyMode !== false,
            navConfig,
            pageLabels,
          };

          return NextResponse.json(config, {
            headers: { 'Cache-Control': 'no-store, max-age=0' },
          });
        }
      } catch {
        // Invalid or expired token — fall through to normal flow
      }
    }

    const session = await getServerSession(authOptions);

    if (!session?.user?.id && !(expectedSecret && secret === expectedSecret)) {
      return apiErrors.unauthorized();
    }

    const ctx = session?.user?.id ? getDalContextFromSession(session) : null;
    let db;
    if (ctx) {
      db = getCrmDb(ctx);
    } else {
      const resolved = await resolveWebsiteDb(websiteId);
      if (!resolved) return apiErrors.notFound('Website not found');
      db = resolved.db;
    }
    const website = await db.website.findFirst({
      where: ctx ? { id: websiteId, userId: ctx.userId } : { id: websiteId },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
            address: true,
            companyLogoUrl: true,
            legalEntityName: true,
          },
        },
      },
    });

    if (!website) {
      return apiErrors.notFound('Website not found');
    }

    if (session?.user?.id && website.userId !== session.user.id) {
      return apiErrors.forbidden();
    }

    // Prefer stored agencyConfig; else derive from User + Website
    const stored = (website.agencyConfig as Record<string, unknown> | null) || {};
    const user = website.user;

    // Merge navConfig with defaults (stored overrides defaults)
    const storedNav = website.navConfig as Record<string, unknown> | null;
    const navConfig = storedNav && Object.keys(storedNav).length > 0
      ? { ...DEFAULT_NAV_CONFIG, ...storedNav }
      : DEFAULT_NAV_CONFIG;

    // Merge pageLabels with defaults
    const storedLabels = website.pageLabels as Record<string, string> | null;
    const pageLabels = storedLabels && Object.keys(storedLabels).length > 0
      ? { ...DEFAULT_PAGE_LABELS, ...storedLabels }
      : DEFAULT_PAGE_LABELS;

    // Maps script URL — broker sites load from CRM so they don't need GOOGLE_MAPS_API_KEY per deployment
    const crmOrigin = request.nextUrl?.origin || process.env.NEXREL_PUBLIC_URL || process.env.NEXREL_CRM_URL || "";
    const mapsScriptUrl =
      process.env.GOOGLE_MAPS_API_KEY && crmOrigin
        ? `${crmOrigin.replace(/\/$/, "")}/api/maps/js`
        : null;

    const config = {
      brokerName: (stored.brokerName as string) || user?.name || 'Real Estate Professional',
      name: (stored.name as string) || website.name || user?.legalEntityName || 'Real Estate Agency',
      logoUrl: (stored.logoUrl as string) || user?.companyLogoUrl || '/placeholder-logo.svg',
      mapsScriptUrl: (stored.mapsScriptUrl as string) || mapsScriptUrl,
      tagline: (stored.tagline as string) || 'Your trusted real estate partner',
      address: (stored.address as string) || user?.address || '',
      neighborhood: (stored.neighborhood as string) || '',
      city: (stored.city as string) || '',
      province: (stored.province as string) || '',
      postalCode: (stored.postalCode as string) || '',
      fullAddress: (stored.fullAddress as string) || user?.address || '',
      phone: (stored.phone as string) || user?.phone || '',
      fax: (stored.fax as string) || '',
      email: (stored.email as string) || user?.email || '',
      languages: (stored.languages as string[]) || ['English'],
      remaxProfileUrl: (stored.remaxProfileUrl as string) || '',
      tranquilliT: (stored.tranquilliT as boolean) ?? false,
      tranquilliTUrl: (stored.tranquilliTUrl as string) || '',
      fullAgencyMode: (stored.fullAgencyMode as boolean) ?? true,
      navConfig,
      pageLabels,
    };

    return NextResponse.json(config, {
      headers: {
        'Cache-Control': 'public, max-age=30, s-maxage=30, stale-while-revalidate=60',
      },
    });
  } catch (error: any) {
    console.error('[agency-config] Error:', error);
    return apiErrors.internal();
  }
}
