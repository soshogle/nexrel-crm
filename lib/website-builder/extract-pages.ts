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
      Array.isArray(structure[k]?.components)
  );

  if (pageKeys.length > 0) {
    return pageKeys.map((k) => ({
      id: k,
      name: k.charAt(0).toUpperCase() + k.slice(1).replace(/[-_]/g, ' '),
      path: k === 'home' ? '/' : `/${k}`,
      components: structure[k].components || [],
      seo: structure[k].seo,
    }));
  }

  return [];
}
