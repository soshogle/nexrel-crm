type JobMode = "cron-fallback" | "cron-targeted" | "session" | (string & {});

type BaseJobLog = {
  job: string;
  mode: JobMode;
};

export function logJobStart(
  payload: BaseJobLog & Record<string, unknown>,
): void {
  console.info("[job] start", payload);
}

export function logJobTenant(
  payload: BaseJobLog & { tenantId: string } & Record<string, unknown>,
): void {
  console.info("[job] tenant", payload);
}

export function logJobComplete(
  payload: BaseJobLog & { durationMs: number } & Record<string, unknown>,
): void {
  console.info("[job] complete", payload);
}
