/**
 * Granular website tools for AI assistant
 * Direct structure manipulation without full AI modification flow
 */

import type { WebsiteStructure, WebsitePage, Component } from './types';

export interface WebsiteStructureSummary {
  pages: Array<{
    id: string;
    name: string;
    path: string;
    components: Array<{
      id: string;
      type: string;
      summary: string;
    }>;
  }>;
  globalStyles?: { colors?: Record<string, string> };
}

/**
 * Get a simplified, AI-friendly summary of website structure
 */
export function getWebsiteStructureSummary(structure: any): WebsiteStructureSummary {
  const s = structure as WebsiteStructure;
  if (!s?.pages) {
    return { pages: [] };
  }

  return {
    pages: s.pages.map((page: WebsitePage) => ({
      id: page.id,
      name: page.name,
      path: page.path,
      components: (page.components || []).map((c: Component) => ({
        id: c.id || 'unknown',
        type: c.type,
        summary: summarizeComponent(c),
      })),
    })),
    globalStyles: s.globalStyles ? { colors: s.globalStyles.colors } : undefined,
  };
}

function summarizeComponent(c: Component): string {
  const p = c.props || {};
  const parts: string[] = [];
  if (p.title) parts.push(`title: "${p.title}"`);
  if (p.heading) parts.push(`heading: "${p.heading}"`);
  if (p.subtitle) parts.push(`subtitle: "${p.subtitle}"`);
  if (p.ctaText) parts.push(`cta: "${p.ctaText}"`);
  if (p.content) parts.push(`content: "${String(p.content).slice(0, 80)}..."`);
  if (p.description) parts.push(`desc: "${String(p.description).slice(0, 80)}..."`);
  if (p.label) parts.push(`label: "${p.label}"`);
  return parts.length ? parts.join(', ') : '(no content)';
}

/**
 * Find hero component (type Hero or HeroSection) on home page
 */
export function findHeroComponent(structure: any): { pageIndex: number; compIndex: number; component: any } | null {
  const pages = structure?.pages || [];
  for (let pi = 0; pi < pages.length; pi++) {
    const comps = pages[pi].components || [];
    const idx = comps.findIndex((c: any) => c.type === 'Hero' || c.type === 'HeroSection');
    if (idx >= 0) return { pageIndex: pi, compIndex: idx, component: comps[idx] };
  }
  return null;
}

/**
 * Find CTA section or component
 */
export function findCTAComponent(structure: any): { pageIndex: number; compIndex: number; component: any } | null {
  const pages = structure?.pages || [];
  for (let pi = 0; pi < pages.length; pi++) {
    const comps = pages[pi].components || [];
    const idx = comps.findIndex((c: any) => c.type === 'CTASection' || (c.props?.ctaText && c.type?.includes('CTA')));
    if (idx >= 0) return { pageIndex: pi, compIndex: idx, component: comps[idx] };
  }
  return null;
}

/**
 * Find section by type or index
 */
export function findSection(
  structure: any,
  options: { pagePath?: string; pageIndex?: number; sectionType?: string; sectionIndex?: number }
): { pageIndex: number; compIndex: number; component: any } | null {
  const pages = structure?.pages || [];
  const pageIndex = options.pageIndex ?? (options.pagePath ? pages.findIndex((p: any) => p.path === options.pagePath) : 0);
  if (pageIndex < 0 || pageIndex >= pages.length) return null;

  const comps = pages[pageIndex].components || [];
  if (options.sectionType) {
    const idx = comps.findIndex((c: any) => c.type === options.sectionType);
    if (idx >= 0) return { pageIndex, compIndex: idx, component: comps[idx] };
  }
  if (options.sectionIndex !== undefined) {
    if (options.sectionIndex >= 0 && options.sectionIndex < comps.length) {
      return { pageIndex, compIndex: options.sectionIndex, component: comps[options.sectionIndex] };
    }
  }
  return null;
}

/**
 * Apply a change to structure (deep clone, modify, return new structure)
 */
