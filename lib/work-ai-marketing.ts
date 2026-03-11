export type WorkAiPhaseDefinition = {
  id: number;
  key:
    | "truth_engine"
    | "pain_finder"
    | "solution_architect"
    | "icp_definer"
    | "competitor_analyst"
    | "gtm_playbook_generator"
    | "pricing_engine"
    | "offer_validator"
    | "master_offer_documenter"
    | "asset_factory"
    | "campaign_commander"
    | "content_publisher";
  name: string;
  dependsOn: number[];
};

export type WorkAiPhaseStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "blocked";

export type WorkAiLaunchState = {
  launchId: string;
  ownerUserId: string;
  offerName: string;
  selectedNiche: string | null;
  currentPhase: number;
  phaseStatus: Record<number, WorkAiPhaseStatus>;
  phaseOutputs: Record<number, any>;
  createdAt: string;
  updatedAt: string;
};

export const WORK_AI_PHASES: WorkAiPhaseDefinition[] = [
  { id: 1, key: "truth_engine", name: "Truth Engine", dependsOn: [] },
  { id: 2, key: "pain_finder", name: "Pain-Finder Agent", dependsOn: [1] },
  {
    id: 3,
    key: "solution_architect",
    name: "Solution Architect",
    dependsOn: [2],
  },
  { id: 4, key: "icp_definer", name: "ICP Definer", dependsOn: [3] },
  {
    id: 5,
    key: "competitor_analyst",
    name: "Competitor Analyst",
    dependsOn: [4],
  },
  {
    id: 6,
    key: "gtm_playbook_generator",
    name: "GTM Playbook Generator",
    dependsOn: [5],
  },
  { id: 7, key: "pricing_engine", name: "Pricing Engine", dependsOn: [6] },
  { id: 8, key: "offer_validator", name: "Offer Validator", dependsOn: [7] },
  {
    id: 9,
    key: "master_offer_documenter",
    name: "Master Offer Documenter",
    dependsOn: [8],
  },
  { id: 10, key: "asset_factory", name: "Asset Factory", dependsOn: [9] },
  {
    id: 11,
    key: "campaign_commander",
    name: "Campaign Commander",
    dependsOn: [10],
  },
  {
    id: 12,
    key: "content_publisher",
    name: "Content Publisher",
    dependsOn: [11],
  },
];

export function createWorkAiLaunchState(input: {
  launchId: string;
  ownerUserId: string;
  offerName: string;
  selectedNiche?: string | null;
}): WorkAiLaunchState {
  const now = new Date().toISOString();
  const phaseStatus = Object.fromEntries(
    WORK_AI_PHASES.map((phase) => [phase.id, "pending"]),
  ) as Record<number, WorkAiPhaseStatus>;
  return {
    launchId: input.launchId,
    ownerUserId: input.ownerUserId,
    offerName: input.offerName,
    selectedNiche: input.selectedNiche || null,
    currentPhase: 1,
    phaseStatus,
    phaseOutputs: {},
    createdAt: now,
    updatedAt: now,
  };
}

export function getWorkAiPhaseDefinition(phaseId: number) {
  return WORK_AI_PHASES.find((phase) => phase.id === phaseId) || null;
}

export function canRunWorkAiPhase(
  state: WorkAiLaunchState,
  phaseId: number,
): {
  ok: boolean;
  reason?: string;
} {
  const phase = getWorkAiPhaseDefinition(phaseId);
  if (!phase) {
    return { ok: false, reason: `Unknown phase ${phaseId}` };
  }
  for (const dependency of phase.dependsOn) {
    if (state.phaseStatus[dependency] !== "completed") {
      return {
        ok: false,
        reason: `Phase ${phaseId} depends on phase ${dependency} being completed`,
      };
    }
  }
  return { ok: true };
}

export function upsertWorkAiPhaseOutput(
  state: WorkAiLaunchState,
  input: {
    phaseId: number;
    status: WorkAiPhaseStatus;
    output: any;
    currentPhase?: number;
    selectedNiche?: string | null;
  },
): WorkAiLaunchState {
  return {
    ...state,
    selectedNiche:
      input.selectedNiche === undefined
        ? state.selectedNiche
        : input.selectedNiche,
    currentPhase: input.currentPhase || state.currentPhase,
    phaseStatus: {
      ...state.phaseStatus,
      [input.phaseId]: input.status,
    },
    phaseOutputs: {
      ...state.phaseOutputs,
      [input.phaseId]: input.output,
    },
    updatedAt: new Date().toISOString(),
  };
}

