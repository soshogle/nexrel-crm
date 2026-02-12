/**
 * Website Builder Context for Voice/Chat AI
 * Syncs page state to sessionStorage so the voice agent and chat assistant
 * can "see" what the user sees and follow along during the build process.
 */

const STORAGE_KEY_PREFIX = 'websiteBuilderContext';

export interface WebsiteBuilderContext {
  /** Current page: 'new' | 'list' | 'editor' */
  page: string;
  /** When on /new: 'initial' | 'rebuild' | 'new' | 'building' */
  step?: string;
  /** When rebuilding: the URL being cloned */
  rebuildUrl?: string;
  /** When rebuilding: the name for the new site */
  rebuildName?: string;
  /** When creating new: template type */
  templateType?: string;
  /** When creating new: website name */
  websiteName?: string;
  /** When editing: the website ID */
  activeWebsiteId?: string;
  /** When editing: website name */
  activeWebsiteName?: string;
  /** When editing: current tab (editor, stock, analytics, etc) */
  activeTab?: string;
  /** Build progress 0-100 when building */
  buildProgress?: number;
}

export function getWebsiteBuilderContext(): WebsiteBuilderContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY_PREFIX);
    if (!stored) return null;
    return JSON.parse(stored) as WebsiteBuilderContext;
  } catch {
    return null;
  }
}

export function setWebsiteBuilderContext(ctx: Partial<WebsiteBuilderContext>) {
  if (typeof window === 'undefined') return;
  try {
    const existing = getWebsiteBuilderContext() || {};
    const merged = { ...existing, ...ctx };
    sessionStorage.setItem(STORAGE_KEY_PREFIX, JSON.stringify(merged));
  } catch (e) {
    console.error('[WebsiteBuilderContext] Failed to save:', e);
  }
}

export function clearWebsiteBuilderContext() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(STORAGE_KEY_PREFIX);
}

/**
 * Build a human-readable summary for the voice agent's dynamic variables
 */
export function getWebsiteBuilderContextSummary(): string {
  const ctx = getWebsiteBuilderContext();
  if (!ctx) return '';

  const parts: string[] = [];
  if (ctx.page === 'new') {
    parts.push(`User is on the Create Website page`);
    if (ctx.step === 'initial') parts.push('choosing between clone or new template');
    else if (ctx.step === 'rebuild') {
      parts.push('in clone mode');
      if (ctx.rebuildUrl) parts.push(`URL: ${ctx.rebuildUrl}`);
      if (ctx.rebuildName) parts.push(`name: ${ctx.rebuildName}`);
    } else if (ctx.step === 'new') {
      parts.push('in template mode');
      if (ctx.websiteName) parts.push(`name: ${ctx.websiteName}`);
      if (ctx.templateType) parts.push(`template: ${ctx.templateType}`);
    } else if (ctx.step === 'building') {
      parts.push('website is building', ctx.buildProgress ? `${ctx.buildProgress}% complete` : '');
    }
  } else if (ctx.page === 'editor' && ctx.activeWebsiteId) {
    parts.push(`User is editing website: ${ctx.activeWebsiteName || ctx.activeWebsiteId}`);
    if (ctx.activeTab) parts.push(`tab: ${ctx.activeTab}`);
  } else if (ctx.page === 'list') {
    parts.push('User is on the Websites list');
  }

  return parts.filter(Boolean).join('. ');
}
