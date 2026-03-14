import { describe, expect, it } from "vitest";
import { buildAiTarget } from "@/lib/ai-employees/ai-targets";

describe("buildAiTarget", () => {
  it("builds default agent_os target metadata", () => {
    expect(buildAiTarget("live_run.start")).toEqual({
      "data-ai-target": "live_run.start",
      "data-ai-group": "agent_os",
    });
  });

  it("allows custom groups", () => {
    expect(buildAiTarget("lead.create.submit", "crm_core")).toEqual({
      "data-ai-target": "lead.create.submit",
      "data-ai-group": "crm_core",
    });
  });
});
