import { describe, expect, it } from "vitest";
import {
  OPENCLAW_MODES,
  buildOpenClawRecoverySuggestion,
  getCustomerWorkflowSteps,
  getVerticalPlaybookSteps,
} from "@/lib/openclaw-voice";

describe("openclaw voice orchestration helpers", () => {
  it("includes all required OpenClaw modes", () => {
    expect(OPENCLAW_MODES).toContain("work_ai_orchestrator");
    expect(OPENCLAW_MODES).toContain("sales_squad");
    expect(OPENCLAW_MODES).toContain("social_media_loop");
    expect(OPENCLAW_MODES).toContain("execution_chain");
    expect(OPENCLAW_MODES).toContain("approval_voice");
    expect(OPENCLAW_MODES).toContain("daily_command_center");
    expect(OPENCLAW_MODES).toContain("meeting_call_intelligence");
    expect(OPENCLAW_MODES).toContain("performance_coaching");
    expect(OPENCLAW_MODES).toContain("vertical_playbook");
    expect(OPENCLAW_MODES).toContain("autonomous_mode");
    expect(OPENCLAW_MODES).toContain("team_ops");
    expect(OPENCLAW_MODES).toContain("customer_voice_workflow");
  });

  it("returns contextual recovery suggestions", () => {
    expect(buildOpenClawRecoverySuggestion("missing email", {})).toContain(
      "Missing email",
    );
    expect(buildOpenClawRecoverySuggestion("missing phone", {})).toContain(
      "Missing phone number",
    );
    expect(buildOpenClawRecoverySuggestion("name required", {})).toContain(
      "contact name",
    );
  });

  it("builds vertical and customer workflow steps", () => {
    const dental = getVerticalPlaybookSteps("dental");
    const realEstate = getVerticalPlaybookSteps("real_estate");
    const customer = getCustomerWorkflowSteps();

    expect(dental.length).toBeGreaterThan(3);
    expect(realEstate.length).toBeGreaterThan(3);
    expect(customer.length).toBe(6);
    expect(dental[0].taskType).toBe("TRIGGER");
    expect(realEstate[0].taskType).toBe("TRIGGER");
    expect(customer[0].name).toContain("Trigger");
  });
});
