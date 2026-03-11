import { describe, expect, it } from "vitest";
import {
  canPromoteSalesTrustStage,
  canRunSalesSquadPhaseForTrustStage,
  canRunSalesSquadPhase,
  createSalesSquadState,
  getNextPendingSalesSquadPhase,
  upsertSalesSquadPhaseOutput,
} from "@/lib/sales-squad";

describe("sales squad orchestration", () => {
  it("enforces phase dependency from phase 1", () => {
    const state = createSalesSquadState({
      squadId: "s-1",
      ownerUserId: "u-1",
      squadName: "Sales Squad",
      primaryGoal: "book meetings",
    });

    const blocked = canRunSalesSquadPhase(state, 2);
    expect(blocked.ok).toBe(false);

    const progressed = upsertSalesSquadPhaseOutput(state, {
      phaseId: 1,
      status: "completed",
      output: { done: true },
      currentPhase: 2,
    });

    const allowed = canRunSalesSquadPhase(progressed, 2);
    expect(allowed.ok).toBe(true);
  });

  it("returns next pending phase correctly", () => {
    let state = createSalesSquadState({
      squadId: "s-2",
      ownerUserId: "u-2",
      squadName: "Sales Squad",
      primaryGoal: "close deals",
    });
    expect(getNextPendingSalesSquadPhase(state)).toBe(1);

    state = upsertSalesSquadPhaseOutput(state, {
      phaseId: 1,
      status: "completed",
      output: { done: true },
      currentPhase: 2,
    });
    expect(getNextPendingSalesSquadPhase(state)).toBe(2);
  });

  it("enforces crawl/walk/run trust gates", () => {
    const base = createSalesSquadState({
      squadId: "s-3",
      ownerUserId: "u-3",
      squadName: "Sales Squad",
      primaryGoal: "close deals",
    });

    const phase3AtCrawl = canRunSalesSquadPhaseForTrustStage("crawl", 3);
    expect(phase3AtCrawl.ok).toBe(false);

    let progressed = upsertSalesSquadPhaseOutput(base, {
      phaseId: 1,
      status: "completed",
      output: { done: true },
      currentPhase: 2,
    });
    progressed = upsertSalesSquadPhaseOutput(progressed, {
      phaseId: 2,
      status: "completed",
      output: { done: true },
      currentPhase: 3,
    });

    const canPromoteToWalk = canPromoteSalesTrustStage(progressed, "walk");
    expect(canPromoteToWalk.ok).toBe(true);

    const cannotJumpToRun = canPromoteSalesTrustStage(base, "run");
    expect(cannotJumpToRun.ok).toBe(false);
  });
});
