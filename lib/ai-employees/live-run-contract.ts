type ExecutionTarget = "cloud_browser" | "owner_desktop";
type ExecutionRuntime = "openclaw" | "legacy_worker";
type TrustMode = "crawl" | "walk" | "run";
type AutonomyLevel =
  | "observe"
  | "assist"
  | "autonomous_low_risk"
  | "autonomous_full";

const TRUST_MODES: TrustMode[] = ["crawl", "walk", "run"];
const EXECUTION_TARGETS: ExecutionTarget[] = ["cloud_browser", "owner_desktop"];
const EXECUTION_RUNTIMES: ExecutionRuntime[] = ["openclaw", "legacy_worker"];
const AUTONOMY_LEVELS: AutonomyLevel[] = [
  "observe",
  "assist",
  "autonomous_low_risk",
  "autonomous_full",
];

export type ParsedLiveRunPayload = {
  goal: string;
  targetApps: string[];
  trustMode: TrustMode;
  autonomyLevel: AutonomyLevel;
  executionTarget: ExecutionTarget;
  executionRuntime: ExecutionRuntime;
  deviceId: string | null;
  employeeType?: string;
  employeeName?: string;
};

function inferAutonomyLevel(trustMode: TrustMode): AutonomyLevel {
  if (trustMode === "crawl") return "observe";
  if (trustMode === "walk") return "assist";
  return "autonomous_low_risk";
}

export function parseLiveRunPayload(body: any):
  | {
      ok: true;
      payload: ParsedLiveRunPayload;
    }
  | {
      ok: false;
      error: string;
    } {
  const goal = String(body?.goal || "Run owner mission").trim();
  const targetApps = Array.isArray(body?.targetApps)
    ? body.targetApps.map((v: any) => String(v)).filter(Boolean)
    : [];
  const trustMode = String(
    body?.trustMode || "crawl",
  ).toLowerCase() as TrustMode;
  const autonomyLevel = String(
    body?.autonomyLevel || inferAutonomyLevel(trustMode),
  ).toLowerCase() as AutonomyLevel;
  const executionTarget = String(
    body?.executionTarget || "cloud_browser",
  ).toLowerCase() as ExecutionTarget;
  const executionRuntime = String(
    body?.executionRuntime || "openclaw",
  ).toLowerCase() as ExecutionRuntime;

  if (!goal) return { ok: false, error: "goal is required" };
  if (!TRUST_MODES.includes(trustMode)) {
    return { ok: false, error: "trustMode must be crawl, walk, or run" };
  }
  if (!EXECUTION_TARGETS.includes(executionTarget)) {
    return {
      ok: false,
      error: "executionTarget must be cloud_browser or owner_desktop",
    };
  }
  if (!EXECUTION_RUNTIMES.includes(executionRuntime)) {
    return {
      ok: false,
      error: "executionRuntime must be openclaw or legacy_worker",
    };
  }
  if (!AUTONOMY_LEVELS.includes(autonomyLevel)) {
    return {
      ok: false,
      error:
        "autonomyLevel must be observe, assist, autonomous_low_risk, or autonomous_full",
    };
  }

  return {
    ok: true,
    payload: {
      goal,
      targetApps,
      trustMode,
      autonomyLevel,
      executionTarget,
      executionRuntime,
      deviceId: body?.deviceId ? String(body.deviceId) : null,
      employeeType: body?.employeeType ? String(body.employeeType) : undefined,
      employeeName: body?.employeeName ? String(body.employeeName) : undefined,
    },
  };
}
