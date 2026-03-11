import {
  canRunSalesSquadPhase,
  canRunSalesSquadPhaseForTrustStage,
  getNextPendingSalesSquadPhase,
  type SalesSquadState,
} from "@/lib/sales-squad";
import {
  canRunViralLoopPhase,
  canRunViralLoopPhaseForTrustStage,
  getNextPendingViralPhase,
  type ViralLoopState,
} from "@/lib/viral-loop";
import {
  canRunWorkAiPhase,
  getNextPendingWorkAiPhase,
  type WorkAiLaunchState,
} from "@/lib/work-ai-marketing";

export function buildViralReadiness(state: ViralLoopState | null) {
  if (!state) return null;
  const nextPhase = getNextPendingViralPhase(state);
  if (!nextPhase) return { nextPhase: null, runnable: true, reason: null };

  const dependency = canRunViralLoopPhase(state, nextPhase);
  if (!dependency.ok) {
    return {
      nextPhase,
      runnable: false,
      reason: dependency.reason,
    };
  }

  const trust = canRunViralLoopPhaseForTrustStage(state.trustStage, nextPhase);
  if (!trust.ok) {
    return {
      nextPhase,
      runnable: false,
      reason: trust.reason,
      requiredTrustStage: trust.required,
    };
  }

  return { nextPhase, runnable: true, reason: null };
}

export function buildSalesReadiness(state: SalesSquadState | null) {
  if (!state) return null;
  const nextPhase = getNextPendingSalesSquadPhase(state);
  if (!nextPhase) return { nextPhase: null, runnable: true, reason: null };

  const dependency = canRunSalesSquadPhase(state, nextPhase);
  if (!dependency.ok) {
    return {
      nextPhase,
      runnable: false,
      reason: dependency.reason,
    };
  }

  const trust = canRunSalesSquadPhaseForTrustStage(state.trustStage, nextPhase);
  if (!trust.ok) {
    return {
      nextPhase,
      runnable: false,
      reason: trust.reason,
      requiredTrustStage: trust.required,
    };
  }

  return { nextPhase, runnable: true, reason: null };
}

export function buildWorkAiReadiness(state: WorkAiLaunchState | null) {
  if (!state) return null;
  const nextPhase = getNextPendingWorkAiPhase(state);
  if (!nextPhase) return { nextPhase: null, runnable: true, reason: null };

  const dependency = canRunWorkAiPhase(state, nextPhase);
  if (!dependency.ok) {
    return {
      nextPhase,
      runnable: false,
      reason: dependency.reason,
    };
  }

  return { nextPhase, runnable: true, reason: null };
}
