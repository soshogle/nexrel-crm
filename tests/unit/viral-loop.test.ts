import { describe, expect, it } from "vitest";
import {
  buildCrossPlatformDrafts,
  buildGoalCorrelation,
  buildHookRotationPlan,
  buildViralContentPackage,
  buildViralMemorySnapshot,
  buildViralResearchOutput,
  canPromoteViralTrustStage,
  canRunViralLoopPhaseForTrustStage,
  canRunViralLoopPhase,
  createViralLoopState,
  diagnoseViralPerformance,
  upsertViralLoopPhaseOutput,
} from "@/lib/viral-loop";

describe("viral loop orchestration", () => {
  it("enforces phase dependencies", () => {
    const state = createViralLoopState({
      projectId: "viral-1",
      ownerUserId: "owner-1",
      projectName: "Viral Test",
      niche: "Dental",
      conversionGoal: "leads",
    });

    const phase2Blocked = canRunViralLoopPhase(state, 2);
    expect(phase2Blocked.ok).toBe(false);

    const phase1Done = upsertViralLoopPhaseOutput(state, {
      phaseId: 1,
      status: "completed",
      output: { done: true },
      currentPhase: 2,
    });

    const phase2Allowed = canRunViralLoopPhase(phase1Done, 2);
    expect(phase2Allowed.ok).toBe(true);
  });

  it("builds and diagnoses viral assets", () => {
    const research = buildViralResearchOutput({
      niche: "Dental",
      conversionGoal: "downloads",
    });
    const content = buildViralContentPackage({
      projectName: "Project",
      niche: "Dental",
      hooks: research.hooks,
      ctas: research.ctas,
    });
    expect(content.slides.length).toBeGreaterThan(0);

    const diagnosis = diagnoseViralPerformance({
      posts: [
        { id: "p1", hook: "h1", cta: "c1", views: 12000, conversions: 20 },
        { id: "p2", hook: "h2", cta: "c2", views: 2000, conversions: 30 },
      ],
    });
    expect(diagnosis.diagnostics.length).toBe(2);
  });

  it("builds rotation, attribution, cross-platform drafts, and memory", () => {
    const rotation = buildHookRotationPlan({
      activeWinners: ["A", "B"],
      provenHooks: ["C", "D", "E"],
      testingHooks: ["T"],
    });
    expect(rotation.distribution.winnerShare).toBe(60);

    const attribution = buildGoalCorrelation({
      conversionGoal: "leads",
      posts: [
        { id: "1", hook: "h", cta: "c", conversions: 12 },
        { id: "2", hook: "h", cta: "c", conversions: 5 },
      ],
    });
    expect(attribution.topContributors[0].id).toBe("1");

    const drafts = buildCrossPlatformDrafts({
      contentPackage: {
        hook: "Hook",
        caption: "Caption",
        slides: [{ index: 1, overlay: "Text" }],
      },
    });
    expect(drafts.instagram.format).toBe("reel_slideshow");

    const base = createViralLoopState({
      projectId: "viral-2",
      ownerUserId: "owner-2",
      projectName: "Project",
      niche: "Dental",
      conversionGoal: "leads",
    });
    const withDiag = upsertViralLoopPhaseOutput(base, {
      phaseId: 4,
      status: "completed",
      output: {
        diagnostics: [{ diagnosis: "winner", postId: "p1" }],
      },
    });
    const snapshot = buildViralMemorySnapshot({ state: withDiag });
    expect(snapshot.projectId).toBe("viral-2");
    expect(snapshot.knownWinners.length).toBe(1);
  });

  it("enforces trust stage progression", () => {
    const base = createViralLoopState({
      projectId: "viral-3",
      ownerUserId: "owner-3",
      projectName: "Project",
      niche: "Dental",
      conversionGoal: "leads",
    });

    const phase4AtCrawl = canRunViralLoopPhaseForTrustStage("crawl", 4);
    expect(phase4AtCrawl.ok).toBe(false);

    let progressed = upsertViralLoopPhaseOutput(base, {
      phaseId: 1,
      status: "completed",
      output: { done: true },
      currentPhase: 2,
    });
    progressed = upsertViralLoopPhaseOutput(progressed, {
      phaseId: 2,
      status: "completed",
      output: { done: true },
      currentPhase: 3,
    });
    progressed = upsertViralLoopPhaseOutput(progressed, {
      phaseId: 3,
      status: "completed",
      output: { done: true },
      currentPhase: 4,
    });

    const canPromoteToWalk = canPromoteViralTrustStage(progressed, "walk");
    expect(canPromoteToWalk.ok).toBe(true);

    const cannotJumpToRun = canPromoteViralTrustStage(base, "run");
    expect(cannotJumpToRun.ok).toBe(false);
  });
});
