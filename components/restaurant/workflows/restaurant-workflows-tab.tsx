/**
 * Restaurant Industry Workflows Tab
 * Wrapper for Restaurant-specific workflows
 */

'use client';

import { IndustryWorkflowsTab } from '@/components/workflows/industry-workflows-tab';

export function RestaurantWorkflowsTab({ preSelectedAgent }: { preSelectedAgent?: string | null }) {
  return <IndustryWorkflowsTab industry="RESTAURANT" preSelectedAgent={preSelectedAgent} />;
}
