import { describe, expect, it } from "vitest";
import { parseLiveRunPayload } from "@/lib/ai-employees/live-run-contract";

describe("parseLiveRunPayload", () => {
  it("applies safe defaults for minimal payload", () => {
    const parsed = parseLiveRunPayload({ goal: "Open calendar" });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    expect(parsed.payload.goal).toBe("Open calendar");
    expect(parsed.payload.trustMode).toBe("crawl");
    expect(parsed.payload.autonomyLevel).toBe("observe");
    expect(parsed.payload.executionRuntime).toBe("openclaw");
    expect(parsed.payload.executionTarget).toBe("cloud_browser");
  });

  it("accepts explicit runtime and trust settings", () => {
    const parsed = parseLiveRunPayload({
      goal: "Send recap email",
      trustMode: "run",
      autonomyLevel: "autonomous_full",
      executionRuntime: "legacy_worker",
      executionTarget: "owner_desktop",
      targetApps: ["Gmail"],
    });

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.payload.trustMode).toBe("run");
    expect(parsed.payload.autonomyLevel).toBe("autonomous_full");
    expect(parsed.payload.executionRuntime).toBe("legacy_worker");
    expect(parsed.payload.executionTarget).toBe("owner_desktop");
    expect(parsed.payload.targetApps).toEqual(["Gmail"]);
  });

  it("rejects invalid trust mode", () => {
    const parsed = parseLiveRunPayload({
      goal: "Run workflow",
      trustMode: "turbo",
    });
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.error).toMatch(/trustMode/);
  });

  it("rejects invalid runtime", () => {
    const parsed = parseLiveRunPayload({
      goal: "Run workflow",
      executionRuntime: "unknown-runtime",
    });
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.error).toMatch(/executionRuntime/);
  });
});
