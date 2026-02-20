/**
 * Optometrist Industry Workflows Tab
 * Wrapper for Optometrist-specific workflows
 */

'use client';

import { IndustryWorkflowsTab } from '@/components/workflows/industry-workflows-tab';

export function OptometristWorkflowsTab({ preSelectedAgent }: { preSelectedAgent?: string | null }) {
  return <IndustryWorkflowsTab industry="OPTOMETRIST" preSelectedAgent={preSelectedAgent} />;
}
