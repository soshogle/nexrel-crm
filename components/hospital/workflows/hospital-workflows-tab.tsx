/**
 * Hospital Industry Workflows Tab
 * Wrapper for Hospital-specific workflows
 */

'use client';

import { IndustryWorkflowsTab } from '@/components/workflows/industry-workflows-tab';

export function HospitalWorkflowsTab() {
  return <IndustryWorkflowsTab industry="HOSPITAL" />;
}
