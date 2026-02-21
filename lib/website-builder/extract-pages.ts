/**
 * Extract pages from any website structure format.
 * Handles three layouts:
 *   1. Standard:  { pages: [...] }
 *   2. Root-level: { components: [...] } or { sections: [...] }
 *   3. Named keys: { home: { components: [...] }, about: { components: [...] } }
 */

export interface ExtractedPage {
  id: string;
  name: string;
  path: string;
  components: any[];
  seo?: any;
}

const RESERVED_KEYS = new Set([
  'globalStyles', 'navigation', 'footer', 'fonts', 'colors',
  'meta', 'seo', 'settings', 'config', 'pages', 'theme',
  'analytics', 'integrations', 'scripts', 'head',
]);

export function extractPages(structure: any): ExtractedPage[] {
  if (!structure || typeof structure !== 'object') return [];

  // 1. Standard pages array
  if (Array.isArray(structure.pages) && structure.pages.length > 0) {
    return structure.pages;
  }

  // 2. Root-level components / sections
  const rootComponents = structure.components || structure.sections;
  if (Array.isArray(rootComponents) && rootComponents.length > 0) {
    return [{
      id: 'home',
      name: 'Home',
      path: '/',
      components: rootComponents,
      seo: structure.seo,
    }];
  }

  // 3. Named page keys (e.g. structure.home, structure.about)
  const pageKeys = Object.keys(structure).filter(
    (k) =>
      !RESERVED_KEYS.has(k) &&
      typeof structure[k] === 'object' &&
      !Array.isArray(structure[k]) &&
      structure[k] !== null &&
      (Array.isArray(structure[k]?.components) || Array.isArray(structure[k]?.sections))
  );

  if (pageKeys.length > 0) {
    return pageKeys.map((k) => ({
      id: k,
      name: k.charAt(0).toUpperCase() + k.slice(1).replace(/[-_]/g, ' '),
      path: k === 'home' ? '/' : `/${k}`,
      components: structure[k].components || structure[k].sections || [],
      seo: structure[k].seo,
    }));
  }

  return [];
}

/** Default nav for SERVICE template — used when deriving pages from navConfig */
const DEFAULT_NAV = {
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

/**
 * Extract pages for the Page Editor. When structure has no pages (e.g. template sites
 * like real estate brokers), derive pages from navConfig so users can see their site's
 * pages and use Menu & Page Labels or add sections.
 */
export function getPagesForEditor(
  structure: any,
  navConfig?: Record<string, unknown> | null
): ExtractedPage[] {
  const fromStructure = extractPages(structure);
  if (fromStructure.length > 0) return fromStructure;

  // For template sites (SERVICE, PRODUCT) with empty structure, derive from navConfig
  const nav = (navConfig && Object.keys(navConfig).length > 0
    ? { ...DEFAULT_NAV, ...navConfig }
    : DEFAULT_NAV) as typeof DEFAULT_NAV;

  const seen = new Set<string>();
  const pages: ExtractedPage[] = [];

  const addPage = (path: string, label: string) => {
    const normalizedPath = path === '' ? '/' : path.startsWith('/') ? path : `/${path}`;
    if (seen.has(normalizedPath)) return;
    seen.add(normalizedPath);
    const id = normalizedPath === '/' ? 'home' : normalizedPath.slice(1).replace(/\//g, '-') || 'page';
    pages.push({
      id,
      name: label,
      path: normalizedPath,
      components: [],
      seo: undefined,
    });
  };

  // topLinks first (Home, Properties, etc.)
  for (const item of nav.topLinks || []) {
    addPage(item.href, item.label);
  }
  // navItems and their children
  for (const item of nav.navItems || []) {
    addPage(item.href, item.label);
    for (const child of item.children || []) {
      addPage(child.href, child.label);
    }
  }
  // footerLinks (may add more unique paths)
  for (const item of nav.footerLinks || []) {
    addPage(item.href, item.label);
  }

  return pages;
}
