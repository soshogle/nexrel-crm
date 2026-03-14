import { afterEach, describe, expect, it } from "vitest";
import {
  assertAgentRunAllowed,
  getAgentContractVersion,
  getAgentFeatureFlags,
  getAgentRolloutSnapshot,
  isAgentSystemWriteEnabled,
} from "@/lib/ai-employees/feature-flags";

const envBackup = { ...process.env };

afterEach(() => {
  process.env = { ...envBackup };
});

describe("ai-employees feature flags", () => {
  it("defaults to fully safe off mode", () => {
    delete process.env.NEXREL_AGENT_ROLLOUT_MODE;
    delete process.env.NEXREL_AGENT_KILL_SWITCH;
    delete process.env.NEXREL_AGENT_WIDGET_ENABLED;
    delete process.env.NEXREL_AGENT_COMMAND_BUS_ENABLED;
    delete process.env.NEXREL_AGENT_VISION_FALLBACK_ENABLED;
    delete process.env.NEXREL_AGENT_VOICE_DUPLEX_ENABLED;

    const flags = getAgentFeatureFlags();
    expect(flags.rolloutMode).toBe("off");
    expect(flags.globalKillSwitch).toBe(false);
    expect(flags.tenantAllowlist.size).toBe(0);
    expect(flags.tenantCanaryList.size).toBe(0);
    expect(flags.tenantKillSwitchList.size).toBe(0);
    expect(flags.agentWidget).toBe(false);
    expect(flags.commandBus).toBe(false);
    expect(flags.visionFallback).toBe(false);
    expect(flags.voiceDuplex).toBe(false);
    expect(isAgentSystemWriteEnabled()).toBe(false);
  });

  it("enables write mode only in enforce mode without kill switch", () => {
    process.env.NEXREL_AGENT_ROLLOUT_MODE = "enforce";
    process.env.NEXREL_AGENT_KILL_SWITCH = "false";
    expect(isAgentSystemWriteEnabled()).toBe(true);

    process.env.NEXREL_AGENT_KILL_SWITCH = "true";
    expect(isAgentSystemWriteEnabled()).toBe(false);
  });

  it("blocks runs when global kill switch is on", () => {
    process.env.NEXREL_AGENT_KILL_SWITCH = "true";
    expect(() => assertAgentRunAllowed()).toThrow(/kill switch/i);
  });

  it("enforces tenant allowlist and tenant kill switch", () => {
    process.env.NEXREL_AGENT_ROLLOUT_MODE = "shadow";
    process.env.NEXREL_AGENT_TENANT_ALLOWLIST = "tenant-a,tenant-b";
    process.env.NEXREL_AGENT_TENANT_KILL_SWITCH = "tenant-b";

    expect(() => assertAgentRunAllowed("tenant-a")).not.toThrow();
    expect(() => assertAgentRunAllowed("tenant-b")).toThrow(/disabled/i);
    expect(() => assertAgentRunAllowed("tenant-c")).toThrow(/allowlist/i);
  });

  it("reports canary rollout in snapshot", () => {
    process.env.NEXREL_AGENT_ROLLOUT_MODE = "enforce";
    process.env.NEXREL_AGENT_TENANT_CANARY_LIST = "tenant-canary";

    const canary = getAgentRolloutSnapshot("tenant-canary");
    expect(canary.allowed).toBe(true);
    expect(canary.canary).toBe(true);
    expect(canary.mode).toBe("enforce");
  });

  it("exposes a fixed contract version string", () => {
    expect(getAgentContractVersion()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
