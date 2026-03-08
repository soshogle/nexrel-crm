/**
 * Law Industry Workflows Tab
 */

"use client";

import { IndustryWorkflowsTab } from "@/components/workflows/industry-workflows-tab";

export function LawWorkflowsTab({
  preSelectedAgent,
}: {
  preSelectedAgent?: string | null;
}) {
  return (
    <IndustryWorkflowsTab industry="LAW" preSelectedAgent={preSelectedAgent} />
  );
}
