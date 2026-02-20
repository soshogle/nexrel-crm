/**
 * Technology Industry Workflows Tab
 * Wrapper for Technology-specific workflows
 */

'use client';

import { IndustryWorkflowsTab } from '@/components/workflows/industry-workflows-tab';

export function TechnologyWorkflowsTab({ preSelectedAgent }: { preSelectedAgent?: string | null }) {
  return <IndustryWorkflowsTab industry="TECHNOLOGY" preSelectedAgent={preSelectedAgent} />;
}
