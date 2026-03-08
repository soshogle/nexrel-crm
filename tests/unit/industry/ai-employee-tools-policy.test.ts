import { describe, expect, it } from "vitest";
import { buildAiEmployeeTools } from "@/lib/ai-employee-tools";

describe("AI employee tools policy", () => {
  it("returns stable core tool set for retail and orthodontist industry contexts", () => {
    const retailTools = buildAiEmployeeTools("agent-retail", {
      source: "industry",
      industry: "RETAIL",
      employeeType: "INVENTORY_COORDINATOR",
    });

    const orthoTools = buildAiEmployeeTools("agent-ortho", {
      source: "industry",
      industry: "ORTHODONTIST",
      employeeType: "TREATMENT_COORDINATOR",
    });

    expect(retailTools.length).toBe(4);
    expect(orthoTools.length).toBe(4);
  });

  it("keeps real estate provisioning tool set unchanged", () => {
    const reTools = buildAiEmployeeTools("agent-re", {
      source: "real_estate",
      employeeType: "LEAD_MANAGER",
    });

    expect(reTools.map((t) => t.function.name).sort()).toEqual([
      "get_my_task_config",
      "get_my_task_history",
      "run_my_tasks",
      "update_my_task_toggles",
    ]);
  });
});
