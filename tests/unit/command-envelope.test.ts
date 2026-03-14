import { afterEach, describe, expect, it } from "vitest";
import {
  buildCommandEnvelope,
  verifyCommandEnvelope,
} from "@/lib/ai-employees/command-envelope";

const envBackup = { ...process.env };

afterEach(() => {
  process.env = { ...envBackup };
});

describe("command envelope", () => {
  it("builds signed envelope when secret is present", () => {
    process.env.NEXREL_AGENT_COMMAND_BUS_SECRET = "test-secret";
    const input = {
      sessionId: "session-1",
      userId: "user-1",
      actionType: "click",
      target: "#save",
      value: "",
      riskTier: "MEDIUM" as const,
      requiresApproval: false,
      correlationId: "corr-1",
      idempotencyKey: "idem-1",
      issuedAt: "2026-03-14T00:00:00.000Z",
    };

    const envelope = buildCommandEnvelope(input);
    expect(envelope.version).toBe("v1");
    expect(envelope.keyId).toBe("command_bus_primary");
    expect(envelope.signature).not.toBe("unsigned");
    expect(verifyCommandEnvelope(input, envelope)).toBe(true);
  });

  it("builds unsigned envelope without secret", () => {
    delete process.env.NEXREL_AGENT_COMMAND_BUS_SECRET;
    delete process.env.NEXREL_AI_LIVE_RUN_WORKER_SECRET;
    const input = {
      sessionId: "session-1",
      userId: "user-1",
      actionType: "navigate",
      target: "https://example.com",
      riskTier: "LOW" as const,
      requiresApproval: false,
      correlationId: "corr-2",
      issuedAt: "2026-03-14T00:00:00.000Z",
    };

    const envelope = buildCommandEnvelope(input);
    expect(envelope.keyId).toBe("unsigned");
    expect(envelope.signature).toBe("unsigned");
    expect(verifyCommandEnvelope(input, envelope)).toBe(true);
  });
});
