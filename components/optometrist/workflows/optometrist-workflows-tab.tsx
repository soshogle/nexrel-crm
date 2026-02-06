/**
 * Optometrist Industry Workflows Tab
 * Wrapper for Optometrist-specific workflows
 */

'use client';

import { IndustryWorkflowsTab } from '@/components/workflows/industry-workflows-tab';

export function OptometristWorkflowsTab() {
  return <IndustryWorkflowsTab industry="OPTOMETRIST" />;
}
