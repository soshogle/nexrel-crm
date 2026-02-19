/**
 * GET /api/websites/[id]/agency-config
 * Returns agency config for a website (logo, name, contact, nav, page labels).
 * Used by owner-deployed templates to fetch config at runtime.
 * Auth: session OR x-website-secret header (for template server fetches)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Default nav structure for SERVICE template — used when navConfig is empty */
const DEFAULT_NAV_CONFIG = {
  navItems: [
    { label: 'Selling', href: '/selling', children: [{ label: 'For Sale', href: '/for-sale' }, { label: 'Sold Properties', href: '/sold' }, { label: 'Property Concierge', href: '/property-concierge' }, { label: 'Market Appraisal', href: '/market-appraisal' }] },
    { label: 'Buying', href: '/buying', children: [{ label: 'For Sale', href: '/for-sale' }, { label: 'Prestige Properties', href: '/prestige' }, { label: 'Secret Properties', href: '/secret-properties' }] },
    { label: 'Renting', href: '/renting', children: [{ label: 'For Lease', href: '/for-lease' }] },
    { label: 'About', href: '/about', children: undefined },
    { label: 'News & Media', href: '/news', children: [{ label: 'Blog', href: '/blog' }] },
  ],
  topLinks: [
    { label: 'Home', href: '/' },
    { label: 'Properties', href: '/properties' },
    { label: 'Get A Quote', href: '/get-a-quote' },
    { label: 'Contact', href: '/contact' },
    { label: 'Secret Properties', href: '/secret-properties' },
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
      return NextResponse.json({ error: 'Website ID required' }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    const secret = request.headers.get('x-website-secret');
    const expectedSecret = process.env.WEBSITE_VOICE_CONFIG_SECRET;

    if (!session?.user?.id && !(expectedSecret && secret === expectedSecret)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const website = await prisma.website.findUnique({
      where: { id: websiteId },
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
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    if (session?.user?.id && website.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