export function getNextPendingWorkAiPhase(
  state: WorkAiLaunchState,
): number | null {
  for (const phase of WORK_AI_PHASES) {
    if (state.phaseStatus[phase.id] !== "completed") {
      return phase.id;
    }
  }
  return null;
}

export function buildCompetitorDossiers(input: {
  niche: string;
  icpNames: string[];
  competitors?: Array<{
    name: string;
    funnel?: string;
    caseStudyResult?: string;
  }>;
}) {
  const source = input.competitors?.length
    ? input.competitors
    : [
        {
          name: `${input.niche} Growth Co`,
          funnel: "Ad -> Landing Page -> VSL -> Strategy Call",
          caseStudyResult: "Reduced cost per qualified lead by 28% in 60 days",
        },
        {
          name: `${input.niche} Pipeline Labs`,
          funnel: "Content -> Lead Magnet -> Email Nurture -> Demo",
          caseStudyResult: "Increased booking rate from 8% to 15%",
        },
        {
          name: `${input.niche} Revenue Systems`,
          funnel: "Retargeting -> Offer Page -> Calendly -> Close",
          caseStudyResult: "Lifted close rate by 21% on warm leads",
        },
      ];

  return source.slice(0, 5).map((c, index) => ({
    rank: index + 1,
    name: c.name,
    funnelMap: c.funnel || "Traffic -> Offer -> Qualification -> Close",
    caseStudyHighlights: [
      c.caseStudyResult || "Evidence indicates positive ROI in target segment",
      `Primary ICP alignment: ${input.icpNames[index % Math.max(1, input.icpNames.length)] || "General"}`,
    ],
  }));
}

export function buildGtmPlaybook(input: {
  niche: string;
  competitors: Array<{ name: string; funnelMap: string }>;
}) {
  return {
    channelStrategy: ["Meta Ads", "Instagram Organic", "Email Nurture"],
    adFrameworkMix: [
      { framework: "Guarantee", sharePct: 35 },
      { framework: "Pain-Agitation-Solution", sharePct: 30 },
      { framework: "Proof/Case-Study", sharePct: 20 },
      { framework: "Offer Stack", sharePct: 15 },
    ],
    testingPlan: [
      "Week 1: Test guarantee vs pain hook",
      "Week 2: Expand best hook into 3 creatives",
      "Week 3: Retarget engaged visitors with case-study proof",
    ],
    topOrganicThemes: [
      `${input.niche}: before/after transformations`,
      `${input.niche}: common conversion leaks and fixes`,
      `${input.niche}: behind-the-scenes process proof`,
    ],
    competitorSignals: input.competitors.map((c) => ({
      competitor: c.name,
      funnel: c.funnelMap,
    })),
  };
}

export function computePricingRecommendation(input: {
  expectedClientValue?: number;
  competitorPriceMedian?: number;
  estimatedCac?: number;
  fulfillmentCost?: number;
  targetMarginPct?: number;
}) {
  const expectedClientValue = Math.max(
    1000,
    Number(input.expectedClientValue || 12000),
  );
  const competitorPriceMedian = Math.max(
    1000,
    Number(input.competitorPriceMedian || 7500),
  );
  const estimatedCac = Math.max(100, Number(input.estimatedCac || 1200));
  const fulfillmentCost = Math.max(100, Number(input.fulfillmentCost || 1500));
  const targetMarginPct = Math.min(
    90,
    Math.max(20, Number(input.targetMarginPct || 55)),
  );

  const floorPrice = estimatedCac * 3 + fulfillmentCost;
  const valueAnchoredPrice = expectedClientValue * 0.35;
  const marketBlend = (competitorPriceMedian + valueAnchoredPrice) / 2;
  const recommended = Math.round(Math.max(floorPrice, marketBlend) / 100) * 100;
  const marginEstimatePct = Math.round(
    ((recommended - estimatedCac - fulfillmentCost) / recommended) * 100,
  );

  return {
    recommendedPrice: recommended,
    floorPrice,
    valueAnchoredPrice: Math.round(valueAnchoredPrice),
    competitorPriceMedian,
    estimatedCac,
    fulfillmentCost,
    targetMarginPct,
    marginEstimatePct,
    rationale:
      "Price is set from CAC, fulfillment costs, market benchmarks, and value capture band; not personal preference.",
  };
}

