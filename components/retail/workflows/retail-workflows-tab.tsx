/**
 * Retail Industry Workflows Tab
 * Wrapper for Retail-specific workflows
 */

'use client';

import { IndustryWorkflowsTab } from '@/components/workflows/industry-workflows-tab';

export function RetailWorkflowsTab({ preSelectedAgent }: { preSelectedAgent?: string | null }) {
  return <IndustryWorkflowsTab industry="RETAIL" preSelectedAgent={preSelectedAgent} />;
}
