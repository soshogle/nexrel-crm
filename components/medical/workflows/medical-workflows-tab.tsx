/**
 * Medical Industry Workflows Tab
 * Wrapper for Medical-specific workflows
 */

'use client';

import { IndustryWorkflowsTab } from '@/components/workflows/industry-workflows-tab';

export function MedicalWorkflowsTab() {
  return <IndustryWorkflowsTab industry="MEDICAL" />;
}
