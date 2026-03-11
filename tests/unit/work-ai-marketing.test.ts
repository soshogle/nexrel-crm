import { describe, expect, it } from "vitest";
import {
  buildAssetFactoryManifest,
  buildCampaignCommanderPlan,
  buildContentPublisherPlan,
  buildCompetitorDossiers,
  buildGtmPlaybook,
  buildMasterOfferDocument,
  canRunWorkAiPhase,
  computePricingRecommendation,
  createWorkAiLaunchState,
  getNextPendingWorkAiPhase,
  scoreOfferValidation,
  upsertWorkAiPhaseOutput,
} from "@/lib/work-ai-marketing";

describe("work ai marketing phase orchestration", () => {
  it("enforces dependencies between phases", () => {
    const state = createWorkAiLaunchState({
      launchId: "launch-1",
      ownerUserId: "owner-1",
      offerName: "Dental Growth Offer",
    });

    const phase2 = canRunWorkAiPhase(state, 2);
    expect(phase2.ok).toBe(false);
    expect(phase2.reason).toContain("depends on phase 1");

    const updated = upsertWorkAiPhaseOutput(state, {
      phaseId: 1,
      status: "completed",
      output: { niche: "Dental Automation" },
      currentPhase: 2,
      selectedNiche: "Dental Automation",
    });

    const phase2After = canRunWorkAiPhase(updated, 2);
    expect(phase2After.ok).toBe(true);
  });

  it("returns next pending phase", () => {
    let state = createWorkAiLaunchState({
      launchId: "launch-2",
      ownerUserId: "owner-2",
      offerName: "RE Offer",
    });
    expect(getNextPendingWorkAiPhase(state)).toBe(1);

    state = upsertWorkAiPhaseOutput(state, {
      phaseId: 1,
      status: "completed",
      output: { done: true },
      currentPhase: 2,
    });
    expect(getNextPendingWorkAiPhase(state)).toBe(2);
  });

  it("builds strategic artifacts for phases 5-8", () => {
    const dossiers = buildCompetitorDossiers({
      niche: "Dental Automation",
      icpNames: ["ICP A", "ICP B"],
    });
    expect(dossiers.length).toBeGreaterThan(0);

    const playbook = buildGtmPlaybook({
      niche: "Dental Automation",
      competitors: dossiers.map((d) => ({
        name: d.name,
        funnelMap: d.funnelMap,
      })),
    });
    expect(playbook.channelStrategy.length).toBeGreaterThan(0);

    const pricing = computePricingRecommendation({
      estimatedCac: 1000,
      fulfillmentCost: 1200,
      competitorPriceMedian: 7000,
      expectedClientValue: 15000,
    });
    expect(pricing.recommendedPrice).toBeGreaterThan(0);

    const validation = scoreOfferValidation({
      demandStrength: 80,
      painClarity: 85,
      mechanismUniqueness: 70,
      competitorPressure: 60,
      profitabilityStrength: 78,
    });
    expect(validation.score).toBeGreaterThan(0);
    expect(Array.isArray(validation.improvements)).toBe(true);
  });

  it("builds phase 9 and 10 documents/manifests", () => {
    const master = buildMasterOfferDocument({
      offerName: "Dental Growth Offer",
      selectedNiche: "Dental Automation",
      phaseOutputs: {
        2: { synthesizedPains: [{ rank: 1, pain: "Leads go cold" }] },
        3: {
          mechanisms: [{ name: "Predictable Pipeline", pillars: ["Speed"] }],
        },
        4: {
          icps: [
            {
              name: "ICP One",
              demographics: "Owner",
              psychographics: "Growth-focused",
              behaviors: "Data-driven",
            },
          ],
        },
        5: {
          dossiers: [
            {
              name: "Competitor A",
              funnelMap: "Ad -> LP",
              caseStudyHighlights: ["Result"],
            },
          ],
        },
        6: {
          playbook: {
            channelStrategy: ["Meta Ads"],
            testingPlan: ["Test hooks"],
            topOrganicThemes: ["Theme 1"],
          },
        },
        7: {
          recommendedPrice: 7900,
          estimatedCac: 1200,
          fulfillmentCost: 1500,
          marginEstimatePct: 66,
        },
        8: {
          score: 82,
          risks: ["Risk A"],
          improvements: ["Improve A"],
        },
      },
    });

    expect(master.title).toContain("Master Offer Document");
    expect(master.markdown).toContain("Dental Growth Offer");

    const manifest = buildAssetFactoryManifest({
      offerName: "Dental Growth Offer",
      selectedNiche: "Dental Automation",
      masterOfferDoc: master,
    });
    expect(manifest.website.name).toContain("Landing Page");
    expect(manifest.documents.vslTitle).toContain("VSL");
  });

  it("builds phase 11 and 12 execution plans", () => {
    const campaignPlan = buildCampaignCommanderPlan({
      offerName: "Dental Growth Offer",
      selectedNiche: "Dental Automation",
      gtmPlaybook: { channelStrategy: ["Meta Ads", "Email"] },
      icps: [{ name: "ICP One" }, { name: "ICP Two" }],
      defaultDailyBudget: 45,
    });

    expect(campaignPlan.objective).toBe("Lead Generation");
    expect(campaignPlan.budgetDaily).toBe(45);

    const contentPlan = buildContentPublisherPlan({
      offerName: "Dental Growth Offer",
      selectedNiche: "Dental Automation",
    });

    expect(contentPlan.contentCalendar.length).toBe(3);
    expect(contentPlan.primaryCta).toContain("Book");
  });
});
