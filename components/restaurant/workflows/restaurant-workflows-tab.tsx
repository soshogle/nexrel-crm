/**
 * Restaurant Industry Workflows Tab
 * Wrapper for Restaurant-specific workflows
 */

'use client';

import { IndustryWorkflowsTab } from '@/components/workflows/industry-workflows-tab';

export function RestaurantWorkflowsTab() {
  return <IndustryWorkflowsTab industry="RESTAURANT" />;
}
