export const NEXREL_AI_BRAIN_TRACE_HEADER = "x-nexrel-trace-id" as const;
export const NEXREL_AI_BRAIN_RUN_HEADER = "x-nexrel-ai-brain-run-id" as const;

type HeaderCarrier = {
  headers: {
    get(name: string): string | null;
  };
};

export function resolveNexrelAiBrainTraceId(carrier?: HeaderCarrier): string {
  const headerValue = carrier?.headers
    ?.get(NEXREL_AI_BRAIN_TRACE_HEADER)
    ?.trim();
  if (headerValue) return headerValue;
  return crypto.randomUUID();
}

export function buildPipedaEvidenceArtifact(input: {
  traceId: string;
  control:
    | "operator_run"
    | "operator_approval"
    | "operator_rejection"
    | "shadow_run";
  runId?: string;
  jobId?: string;
  surface?: string;
  route?: string;
}) {
  const anchor = input.runId || input.jobId || input.traceId;
  return {
    artifactId: `pipeda:${input.control}:${anchor}`,
    principle: "PIPEDA_FIP_1_ACCOUNTABILITY",
    traceId: input.traceId,
    runId: input.runId || null,
    jobId: input.jobId || null,
    surface: input.surface || null,
    route: input.route || null,
    generatedAt: new Date().toISOString(),
  };
}
