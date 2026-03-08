import { describe, expect, it, vi } from "vitest";

const PHASE2_UPDATED_INDUSTRIES = [
  "ACCOUNTING",
  "LAW",
  "TECHNOLOGY",
  "DENTIST",
  "SPORTS_CLUB",
  "MEDICAL_SPA",
  "OPTOMETRIST",
  "HEALTH_CLINIC",
  "HOSPITAL",
] as const;

describe("Phase 2 workflow config coverage", () => {
  it("keeps real estate on isolated workflow system", async () => {
    const { getIndustryConfig } = await vi.importActual<
      typeof import("@/lib/workflows/industry-configs")
    >("@/lib/workflows/industry-configs");

    expect(getIndustryConfig("REAL_ESTATE")).toBeNull();
  });

  it("provides explicit non-empty workflow config for each updated industry", async () => {
    const { getIndustryConfig } = await vi.importActual<
      typeof import("@/lib/workflows/industry-configs")
    >("@/lib/workflows/industry-configs");

    for (const industry of PHASE2_UPDATED_INDUSTRIES) {
      const config = getIndustryConfig(industry);
      expect(config).not.toBeNull();
      expect(config?.industry).toBe(industry);
      expect(config?.taskTypes.length).toBeGreaterThanOrEqual(2);
      expect(config?.aiAgents.length).toBeGreaterThanOrEqual(2);
      expect(config?.templates.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("ensures each updated industry has at least one custom task type beyond generic values", async () => {
    const { getIndustryConfig } = await vi.importActual<
      typeof import("@/lib/workflows/industry-configs")
    >("@/lib/workflows/industry-configs");

    const generic = new Set(["LEAD_RESEARCH", "CUSTOM"]);

    for (const industry of PHASE2_UPDATED_INDUSTRIES) {
      const config = getIndustryConfig(industry);
      const customTaskCount =
        config?.taskTypes.filter((task) => !generic.has(task.value)).length ??
        0;
      expect(customTaskCount).toBeGreaterThan(0);
    }
  });
});
