import { describe, expect, it, vi } from "vitest";
import { buildAiEmployeeTools } from "@/lib/ai-employee-tools";

const NON_RE_INDUSTRIES = [
  "ACCOUNTING",
  "CONSTRUCTION",
  "DENTIST",
  "HEALTH_CLINIC",
  "HOSPITAL",
  "LAW",
  "MEDICAL",
  "MEDICAL_SPA",
  "OPTOMETRIST",
  "ORTHODONTIST",
  "RESTAURANT",
  "RETAIL",
  "SPORTS_CLUB",
  "TECHNOLOGY",
] as const;

describe("Industry provisioning smoke matrix", () => {
  it("has registry coverage and prompt/config parity for all non-RE industries", async () => {
    const { getIndustryAIEmployeeModule } = await vi.importActual<
      typeof import("@/lib/industry-ai-employees/registry")
    >("@/lib/industry-ai-employees/registry");

    for (const industry of NON_RE_INDUSTRIES) {
      const module = getIndustryAIEmployeeModule(industry);
      expect(module).not.toBeNull();

      const employeeTypes = module?.employeeTypes ?? [];
      expect(employeeTypes.length).toBeGreaterThan(0);

      for (const type of employeeTypes) {
        expect(module?.configs[type]).toBeDefined();
        expect(module?.prompts[type]).toBeDefined();
      }
    }
  });

  it("builds non-empty tool payloads for every industry context and RE context", () => {
    for (const industry of NON_RE_INDUSTRIES) {
      const tools = buildAiEmployeeTools(`agent-${industry.toLowerCase()}`, {
        source: "industry",
        industry,
        employeeType: "SMOKE_TEST_EMPLOYEE",
      });

      expect(tools.length).toBe(4);
      const names = tools.map((t) => t.function.name);
      expect(new Set(names).size).toBe(4);
    }

    const reTools = buildAiEmployeeTools("agent-real-estate", {
      source: "real_estate",
      employeeType: "SMOKE_TEST_EMPLOYEE",
    });
    expect(reTools.length).toBe(4);
  });
});
