/**
 * Extract pages from any website structure format.
 * Handles four layouts:
 *   1. Standard:  { pages: [...] }
 *   2. Pages as object: { pages: { home: { components: [...] }, about: { components: [...] } } }
 *   3. Root-level: { components: [...] } or { sections: [...] }
 *   4. Named keys: { home: { components: [...] }, about: { components: [...] } }
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
  'meta', 'seo', 'settings', 'config', 'theme',
  'analytics', 'integrations', 'scripts', 'head',
]);

function humanizeKey(k: string): string {
  return k.charAt(0).toUpperCase() + k.slice(1).replace(/[-_]/g, ' ');
}

export function extractPages(structure: any): ExtractedPage[] {
  if (!structure || typeof structure !== 'object') return [];

  // 1. Standard pages array
  if (Array.isArray(structure.pages) && structure.pages.length > 0) {
    return structure.pages;
  }

  // 2. Pages stored as an object/dictionary (e.g. { pages: { home: {...}, about: {...} } })
  if (
    structure.pages &&
    typeof structure.pages === 'object' &&
    !Array.isArray(structure.pages)
  ) {
    const entries = Object.entries(structure.pages).filter(
      ([, val]) =>
        val && typeof val === 'object' && !Array.isArray(val)
    );
    if (entries.length > 0) {
      return entries.map(([k, page]: [string, any]) => ({
        id: k,
        name: page.name || page.title || humanizeKey(k),
        path: page.path || (k === 'home' ? '/' : `/${k}`),
        components: page.components || page.sections || [],
        seo: page.seo,
      }));
    }
  }

  // 3. Root-level components / sections
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

  // 4. Named page keys (e.g. structure.home, structure.about)
  const pageKeys = Object.keys(structure).filter(
    (k) =>
      !RESERVED_KEYS.has(k) &&
      k !== 'pages' &&
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

/** Generate default editable sections for a navConfig-derived page */
function createDefaultSections(pageId: string, label: string): any[] {
  return [
    {
      id: `${pageId}-hero`,
      type: 'Hero',
      props: {
        title: label,
        subtitle: `Welcome to our ${label} page`,
        imageUrl: '',
        ctaText: 'Learn More',
        ctaLink: '/contact',
      },
    },
    {
      id: `${pageId}-content`,
      type: 'ContentSection',
      props: {
        heading: `About ${label}`,
        text: `Discover everything about our ${label.toLowerCase()} services. Edit this section to add your own content.`,
      },
    },
    {
      id: `${pageId}-image`,
      type: 'ImageSection',
      props: {
        title: `${label} image`,
        imageUrl: '',
        alt: '',
      },
    },
    {
      id: `${pageId}-cta`,
      type: 'CTASection',
      props: {
        title: 'Ready to Get Started?',
        description: `Contact us today to learn more about ${label.toLowerCase()}.`,
        ctaText: 'Contact Us',
        ctaLink: '/contact',
      },
    },
  ];
}

/**
 * Extract pages for the Page Editor. Merges structure pages with navConfig pages so
 * all routes are visible and editable. NavConfig pages that don't exist in the structure
 * get default editable sections so users can start editing immediately.
 */
export function getPagesForEditor(
  structure: any,
  navConfig?: Record<string, unknown> | null
): ExtractedPage[] {
  const fromStructure = extractPages(structure);

  // Collect navConfig pages
  const nav = (navConfig && Object.keys(navConfig).length > 0
    ? { ...DEFAULT_NAV, ...navConfig }
    : DEFAULT_NAV) as typeof DEFAULT_NAV;

  const seen = new Set<string>(fromStructure.map((p) => p.path));
  const navPages: ExtractedPage[] = [];

  const addNavPage = (path: string, label: string) => {
    const normalizedPath = path === '' ? '/' : path.startsWith('/') ? path : `/${path}`;
    if (seen.has(normalizedPath)) return;
    seen.add(normalizedPath);
    const id = normalizedPath === '/' ? 'home' : normalizedPath.slice(1).replace(/\//g, '-') || 'page';
    navPages.push({
      id,
      name: label,
      path: normalizedPath,
      components: createDefaultSections(id, label),
      seo: undefined,
    });
  };

  // topLinks first (Home, Properties, etc.)
  for (const item of nav.topLinks || []) {
    addNavPage(item.href, item.label);
  }
  // navItems and their children
  for (const item of nav.navItems || []) {
    addNavPage(item.href, item.label);
    for (const child of item.children || []) {
      addNavPage(child.href, child.label);
    }
  }
  // footerLinks (may add more unique paths)
  for (const item of nav.footerLinks || []) {
    addNavPage(item.href, item.label);
  }

  // Merge: structure pages first, then navConfig pages
  return [...fromStructure, ...navPages];
}
