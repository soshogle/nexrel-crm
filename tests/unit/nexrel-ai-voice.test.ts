import { describe, expect, it } from "vitest";
import {
  NEXREL_AI_MODES,
  buildNexrelAiRecoverySuggestion,
  getCustomerWorkflowSteps,
  getVerticalPlaybookSteps,
} from "@/lib/nexrel-ai-voice";

describe("nexrel ai voice orchestration helpers", () => {
  it("includes all required Nexrel AI modes", () => {
    expect(NEXREL_AI_MODES).toContain("work_ai_orchestrator");
    expect(NEXREL_AI_MODES).toContain("sales_squad");
    expect(NEXREL_AI_MODES).toContain("social_media_loop");
    expect(NEXREL_AI_MODES).toContain("execution_chain");
    expect(NEXREL_AI_MODES).toContain("approval_voice");
    expect(NEXREL_AI_MODES).toContain("daily_command_center");
    expect(NEXREL_AI_MODES).toContain("meeting_call_intelligence");
    expect(NEXREL_AI_MODES).toContain("performance_coaching");
    expect(NEXREL_AI_MODES).toContain("vertical_playbook");
    expect(NEXREL_AI_MODES).toContain("autonomous_mode");
    expect(NEXREL_AI_MODES).toContain("team_ops");
    expect(NEXREL_AI_MODES).toContain("customer_voice_workflow");
  });

  it("returns contextual recovery suggestions", () => {
    expect(buildNexrelAiRecoverySuggestion("missing email", {})).toContain(
      "Missing email",
    );
    expect(buildNexrelAiRecoverySuggestion("missing phone", {})).toContain(
      "Missing phone number",
    );
    expect(buildNexrelAiRecoverySuggestion("name required", {})).toContain(
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
