import { describe, expect, it } from "vitest";
import { scoreOutcome } from "@/lib/nexrel-ai-brain/memory";

describe("nexrel ai memory scoring", () => {
  it("scores positive outcomes higher", () => {
    const positive = scoreOutcome({
      processed: 10,
      sent: 8,
      failed: 0,
      blocked: 0,
    });
    const negative = scoreOutcome({
      processed: 10,
      sent: 0,
      failed: 5,
      blocked: 3,
    });
    expect(positive).toBeGreaterThan(negative);
  });

  it("penalizes blocked and failed outcomes", () => {
    const baseline = scoreOutcome({
      processed: 12,
      sent: 6,
      failed: 0,
      blocked: 0,
    });
    const penalized = scoreOutcome({
      processed: 12,
      sent: 6,
      failed: 2,
      blocked: 2,
    });
    expect(penalized).toBeLessThan(baseline);
  });
});
