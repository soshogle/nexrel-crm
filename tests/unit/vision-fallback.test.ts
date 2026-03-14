import { describe, expect, it } from "vitest";
import { normalizeVisionFallbackRequest } from "@/lib/ai-employees/vision-fallback";

describe("normalizeVisionFallbackRequest", () => {
  it("normalizes click requests", () => {
    const parsed = normalizeVisionFallbackRequest({
      actionType: "click",
      x: 123.7,
      y: 44.1,
      targetHint: "save button",
      confidence: 0.92,
    });
    expect(parsed.actionType).toBe("click");
    expect(parsed.x).toBe(124);
    expect(parsed.y).toBe(44);
    expect(parsed.targetHint).toBe("save button");
    expect(parsed.confidence).toBe(0.92);
  });

  it("clamps confidence and defaults action", () => {
    const parsed = normalizeVisionFallbackRequest({
      actionType: "unknown",
      x: -10,
      y: "8",
      confidence: 7,
    });
    expect(parsed.actionType).toBe("click");
    expect(parsed.x).toBe(0);
    expect(parsed.y).toBe(8);
    expect(parsed.confidence).toBe(1);
  });
});
