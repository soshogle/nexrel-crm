/**
 * Medical Industry Workflows Tab
 * Wrapper for Medical-specific workflows
 */

'use client';

import { IndustryWorkflowsTab } from '@/components/workflows/industry-workflows-tab';

export function MedicalWorkflowsTab({ preSelectedAgent }: { preSelectedAgent?: string | null }) {
  return <IndustryWorkflowsTab industry="MEDICAL" preSelectedAgent={preSelectedAgent} />;
}
