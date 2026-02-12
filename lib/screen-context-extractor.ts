/**
 * Extract visible text from the DOM so the voice/chat agent can "see" what the user sees.
 * Used when the user is actively communicating with the AI assistant.
 */

const MAX_LENGTH = 800; // Keep concise for voice agent variable limits
const SKIP_SELECTORS = [
  'script', 'style', 'noscript', 'svg', 'path',
  '[aria-hidden="true"]', '[role="presentation"]',
  '.sr-only', '[hidden]',
];

/**
 * Extract a readable summary of what's visible on the screen.
 * Focuses on main content: headings, labels, buttons, form values.
 */
export function extractScreenContext(): string {
  if (typeof document === 'undefined') return '';

  try {
    const parts: string[] = [];
    const seen = new Set<string>();

    const addUnique = (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || trimmed.length < 2) return;
      const key = trimmed.toLowerCase().slice(0, 50);
      if (seen.has(key)) return;
      seen.add(key);
      parts.push(trimmed);
    };

    // Get main content area - prefer main, article, or the main scrollable area
    const main = document.querySelector('main') || document.querySelector('[role="main"]') || document.querySelector('article') || document.body;

    // Headings (h1-h3) - page structure
    main.querySelectorAll('h1, h2, h3').forEach((el) => {
      if (isVisible(el)) addUnique(el.textContent || '');
    });

    // Card titles / headers
    main.querySelectorAll('[class*="CardTitle"], [class*="card-title"], [class*="CardHeader"]').forEach((el) => {
      if (isVisible(el)) addUnique(el.textContent || '');
    });

    // Labels (form fields)
    main.querySelectorAll('label').forEach((el) => {
      if (isVisible(el)) {
        const labelText = el.textContent?.trim();
        const forId = el.getAttribute('for');
        let value = '';
        if (forId) {
          const input = document.getElementById(forId) as HTMLInputElement | HTMLTextAreaElement | null;
          if (input && input.value && input.type !== 'password') {
            value = `: "${input.value.slice(0, 80)}"`;
          } else if (input?.type === 'password') {
            value = ': [password]';
          }
        }
        if (labelText) addUnique(labelText + value);
      }
    });

    // Inputs without labels (placeholder or name)
    main.querySelectorAll('input:not([type="hidden"]):not([type="password"]), textarea').forEach((el) => {
      if (isVisible(el)) {
        const input = el as HTMLInputElement | HTMLTextAreaElement;
        const placeholder = input.placeholder || input.name || input.id;
        const value = input.value?.trim();
        if (placeholder || value) {
          addUnique((placeholder ? placeholder + ' ' : '') + (value ? `"${value.slice(0, 60)}"` : ''));
        }
      }
    });

    // Button text (primary actions)
    main.querySelectorAll('button:not([aria-hidden]), [role="button"]').forEach((el) => {
      if (isVisible(el)) {
        const text = el.textContent?.trim();
        if (text && text.length < 50) addUnique(`[${text}]`);
      }
    });

    // Badge / status text
    main.querySelectorAll('[class*="Badge"], [class*="badge"], [class*="status"]').forEach((el) => {
      if (isVisible(el)) addUnique(el.textContent || '');
    });

    // Tab labels (current tab)
    main.querySelectorAll('[role="tab"][aria-selected="true"], [data-state="active"]').forEach((el) => {
      if (isVisible(el)) addUnique(`Tab: ${el.textContent?.trim() || ''}`);
    });

    const raw = parts.join('. ');
    if (!raw) return '';

    // Truncate to fit in variable limits
    if (raw.length > MAX_LENGTH) {
      return raw.slice(0, MAX_LENGTH - 3) + '...';
    }
    return raw;
  } catch (e) {
    console.warn('[screen-context-extractor] Error:', e);
    return '';
  }
}

function isVisible(el: Element): boolean {
  if (el.closest(SKIP_SELECTORS.join(', '))) return false;
  const style = window.getComputedStyle(el);
  if (style.visibility === 'hidden' || style.display === 'none' || style.opacity === '0') return false;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return false;
  // Roughly in viewport
  if (rect.bottom < 0 || rect.top > window.innerHeight) return false;
  return true;
}
