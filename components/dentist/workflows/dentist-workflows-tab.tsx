/**
 * Dentist Industry Workflows Tab
 * Wrapper for Dentist-specific workflows
 */

'use client';

import { IndustryWorkflowsTab } from '@/components/workflows/industry-workflows-tab';

export function DentistWorkflowsTab() {
  return <IndustryWorkflowsTab industry="DENTIST" />;
}
