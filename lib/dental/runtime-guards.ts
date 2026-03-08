"use client";

type GuardPayload = {
  panel: string;
  issue: string;
  email?: string | null;
  details?: Record<string, unknown>;
};

const emitted = new Set<string>();

export const ORTHO_DEMO_EMAIL = "orthodontist@nexrel.com";

export function isDemoAccountEmail(email?: string | null): boolean {
  return (
    String(email || "")
      .toLowerCase()
      .trim() === ORTHO_DEMO_EMAIL
  );
}

/**
 * Runtime guard: flag any non-demo user path that renders demo/fallback panel data.
 * Emits once per unique key to avoid noisy logs.
 */
export function flagNonDemoFallback(payload: GuardPayload): void {
  const email = String(payload.email || "")
    .toLowerCase()
    .trim();
  if (isDemoAccountEmail(email)) return;

  const key = `${payload.panel}:${payload.issue}:${email}`;
  if (emitted.has(key)) return;
  emitted.add(key);

  const message = `[RuntimeGuard] Non-demo fallback detected in ${payload.panel}: ${payload.issue}`;
  console.error(message, {
    email: email || undefined,
    details: payload.details || undefined,
  });

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("nexrel:runtime-guard", {
        detail: {
          severity: "error",
          ...payload,
          email: email || undefined,
          timestamp: new Date().toISOString(),
        },
      }),
    );
  }
}
