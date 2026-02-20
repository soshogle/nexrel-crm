/**
 * Construction Industry Workflows Tab
 * Wrapper for Construction-specific workflows
 */

'use client';

import { IndustryWorkflowsTab } from '@/components/workflows/industry-workflows-tab';

export function ConstructionWorkflowsTab({ preSelectedAgent }: { preSelectedAgent?: string | null }) {
  return <IndustryWorkflowsTab industry="CONSTRUCTION" preSelectedAgent={preSelectedAgent} />;
}
