import { NextResponse } from "next/server";
import {
  getNexrelAiBrainTenantKillSwitchList,
  getNexrelAiBrainPhase,
  isNexrelAiBrainEnabled,
  isNexrelAiBrainGlobalKillSwitchActive,
  isNexrelAiBrainHighRiskApprovalEnabled,
  isNexrelAiBrainLowRiskWritesEnabled,
  isNexrelAiBrainReadOnlyMode,
} from "@/lib/nexrel-ai-brain/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    success: true,
    name: "nexrel-ai-brain",
    enabled: isNexrelAiBrainEnabled(),
    phase: getNexrelAiBrainPhase(),
    readOnly: isNexrelAiBrainReadOnlyMode(),
    globalKillSwitchActive: isNexrelAiBrainGlobalKillSwitchActive(),
    tenantKillSwitchCount: getNexrelAiBrainTenantKillSwitchList().size,
    lowRiskWritesEnabled: isNexrelAiBrainLowRiskWritesEnabled(),
    highRiskApprovalsEnabled: isNexrelAiBrainHighRiskApprovalEnabled(),
    timestamp: new Date().toISOString(),
  });
}
