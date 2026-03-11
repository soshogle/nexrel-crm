export type ViralLoopPhaseStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "blocked";

export type ViralLoopPhase = {
  id: number;
  key:
    | "niche_research"
    | "content_creation"
    | "draft_posting"
    | "diagnostics"
    | "hook_rotation"
    | "goal_tracking"
    | "cross_platform_adapter"
    | "memory_backup";
  name: string;
  dependsOn: number[];
};

export type ViralLoopState = {
  projectId: string;
  ownerUserId: string;
  projectName: string;
  niche: string;
  conversionGoal: string;
  trustStage: "crawl" | "walk" | "run";
  channels: string[];
  currentPhase: number;
  phaseStatus: Record<number, ViralLoopPhaseStatus>;
  phaseOutputs: Record<number, any>;
  createdAt: string;
  updatedAt: string;
};

export const VIRAL_LOOP_PHASES: ViralLoopPhase[] = [
  { id: 1, key: "niche_research", name: "Niche Research", dependsOn: [] },
  {
    id: 2,
    key: "content_creation",
    name: "Content Creation Engine",
    dependsOn: [1],
  },
  {
    id: 3,
    key: "draft_posting",
    name: "Draft Posting Pipeline",
    dependsOn: [2],
  },
  { id: 4, key: "diagnostics", name: "Diagnostic Engine", dependsOn: [3] },
  {
    id: 5,
    key: "hook_rotation",
    name: "Hook Rotation & CTA Evolution",
    dependsOn: [4],
  },
  {
    id: 6,
    key: "goal_tracking",
    name: "Goal Tracking",
    dependsOn: [4],
  },
  {
    id: 7,
    key: "cross_platform_adapter",
    name: "Cross-Platform Adapter",
    dependsOn: [3],
  },
  {
    id: 8,
    key: "memory_backup",
    name: "Memory Backup",
    dependsOn: [4],
  },
];

export function createViralLoopState(input: {
  projectId: string;
  ownerUserId: string;
  projectName: string;
  niche: string;
  conversionGoal: string;
  channels?: string[];
}): ViralLoopState {
  const now = new Date().toISOString();
  const phaseStatus = Object.fromEntries(
    VIRAL_LOOP_PHASES.map((phase) => [phase.id, "pending"]),
  ) as Record<number, ViralLoopPhaseStatus>;
  return {
    projectId: input.projectId,
    ownerUserId: input.ownerUserId,
    projectName: input.projectName,
    niche: input.niche,
    conversionGoal: input.conversionGoal,
    trustStage: "crawl",
    channels: input.channels?.length
      ? input.channels
      : ["tiktok", "instagram", "youtube", "linkedin", "twitter", "facebook"],
    currentPhase: 1,
    phaseStatus,
    phaseOutputs: {},
    createdAt: now,
    updatedAt: now,
  };
}

export function getViralLoopPhaseDefinition(phaseId: number) {
  return VIRAL_LOOP_PHASES.find((phase) => phase.id === phaseId) || null;
}

export function canRunViralLoopPhase(state: ViralLoopState, phaseId: number) {
  const phase = getViralLoopPhaseDefinition(phaseId);
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

export function upsertViralLoopPhaseOutput(
  state: ViralLoopState,
  input: {
    phaseId: number;
    status: ViralLoopPhaseStatus;
    output: any;
    currentPhase?: number;
    trustStage?: ViralLoopState["trustStage"];
  },
): ViralLoopState {
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

export function getNextPendingViralPhase(state: ViralLoopState): number | null {
  for (const phase of VIRAL_LOOP_PHASES) {
    if (state.phaseStatus[phase.id] !== "completed") return phase.id;
  }
  return null;
}

export function buildViralResearchOutput(input: {
  niche: string;
  conversionGoal: string;
}) {
  return {
    niche: input.niche,
    conversionGoal: input.conversionGoal,
    winningFormats: [
      {
        format: "Slideshow reveal",
        visualStyle: "Photorealistic before/after",
        overlays: "Center text, large white with black outline",
      },
      {
        format: "POV transformation",
        visualStyle: "High-contrast product context shots",
        overlays: "Single emotional hook per slide",
      },
    ],
    hooks: [
      `I showed my friend what AI thinks ${input.niche} could look like`,
      `The difference between average and premium ${input.niche} decisions`,
      `I tested 3 ${input.niche} strategies and this one won`,
    ],
    ctas: [
      `Try this now to improve ${input.conversionGoal}`,
      `Use our system to speed up ${input.conversionGoal}`,
      `Start today if you want better ${input.conversionGoal}`,
    ],
  };
}

export function buildViralContentPackage(input: {
  projectName: string;
  niche: string;
  hooks: string[];
  ctas: string[];
}) {
  const hook = input.hooks[0] || `How to improve ${input.niche} results`;
  const cta = input.ctas[0] || "Get started today";
  return {
    packageId: crypto.randomUUID(),
    hook,
    cta,
    slides: [
      { index: 1, overlay: hook },
      {
        index: 2,
        overlay: `Most teams miss this ${input.niche} optimization`,
      },
      {
        index: 3,
        overlay: `Use this repeatable framework in ${input.projectName}`,
      },
      { index: 4, overlay: cta },
    ],
    caption: `${hook}. Built with the ${input.projectName} viral loop. ${cta}`,
  };
}
