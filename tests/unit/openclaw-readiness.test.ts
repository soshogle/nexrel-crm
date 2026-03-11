import { describe, expect, it } from "vitest";
import {
  buildSalesReadiness,
  buildViralReadiness,
  buildWorkAiReadiness,
} from "@/lib/openclaw-readiness";
import {
  createSalesSquadState,
  upsertSalesSquadPhaseOutput,
} from "@/lib/sales-squad";
import {
  createViralLoopState,
  upsertViralLoopPhaseOutput,
} from "@/lib/viral-loop";
import {
  createWorkAiLaunchState,
  upsertWorkAiPhaseOutput,
} from "@/lib/work-ai-marketing";

describe("openclaw readiness helpers", () => {
  it("blocks viral next phase when trust stage is too low", () => {
    const state = createViralLoopState({
      projectId: "v-1",
      ownerUserId: "u-1",
      projectName: "Viral",
      niche: "Dental",
      conversionGoal: "leads",
    });
    const withPhase1 = upsertViralLoopPhaseOutput(state, {
      phaseId: 1,
      status: "completed",
      output: { done: true },
      currentPhase: 2,
    });
    const withPhase2 = upsertViralLoopPhaseOutput(withPhase1, {
      phaseId: 2,
      status: "completed",
      output: { done: true },
      currentPhase: 3,
    });
    const withPhase3 = upsertViralLoopPhaseOutput(withPhase2, {
      phaseId: 3,
      status: "completed",
      output: { done: true },
      currentPhase: 4,
    });

    const readiness = buildViralReadiness(withPhase3);
    expect(readiness?.runnable).toBe(false);
    expect(readiness?.requiredTrustStage).toBe("walk");
  });

  it("blocks sales next phase when trust stage is too low", () => {
    const state = createSalesSquadState({
      squadId: "s-1",
      ownerUserId: "u-1",
      squadName: "Sales",
      primaryGoal: "deals",
    });
    const withPhase1 = upsertSalesSquadPhaseOutput(state, {
      phaseId: 1,
      status: "completed",
      output: { done: true },
      currentPhase: 2,
    });
    const withPhase2 = upsertSalesSquadPhaseOutput(withPhase1, {
      phaseId: 2,
      status: "completed",
      output: { done: true },
      currentPhase: 3,
    });

    const readiness = buildSalesReadiness(withPhase2);
    expect(readiness?.runnable).toBe(false);
    expect(readiness?.requiredTrustStage).toBe("walk");
  });

  it("reports work ai next phase runnable", () => {
    const state = createWorkAiLaunchState({
      launchId: "w-1",
      ownerUserId: "u-1",
      offerName: "Offer",
      selectedNiche: "Dental",
    });
    const progressed = upsertWorkAiPhaseOutput(state, {
      phaseId: 1,
      status: "completed",
      output: { done: true },
      currentPhase: 2,
      selectedNiche: "Dental",
    });
    const readiness = buildWorkAiReadiness(progressed);
    expect(readiness?.runnable).toBe(true);
    expect(readiness?.nextPhase).toBe(2);
  });
});
