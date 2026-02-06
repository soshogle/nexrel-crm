/**
 * Medical Spa Industry Workflows Tab
 * Wrapper for Medical Spa-specific workflows
 */

'use client';

import { IndustryWorkflowsTab } from '@/components/workflows/industry-workflows-tab';

export function MedicalSpaWorkflowsTab() {
  return <IndustryWorkflowsTab industry="MEDICAL_SPA" />;
}