export function applyStructureChange(
  structure: any,
  change: { type: 'add' | 'update' | 'delete'; path: string; data?: any }
): any {
  const newStructure = JSON.parse(JSON.stringify(structure));

  const pathParts = change.path.split('.');
  let current = newStructure;

  for (let i = 0; i < pathParts.length - 1; i++) {
    const part = pathParts[i];
    if (part.includes('[')) {
      const [key, index] = part.split('[');
      const idx = parseInt(index.replace(']', ''), 10);
      current = current[key][idx];
    } else {
      current = current[part];
    }
  }

  const lastPart = pathParts[pathParts.length - 1];
  if (lastPart.includes('[')) {
    const [key, index] = lastPart.split('[');
    const idx = parseInt(index.replace(']', ''), 10);
    if (change.type === 'add') {
      current[key].splice(idx, 0, change.data);
    } else if (change.type === 'update') {
      if (typeof change.data === 'object' && !Array.isArray(change.data)) {
        current[key][idx] = { ...current[key][idx], ...change.data };
      } else {
        current[key][idx] = change.data;
      }
    } else if (change.type === 'delete') {
      current[key].splice(idx, 1);
    }
  } else {
    if (change.type === 'add') {
      if (Array.isArray(current[lastPart])) {
        current[lastPart].push(change.data);
      } else {
        current[lastPart] = change.data;
      }
    } else if (change.type === 'update') {
      if (typeof change.data === 'object' && !Array.isArray(change.data) && current[lastPart] && typeof current[lastPart] === 'object') {
        current[lastPart] = { ...current[lastPart], ...change.data };
      } else {
        current[lastPart] = change.data;
      }
    } else if (change.type === 'delete') {
      delete current[lastPart];
    }
  }

  return newStructure;
}

/**
 * Reorder sections/components on a page
 */
export function reorderSections(
  structure: any,
  pagePath: string,
  fromIndex: number,
  toIndex: number
): any {
  const newStructure = JSON.parse(JSON.stringify(structure));
  const pages = newStructure?.pages || [];
  const pageIndex = pages.findIndex((p: any) => p.path === pagePath);
  if (pageIndex < 0) return structure;

  const comps = pages[pageIndex].components || [];
  if (fromIndex < 0 || fromIndex >= comps.length || toIndex < 0 || toIndex >= comps.length) {
    return structure;
  }

  const [removed] = comps.splice(fromIndex, 1);
  comps.splice(toIndex, 0, removed);
  return newStructure;
}

/**
 * Delete a section by index or type
 */
export function deleteSection(
  structure: any,
  options: { pagePath?: string; pageIndex?: number; sectionIndex?: number; sectionType?: string }
): any {
  const newStructure = JSON.parse(JSON.stringify(structure));
  const pages = newStructure?.pages || [];
  const pageIndex = options.pageIndex ?? (options.pagePath ? pages.findIndex((p: any) => p.path === options.pagePath) : 0);
  if (pageIndex < 0 || pageIndex >= pages.length) return structure;

  const comps = pages[pageIndex].components || [];
  let targetIndex: number;

  if (options.sectionIndex !== undefined) {
    targetIndex = options.sectionIndex;
  } else if (options.sectionType) {
    targetIndex = comps.findIndex((c: any) => c.type === options.sectionType);
  } else {
    return structure;
  }

  if (targetIndex < 0 || targetIndex >= comps.length) return structure;

  comps.splice(targetIndex, 1);
  return newStructure;
}

/**
 * Update section layout (padding, margin, alignment, visibility)
 */
export function updateSectionLayout(
  structure: any,
  options: {
    pagePath?: string;
    pageIndex?: number;
    sectionIndex?: number;
    sectionType?: string;
    layout: { padding?: Record<string, number>; margin?: Record<string, number>; alignment?: string; visibility?: Record<string, boolean> };
  }
): any {
  const newStructure = JSON.parse(JSON.stringify(structure));
  const pages = newStructure?.pages || [];
  const pageIndex = options.pageIndex ?? (options.pagePath ? pages.findIndex((p: any) => p.path === options.pagePath) : 0);
  if (pageIndex < 0 || pageIndex >= pages.length) return structure;

  const comps = pages[pageIndex].components || [];
  let targetIndex: number;

  if (options.sectionIndex !== undefined) {
    targetIndex = options.sectionIndex;
  } else if (options.sectionType) {
    targetIndex = comps.findIndex((c: any) => c.type === options.sectionType);
  } else {
    return structure;
  }

  if (targetIndex < 0 || targetIndex >= comps.length) return structure;

  comps[targetIndex].layout = { ...(comps[targetIndex].layout || {}), ...options.layout };
  return newStructure;
}
