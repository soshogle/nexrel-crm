type CopilotInput = {
  treatmentType?: string | null;
  wearSchedule?: number | null;
  averageWearHours?: number | null;
  elasticsAdherence?: number | null;
  qualityScore?: number | null;
  captureViewsCount: number;
  daysSinceLastCheckIn?: number | null;
  previousAssessment?: {
    overallRiskScore?: number | null;
    driftScore?: number | null;
    predictedDelayDays?: number | null;
  } | null;
};

type CopilotRecommendation = {
  actionType:
    | "REINFORCE_WEAR"
    | "RECAPTURE"
    | "EARLY_VISIT"
    | "ELASTIC_PROTOCOL_REVIEW"
    | "REFINEMENT_REVIEW";
  title: string;
  rationale: string;
  expectedImpact?: string;
};

export type CopilotAssessmentResult = {
  modelVersion: string;
  overallRiskScore: number;
  driftScore: number;
  complianceScore: number;
  confidenceScore: number;
  urgency: "ROUTINE" | "SOON" | "URGENT";
  predictedDelayDays: number;
  driverTags: string[];
  findings: Record<string, unknown>;
  recommendedActions: CopilotRecommendation[];
};

export type CopilotSimulationResult = {
  baselineRisk: number;
  baselineDelayDays: number;
  projectedRisk: number;
  projectedDelayDays: number;
  projectedConfidence: number;
  deltaRisk: number;
  deltaDelayDays: number;
  interventions: string[];
};

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

function classifyTrend(delta: number): "IMPROVING" | "STABLE" | "WORSENING" {
  if (delta <= -0.04) return "IMPROVING";
  if (delta >= 0.04) return "WORSENING";
  return "STABLE";
}

export function simulateInterventions(
  base: {
    overallRiskScore: number;
    confidenceScore: number;
    predictedDelayDays: number;
  },
  interventions: string[],
): CopilotSimulationResult {
  const normalized = Array.from(
    new Set(interventions.map((i) => String(i).toUpperCase())),
  );

  let riskMultiplier = 1;
  let delayMultiplier = 1;
  let confidenceGain = 0;

  if (normalized.includes("REINFORCE_WEAR")) {
    riskMultiplier *= 0.8;
    delayMultiplier *= 0.82;
  }
  if (normalized.includes("EARLY_VISIT")) {
    riskMultiplier *= 0.78;
    delayMultiplier *= 0.72;
  }
  if (normalized.includes("ELASTIC_PROTOCOL_REVIEW")) {
    riskMultiplier *= 0.86;
    delayMultiplier *= 0.88;
  }
  if (normalized.includes("RECAPTURE")) {
    riskMultiplier *= 0.96;
    delayMultiplier *= 0.96;
    confidenceGain += 0.12;
  }
  if (normalized.includes("REFINEMENT_REVIEW")) {
    riskMultiplier *= 0.84;
    delayMultiplier *= 0.8;
  }

  const projectedRisk = clamp(base.overallRiskScore * riskMultiplier);
  const projectedDelayDays = Math.max(
    0,
    Math.round(base.predictedDelayDays * delayMultiplier),
  );
  const projectedConfidence = clamp(base.confidenceScore + confidenceGain);

  return {
    baselineRisk: base.overallRiskScore,
    baselineDelayDays: base.predictedDelayDays,
    projectedRisk,
    projectedDelayDays,
    projectedConfidence,
    deltaRisk: projectedRisk - base.overallRiskScore,
    deltaDelayDays: projectedDelayDays - base.predictedDelayDays,
    interventions: normalized,
  };
}

