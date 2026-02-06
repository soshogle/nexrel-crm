/**
 * Construction Industry Workflows Tab
 * Wrapper for Construction-specific workflows
 */

'use client';

import { IndustryWorkflowsTab } from '@/components/workflows/industry-workflows-tab';

export function ConstructionWorkflowsTab() {
  return <IndustryWorkflowsTab industry="CONSTRUCTION" />;
}
