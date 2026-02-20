/**
 * Medical Spa Industry Workflows Tab
 * Wrapper for Medical Spa-specific workflows
 */

'use client';

import { IndustryWorkflowsTab } from '@/components/workflows/industry-workflows-tab';

export function MedicalSpaWorkflowsTab({ preSelectedAgent }: { preSelectedAgent?: string | null }) {
  return <IndustryWorkflowsTab industry="MEDICAL_SPA" preSelectedAgent={preSelectedAgent} />;
}
