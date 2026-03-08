type DependencyName = "openai" | "elevenlabs" | "twilio";

type DependencyEvent = {
  timestamp: number;
  success: boolean;
  source: "runtime" | "synthetic";
  statusCode?: number;
  latencyMs?: number;
  message?: string;
};

type DependencyState = {
  events: DependencyEvent[];
  consecutiveSyntheticFailures: number;
  consecutiveSyntheticSuccesses: number;
};

type DependencyStatus = "unknown" | "healthy" | "degraded" | "outage";

type DependencySummary = {
  dependency: DependencyName;
  status: DependencyStatus;
  failRate5m: number;
  failRate10m: number;
  sampleSize5m: number;
  sampleSize10m: number;
  consecutiveSyntheticFailures: number;
  consecutiveSyntheticSuccesses: number;
  updatedAt: string | null;
};

const FIVE_MINUTES_MS = 5 * 60 * 1000;
const TEN_MINUTES_MS = 10 * 60 * 1000;
const MAX_EVENTS_PER_DEPENDENCY = 400;

const DEGRADE_FAIL_RATE = 0.05;
const OUTAGE_FAIL_RATE = 0.3;
const MIN_SAMPLES_DEGRADE = 8;
const MIN_SAMPLES_OUTAGE = 12;
const SYNTHETIC_FAILURES_FOR_OUTAGE = 3;
const SYNTHETIC_SUCCESSES_FOR_RECOVERY = 3;

const globalStore = globalThis as typeof globalThis & {
  __dependencyHealthStore?: Record<DependencyName, DependencyState>;
};

function createDefaultState(): Record<DependencyName, DependencyState> {
  return {
    openai: {
      events: [],
      consecutiveSyntheticFailures: 0,
      consecutiveSyntheticSuccesses: 0,
    },
    elevenlabs: {
      events: [],
      consecutiveSyntheticFailures: 0,
      consecutiveSyntheticSuccesses: 0,
    },
    twilio: {
      events: [],
      consecutiveSyntheticFailures: 0,
      consecutiveSyntheticSuccesses: 0,
    },
  };
}

function getStore(): Record<DependencyName, DependencyState> {
  if (!globalStore.__dependencyHealthStore) {
    globalStore.__dependencyHealthStore = createDefaultState();
  }
  return globalStore.__dependencyHealthStore;
}

function trimOldEvents(
  events: DependencyEvent[],
  now: number,
): DependencyEvent[] {
  const cutoff = now - TEN_MINUTES_MS;
  const recent = events.filter((evt) => evt.timestamp >= cutoff);
  if (recent.length > MAX_EVENTS_PER_DEPENDENCY) {
    return recent.slice(recent.length - MAX_EVENTS_PER_DEPENDENCY);
  }
  return recent;
}

function calculateFailRate(events: DependencyEvent[]): number {
  if (!events.length) return 0;
  const failures = events.filter((evt) => !evt.success).length;
  return failures / events.length;
}

function summarizeDependency(dependency: DependencyName): DependencySummary {
  const now = Date.now();
  const store = getStore();
  const state = store[dependency];

  state.events = trimOldEvents(state.events, now);

  const events5m = state.events.filter(
    (evt) => evt.timestamp >= now - FIVE_MINUTES_MS,
  );
  const events10m = state.events.filter(
    (evt) => evt.timestamp >= now - TEN_MINUTES_MS,
  );

  const failRate5m = calculateFailRate(events5m);
  const failRate10m = calculateFailRate(events10m);
  const sampleSize5m = events5m.length;
  const sampleSize10m = events10m.length;

  let status: DependencyStatus = "unknown";

  const outageBySynthetic =
    state.consecutiveSyntheticFailures >= SYNTHETIC_FAILURES_FOR_OUTAGE;
  const outageByRate =
    sampleSize10m >= MIN_SAMPLES_OUTAGE && failRate10m >= OUTAGE_FAIL_RATE;
  const degradedByRate =
    sampleSize5m >= MIN_SAMPLES_DEGRADE && failRate5m >= DEGRADE_FAIL_RATE;

  if (outageBySynthetic || outageByRate) {
    status = "outage";
  } else if (degradedByRate) {
    status = "degraded";
  } else if (sampleSize5m > 0 || sampleSize10m > 0) {
    status = "healthy";
  }

  if (
    status !== "healthy" &&
    state.consecutiveSyntheticSuccesses >= SYNTHETIC_SUCCESSES_FOR_RECOVERY &&
    sampleSize5m > 0 &&
    failRate5m < DEGRADE_FAIL_RATE
  ) {
    status = "healthy";
  }

  const last = state.events[state.events.length - 1];
  return {
    dependency,
    status,
    failRate5m,
    failRate10m,
    sampleSize5m,
    sampleSize10m,
    consecutiveSyntheticFailures: state.consecutiveSyntheticFailures,
    consecutiveSyntheticSuccesses: state.consecutiveSyntheticSuccesses,
    updatedAt: last ? new Date(last.timestamp).toISOString() : null,
  };
}

export function recordDependencyResult(input: {
  dependency: DependencyName;
  success: boolean;
  source?: "runtime" | "synthetic";
  statusCode?: number;
  latencyMs?: number;
  message?: string;
}): void {
  const now = Date.now();
  const store = getStore();
  const state = store[input.dependency];

  state.events.push({
    timestamp: now,
    success: input.success,
    source: input.source || "runtime",
    statusCode: input.statusCode,
    latencyMs: input.latencyMs,
    message: input.message,
  });
  state.events = trimOldEvents(state.events, now);

  if ((input.source || "runtime") === "synthetic") {
    if (input.success) {
      state.consecutiveSyntheticSuccesses += 1;
      state.consecutiveSyntheticFailures = 0;
    } else {
      state.consecutiveSyntheticFailures += 1;
      state.consecutiveSyntheticSuccesses = 0;
    }
  }
}

export function getDependencyHealthOverview(): {
  generatedAt: string;
  dependencies: DependencySummary[];
} {
  return {
    generatedAt: new Date().toISOString(),
    dependencies: ["openai", "elevenlabs", "twilio"].map((dep) =>
      summarizeDependency(dep as DependencyName),
    ),
  };
}
