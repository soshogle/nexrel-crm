/**
 * Website accessibility checker - contrast, headings, alt text
 */

import { getWebsiteStructureSummary } from './granular-tools';

export interface AccessibilityIssue {
  type: 'contrast' | 'heading_order' | 'alt_text' | 'color_contrast';
  severity: 'error' | 'warning';
  message: string;
  location?: string;
  suggestion?: string;
}

export function checkWebsiteAccessibility(structure: any): AccessibilityIssue[] {
  const issues: AccessibilityIssue[] = [];
  const summary = getWebsiteStructureSummary(structure);

  for (const page of summary.pages) {
    for (const comp of page.components) {
      const loc = `Page: ${page.path}, Section: ${comp.type}`;

      // Check for images without alt text
      const props = (structure?.pages?.find((p: any) => p.path === page.path)?.components?.find((c: any) => c.type === comp.type))?.props || {};
      if (props.imageUrl || props.backgroundImage || props.src) {
        if (!props.alt && !props.altText) {
          issues.push({
            type: 'alt_text',
            severity: 'error',
            message: `Image in ${comp.type} missing alt text`,
            location: loc,
            suggestion: 'Add descriptive alt text for screen readers',
          });
        }
      }

      // Check heading order (simplified - we'd need to parse HTML for full check)
      if (comp.type === 'Hero' || comp.type === 'HeroSection') {
        if (props.title && props.title.length > 80) {
          issues.push({
            type: 'heading_order',
            severity: 'warning',
            message: 'Hero title may be too long for accessibility',
            location: loc,
            suggestion: 'Keep headings under 80 characters',
          });
        }
      }
    }
  }

  // Check global colors for contrast (simplified)
  const colors = structure?.globalStyles?.colors || {};
  if (colors.primary && colors.background) {
    // Basic check - in production use a proper contrast ratio library
    if (colors.primary === colors.background) {
      issues.push({
        type: 'contrast',
        severity: 'error',
        message: 'Primary and background colors may be too similar',
        suggestion: 'Use contrasting colors for text and background',
      });
    }
  }

  return issues;
}