export function scoreOfferValidation(input: {
  demandStrength?: number;
  painClarity?: number;
  mechanismUniqueness?: number;
  competitorPressure?: number;
  profitabilityStrength?: number;
}) {
  const demandStrength = Math.min(
    100,
    Math.max(0, Number(input.demandStrength || 78)),
  );
  const painClarity = Math.min(
    100,
    Math.max(0, Number(input.painClarity || 82)),
  );
  const mechanismUniqueness = Math.min(
    100,
    Math.max(0, Number(input.mechanismUniqueness || 74)),
  );
  const competitorPressure = Math.min(
    100,
    Math.max(0, Number(input.competitorPressure || 58)),
  );
  const profitabilityStrength = Math.min(
    100,
    Math.max(0, Number(input.profitabilityStrength || 80)),
  );

  const score = Math.round(
    demandStrength * 0.25 +
      painClarity * 0.2 +
      mechanismUniqueness * 0.2 +
      (100 - competitorPressure) * 0.1 +
      profitabilityStrength * 0.25,
  );

  const risks: string[] = [];
  if (mechanismUniqueness < 70)
    risks.push("Mechanism uniqueness needs stronger positioning");
  if (competitorPressure > 70)
    risks.push("Competitor density is high in current niche");
  if (profitabilityStrength < 70)
    risks.push("Profitability margin may be thin without upsell layer");

  const improvements: string[] = [];
  if (mechanismUniqueness < 80)
    improvements.push(
      "Refine mechanism naming and add proof-backed differentiators",
    );
  if (painClarity < 80)
    improvements.push(
      "Collect 20 more voice-of-customer quotes for tighter messaging",
    );
  if (competitorPressure > 60)
    improvements.push("Narrow ICP target and strengthen guarantee framing");
  if (improvements.length === 0)
    improvements.push("Proceed to Master Offer Document with current strategy");

  return {
    score,
    dimensions: {
      demandStrength,
      painClarity,
      mechanismUniqueness,
      competitorPressure,
      profitabilityStrength,
    },
    risks,
    improvements,
  };
}

export function buildMasterOfferDocument(input: {
  offerName: string;
  selectedNiche: string | null;
  phaseOutputs: Record<number, any>;
}) {
  const niche = input.selectedNiche || "Unspecified Niche";
  const pains = input.phaseOutputs?.[2]?.synthesizedPains || [];
  const mechanisms = input.phaseOutputs?.[3]?.mechanisms || [];
  const icps = input.phaseOutputs?.[4]?.icps || [];
  const competitors = input.phaseOutputs?.[5]?.dossiers || [];
  const playbook = input.phaseOutputs?.[6]?.playbook || {};
  const pricing = input.phaseOutputs?.[7] || {};
  const validation = input.phaseOutputs?.[8] || {};

  const markdown = [
    `# Master Offer Document: ${input.offerName}`,
    "",
    `## Niche`,
    `- ${niche}`,
    "",
    "## Market Pains",
    ...(pains.length > 0
      ? pains.map((p: any) => `- (${p.rank}) ${p.pain}`)
      : ["- No pains captured yet"]),
    "",
    "## Unique Mechanisms",
    ...(mechanisms.length > 0
      ? mechanisms.map(
          (m: any) =>
            `- **${m.name}**: ${(m.pillars || []).join(", ") || "No pillars yet"}`,
        )
      : ["- No mechanisms captured yet"]),
    "",
    "## ICP Profiles",
    ...(icps.length > 0
      ? icps.map(
          (icp: any) =>
            `- **${icp.name}**: ${icp.demographics}; ${icp.psychographics}; ${icp.behaviors}`,
        )
      : ["- No ICPs captured yet"]),
    "",
    "## Competitor Intelligence",
    ...(competitors.length > 0
      ? competitors.map(
          (c: any) =>
            `- **${c.name}** | Funnel: ${c.funnelMap} | Proof: ${(c.caseStudyHighlights || []).join("; ")}`,
        )
      : ["- No competitor dossiers captured yet"]),
    "",
    "## GTM Playbook",
    `- Channels: ${(playbook.channelStrategy || []).join(", ") || "Not set"}`,
    `- Testing Plan: ${(playbook.testingPlan || []).join(" | ") || "Not set"}`,
    `- Top Organic Themes: ${(playbook.topOrganicThemes || []).join(" | ") || "Not set"}`,
    "",
    "## Pricing",
    `- Recommended Price: ${pricing.recommendedPrice ? `$${pricing.recommendedPrice}` : "Not set"}`,
    `- CAC Estimate: ${pricing.estimatedCac ? `$${pricing.estimatedCac}` : "Not set"}`,
    `- Fulfillment Cost: ${pricing.fulfillmentCost ? `$${pricing.fulfillmentCost}` : "Not set"}`,
    `- Margin Estimate: ${pricing.marginEstimatePct != null ? `${pricing.marginEstimatePct}%` : "Not set"}`,
    "",
    "## Validation",
    `- Score: ${validation.score != null ? `${validation.score}/100` : "Not set"}`,
    `- Risks: ${(validation.risks || []).join(" | ") || "None captured"}`,
    `- Improvements: ${(validation.improvements || []).join(" | ") || "None captured"}`,
    "",
    `Generated at: ${new Date().toISOString()}`,
  ].join("\n");

  return {
    title: `Master Offer Document: ${input.offerName}`,
    markdown,
  };
}