export function buildOrthoCopilotAssessment(
  input: CopilotInput,
): CopilotAssessmentResult {
  const expectedWear = Math.max(12, input.wearSchedule ?? 22);
  const avgWear = input.averageWearHours ?? expectedWear;
  const wearGap = clamp((expectedWear - avgWear) / expectedWear);

  const elastics = input.elasticsAdherence ?? 0.75;
  const elasticsGap = clamp(1 - elastics);

  const quality = clamp((input.qualityScore ?? 60) / 100);
  const viewsCompleteness = clamp(input.captureViewsCount / 5);

  const recencyPenalty = clamp(((input.daysSinceLastCheckIn ?? 14) - 10) / 25);
  const treatmentWeight =
    String(input.treatmentType || "").toUpperCase() === "ALIGNER" ? 1 : 0.85;

  const complianceScore = clamp(1 - wearGap * 0.7 - elasticsGap * 0.3);
  const driftScore = clamp(
    (wearGap * 0.45 +
      elasticsGap * 0.25 +
      recencyPenalty * 0.2 +
      (1 - quality) * 0.1) *
      treatmentWeight,
  );
  const confidenceScore = clamp(
    quality * 0.6 + viewsCompleteness * 0.25 + (1 - recencyPenalty) * 0.15,
  );
  const overallRiskScore = clamp(
    driftScore * 0.65 + (1 - complianceScore) * 0.35,
  );

  const previousRisk = Number(
    input.previousAssessment?.overallRiskScore ?? overallRiskScore,
  );
  const previousDrift = Number(
    input.previousAssessment?.driftScore ?? driftScore,
  );
  const riskDelta = Number((overallRiskScore - previousRisk).toFixed(3));
  const driftDelta = Number((driftScore - previousDrift).toFixed(3));
  const trend = classifyTrend(riskDelta);

  const urgency: "ROUTINE" | "SOON" | "URGENT" =
    overallRiskScore >= 0.72
      ? "URGENT"
      : overallRiskScore >= 0.46
        ? "SOON"
        : "ROUTINE";

  const predictedDelayDays = Math.round(overallRiskScore * 35);

  const driverTags: string[] = [];
  if (wearGap >= 0.18) driverTags.push("LOW_WEAR_TIME");
  if (elasticsGap >= 0.22) driverTags.push("ELASTICS_NONCOMPLIANCE");
  if (quality < 0.6 || viewsCompleteness < 0.8)
    driverTags.push("LOW_CAPTURE_QUALITY");
  if (recencyPenalty > 0.3) driverTags.push("CHECKIN_GAP");
  if (driverTags.length === 0) driverTags.push("STABLE_TREND");

  const recommendedActions: CopilotRecommendation[] = [];

  if (quality < 0.65 || viewsCompleteness < 0.8) {
    recommendedActions.push({
      actionType: "RECAPTURE",
      title: "Request a new guided capture",
      rationale:
        "Current images are insufficient for confident progression analysis.",
      expectedImpact: "Improves confidence and reduces false drift alerts.",
    });
  }

  if (wearGap >= 0.12) {
    recommendedActions.push({
      actionType: "REINFORCE_WEAR",
      title: "Reinforce aligner wear compliance",
      rationale: `Average wear (${avgWear.toFixed(1)}h) is below target (${expectedWear}h).`,
      expectedImpact: "Can reduce projected treatment delay by 20-35%.",
    });
  }

  if (elasticsGap >= 0.2) {
    recommendedActions.push({
      actionType: "ELASTIC_PROTOCOL_REVIEW",
      title: "Review elastic protocol adherence",
      rationale: "Elastic compliance trend is below expected threshold.",
      expectedImpact: "May prevent asymmetric correction drift.",
    });
  }

  if (urgency !== "ROUTINE") {
    recommendedActions.push({
      actionType: "EARLY_VISIT",
      title: "Bring patient in earlier",
      rationale:
        "Risk profile suggests meaningful drift before the next scheduled follow-up.",
      expectedImpact: `Potentially recover ${Math.max(7, predictedDelayDays)} days of delay risk.`,
    });
  }

  if (overallRiskScore >= 0.65) {
    recommendedActions.push({
      actionType: "REFINEMENT_REVIEW",
      title: "Evaluate refinement need",
      rationale: "Persistent drift risk exceeds typical in-cycle tolerance.",
      expectedImpact:
        "Reduces probability of late-stage correction extensions.",
    });
  }

  const baselineDelay = Math.round(overallRiskScore * 35);
  const v2SimulationPreview = simulateInterventions(
    {
      overallRiskScore,
      confidenceScore,
      predictedDelayDays: baselineDelay,
    },
    ["REINFORCE_WEAR", "EARLY_VISIT"],
  );

  const safetyFlags = {
    decisionSupportOnly: true,
    clinicianReviewRequired: confidenceScore < 0.55 || quality < 0.6,
    lowDataQuality: quality < 0.6 || viewsCompleteness < 0.8,
    confidenceTier:
      confidenceScore >= 0.75
        ? "HIGH"
        : confidenceScore >= 0.55
          ? "MEDIUM"
          : "LOW",
  };

  const segments = {
    upperArch: {
      trend,
      projectedRisk: clamp(overallRiskScore + 0.03),
    },
    lowerArch: {
      trend: classifyTrend(riskDelta - 0.01),
      projectedRisk: clamp(overallRiskScore - 0.02),
    },
    anterior: {
      trend: classifyTrend(driftDelta),
      projectedRisk: clamp(driftScore + 0.02),
    },
    posterior: {
      trend: classifyTrend(driftDelta + 0.01),
      projectedRisk: clamp(driftScore + 0.05),
    },
  };

  return {
    modelVersion: "ortho-copilot-v2.0.0",
    overallRiskScore,
    driftScore,
    complianceScore,
    confidenceScore,
    urgency,
    predictedDelayDays,
    driverTags,
    findings: {
      expectedWearHours: expectedWear,
      averageWearHours: avgWear,
      wearGap,
      elasticsAdherence: elastics,
      captureQualityScore: quality,
      viewsCompleteness,
      daysSinceLastCheckIn: input.daysSinceLastCheckIn ?? null,
      treatmentType: input.treatmentType ?? null,
      longitudinal: {
        previousRisk,
        riskDelta,
        previousDrift,
        driftDelta,
        trend,
        momentum:
          Math.abs(riskDelta) >= 0.08
            ? "HIGH"
            : Math.abs(riskDelta) >= 0.04
              ? "MEDIUM"
              : "LOW",
      },
      segments,
      safetyFlags,
      simulationPreview: v2SimulationPreview,
      caveat:
        "Decision support only. Requires orthodontist review and clinical correlation before treatment changes.",
    },
    recommendedActions,
  };
}
