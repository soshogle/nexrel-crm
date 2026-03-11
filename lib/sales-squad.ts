export type SalesSquadPhaseStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "blocked";

export type SalesSquadPhase = {
  id: number;
  key:
    | "chief_of_staff"
    | "autonomous_outbound"
    | "proactive_deal_finder"
    | "inbound_qualification"
    | "growth_engine"
    | "content_research";
  name: string;
  dependsOn: number[];
};

export type SalesSquadState = {
  squadId: string;
  ownerUserId: string;
  squadName: string;
  trustStage: "crawl" | "walk" | "run";
  primaryGoal: string;
  currentPhase: number;
  phaseStatus: Record<number, SalesSquadPhaseStatus>;
  phaseOutputs: Record<number, any>;
  createdAt: string;
  updatedAt: string;
};

export const SALES_SQUAD_PHASES: SalesSquadPhase[] = [
  {
    id: 1,
    key: "chief_of_staff",
    name: "Chief of Staff (Alfred)",
    dependsOn: [],
  },
  {
    id: 2,
    key: "autonomous_outbound",
    name: "Autonomous Outbound (Green Arrow)",
    dependsOn: [1],
  },
  {
    id: 3,
    key: "proactive_deal_finder",
    name: "Proactive Deal Finder",
    dependsOn: [1],
  },
  {
    id: 4,
    key: "inbound_qualification",
    name: "Inbound Qualification (Oracle)",
    dependsOn: [1],
  },
  {
    id: 5,
    key: "growth_engine",
    name: "Growth Engine (Helios)",
    dependsOn: [1],
  },
  {
    id: 6,
    key: "content_research",
    name: "Content & Research (The Curator)",
    dependsOn: [1],
  },
];

const SALES_TRUST_STAGE_ORDER: SalesSquadState["trustStage"][] = [
  "crawl",
  "walk",
  "run",
];

export function getRequiredSalesTrustStageForPhase(
  phaseId: number,
): SalesSquadState["trustStage"] {
  if (phaseId <= 2) return "crawl";
  if (phaseId <= 5) return "walk";
  return "run";
}

export function canRunSalesSquadPhaseForTrustStage(
  trustStage: SalesSquadState["trustStage"],
  phaseId: number,
) {
  const required = getRequiredSalesTrustStageForPhase(phaseId);
  const currentIndex = SALES_TRUST_STAGE_ORDER.indexOf(trustStage);
  const requiredIndex = SALES_TRUST_STAGE_ORDER.indexOf(required);
  if (currentIndex < requiredIndex) {
    return {
      ok: false,
      reason: `Phase ${phaseId} requires trust stage ${required}. Current stage is ${trustStage}.`,
      required,
    };
  }
  return { ok: true, required };
}

export function canPromoteSalesTrustStage(
  state: SalesSquadState,
  targetStage: SalesSquadState["trustStage"],
) {
  const currentIndex = SALES_TRUST_STAGE_ORDER.indexOf(state.trustStage);
  const targetIndex = SALES_TRUST_STAGE_ORDER.indexOf(targetStage);

  if (targetIndex < 0) {
    return { ok: false, reason: `Unknown trust stage ${targetStage}` };
  }

  if (targetIndex <= currentIndex) {
    return { ok: true };
  }

  if (targetIndex - currentIndex > 1) {
    return {
      ok: false,
      reason: `Cannot jump trust stage from ${state.trustStage} to ${targetStage}. Promote one stage at a time.`,
    };
  }

  if (state.trustStage === "crawl" && targetStage === "walk") {
    if (
      state.phaseStatus[1] !== "completed" ||
      state.phaseStatus[2] !== "completed"
    ) {
      return {
        ok: false,
        reason: "Promoting to walk requires phases 1 and 2 to be completed.",
      };
    }
  }

  if (state.trustStage === "walk" && targetStage === "run") {
    const needs = [1, 2, 3, 4, 5];
    const missing = needs.filter(
      (phaseId) => state.phaseStatus[phaseId] !== "completed",
    );
    if (missing.length > 0) {
      return {
        ok: false,
        reason: `Promoting to run requires phases 1-5 completed. Missing: ${missing.join(", ")}`,
      };
    }
  }

  return { ok: true };
}

export function createSalesSquadState(input: {
  squadId: string;
  ownerUserId: string;
  squadName: string;
  primaryGoal: string;
}): SalesSquadState {
  const now = new Date().toISOString();
  const phaseStatus = Object.fromEntries(
    SALES_SQUAD_PHASES.map((phase) => [phase.id, "pending"]),
  ) as Record<number, SalesSquadPhaseStatus>;

  return {
    squadId: input.squadId,
    ownerUserId: input.ownerUserId,
    squadName: input.squadName,
    trustStage: "crawl" as const,
    primaryGoal: input.primaryGoal,
    currentPhase: 1,
    phaseStatus,
    phaseOutputs: {},
    createdAt: now,
    updatedAt: now,
  };
}

export function getSalesSquadPhase(phaseId: number) {
  return SALES_SQUAD_PHASES.find((phase) => phase.id === phaseId) || null;
}

export function canRunSalesSquadPhase(state: SalesSquadState, phaseId: number) {
  const phase = getSalesSquadPhase(phaseId);
  if (!phase) return { ok: false, reason: `Unknown phase ${phaseId}` };
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

export function upsertSalesSquadPhaseOutput(
  state: SalesSquadState,
  input: {
    phaseId: number;
    status: SalesSquadPhaseStatus;
    output: any;
    currentPhase?: number;
    trustStage?: SalesSquadState["trustStage"];
  },
) {
  return {
    ...state,
    trustStage: input.trustStage || state.trustStage,
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

export function getNextPendingSalesSquadPhase(
  state: SalesSquadState,
): number | null {
  for (const phase of SALES_SQUAD_PHASES) {
    if (state.phaseStatus[phase.id] !== "completed") return phase.id;
  }
  return null;
}