export function buildAssetFactoryManifest(input: {
  offerName: string;
  selectedNiche: string | null;
  masterOfferDoc: { title: string; markdown: string };
}) {
  const niche = input.selectedNiche || "your niche";
  const landingPageName = `${input.offerName} Landing Page`;
  const vslTitle = `${input.offerName} VSL Script`;
  const deckTitle = `${input.offerName} Sales Deck`;

  return {
    website: {
      name: landingPageName,
      templateType: "SERVICE",
      businessDescription: `${input.offerName} for ${niche}. Built from validated pains, ICP, and GTM strategy.`,
    },
    documents: {
      vslTitle,
      vslBody: `VSL Outline for ${input.offerName}:\n1) Hook with core pain\n2) Why current approach fails\n3) Introduce mechanism\n4) Proof and outcomes\n5) Offer and CTA`,
      deckTitle,
      deckBody: `Sales Deck for ${input.offerName}:\n- Market truth\n- ICP snapshot\n- Problem landscape\n- Mechanism and pillars\n- Proof\n- Offer and pricing\n- Implementation path\n- CTA`,
    },
  };
}

export function buildCampaignCommanderPlan(input: {
  offerName: string;
  selectedNiche: string | null;
  gtmPlaybook?: any;
  icps?: any[];
  defaultDailyBudget?: number;
}) {
  const objective = "Lead Generation";
  const audience =
    input.icps && input.icps.length > 0
      ? input.icps
          .slice(0, 2)
          .map((icp) => String(icp.name || "ICP"))
          .join(" + ")
      : "Primary target ICP";
  const channels = input.gtmPlaybook?.channelStrategy || ["Meta Ads", "Email"];
  const budgetDaily = Math.max(10, Number(input.defaultDailyBudget || 30));

  return {
    objective,
    audience,
    channels,
    budgetDaily,
    campaignName: `${input.offerName} - Acquisition Engine`,
    launchChecklist: [
      "Creative approved",
      "Tracking events verified",
      "Landing page live",
      "Budget guardrails confirmed",
    ],
    riskSummary: `This launch will spend approximately $${budgetDaily}/day across ${channels.join(", ")}.`,
    niche: input.selectedNiche || "General",
  };
}

export function buildContentPublisherPlan(input: {
  offerName: string;
  selectedNiche: string | null;
}) {
  const niche = input.selectedNiche || "your market";
  return {
    contentCalendar: [
      {
        day: "Monday",
        channel: "LinkedIn",
        format: "Thought leadership post",
        hook: `The hidden conversion leak in ${niche} most teams ignore`,
      },
      {
        day: "Wednesday",
        channel: "Instagram",
        format: "Carousel",
        hook: `${input.offerName}: 3-step transformation framework`,
      },
      {
        day: "Friday",
        channel: "Email",
        format: "Case study",
        hook: `How we improved lead quality and close rate in ${niche}`,
      },
    ],
    primaryCta: "Book a strategy call",
    campaignName: `${input.offerName} - Organic Publisher`,
  };
}
