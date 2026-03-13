"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, ShieldCheck, ShieldX } from "lucide-react";

type ExplainabilityDecision = {
  id: string;
  decisionEntityId: string;
  createdAt: string;
  surface: string;
  objective: string;
  mode: string;
  allowed: boolean;
  why: string[];
  deniedActions: Array<{ type: string; reason: string }>;
  pendingApprovals: Array<{ jobId: string; type: string }>;
  predictedImpact: {
    leadVelocity?: number;
    conversionLift?: number;
    riskScore?: number;
  } | null;
  businessProfileRef: {
    profileId: string;
    updatedAt: string;
    source: string;
  } | null;
  memoryRef: {
    memoryId: string;
    generatedAt: string;
    sourceCounts: {
      decisions: number;
      outcomes: number;
      crmEvents: number;
      profiles: number;
    };
  } | null;
  outcome: {
    createdAt: string;
    actual: Record<string, any> | null;
  } | null;
};

export default function ExplainabilityPage() {
  const [items, setItems] = useState<ExplainabilityDecision[]>([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({
    total: 0,
    allowed: 0,
    blocked: 0,
    withOutcome: 0,
    avgRiskScore: 0,
  });
  const [surface, setSurface] = useState("");
  const [allowed, setAllowed] = useState<"all" | "allowed" | "blocked">("all");
  const [days, setDays] = useState(14);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: "75",
        days: String(days),
      });
      if (surface) params.set("surface", surface);
      if (allowed !== "all") params.set("allowed", allowed);
      const response = await fetch(
        `/api/agent-command-center/explainability?${params.toString()}`,
      );
      const data = await response.json().catch(() => ({}));
      setItems(Array.isArray(data?.decisions) ? data.decisions : []);
      setSummary(
        data?.summary || {
          total: 0,
          allowed: 0,
          blocked: 0,
          withOutcome: 0,
          avgRiskScore: 0,
        },
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [surface, allowed, days]);

  const primaryBtn =
    "px-4 py-2 rounded-lg bg-amber-500 text-zinc-900 text-sm font-semibold hover:bg-amber-400 transition-colors";

  return (
    <div className="min-h-full text-zinc-100 px-8 py-6 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Explainability</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Why Nexrel AI chose each action and expected impact vs actual
            outcome.
          </p>
        </div>
        <Button onClick={load} className={primaryBtn}>
          {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
          Refresh
        </Button>
      </div>

      <div className="glass-panel rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-zinc-400">Window</span>
          {[7, 14, 30].map((d) => (
            <Button
              key={d}
              variant={days === d ? "default" : "outline"}
              className={
                days === d
                  ? "bg-amber-500 text-zinc-900 hover:bg-amber-400"
                  : "border-zinc-600 text-zinc-200"
              }
              onClick={() => setDays(d)}
            >
              {d}d
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            value={surface}
            onChange={(e) => setSurface(e.target.value.toLowerCase())}
            placeholder="Filter surface"
            className="h-9 px-3 rounded-md bg-zinc-900/60 border border-zinc-700 text-zinc-100"
          />
          <select
            value={allowed}
            onChange={(e) => setAllowed(e.target.value as any)}
            className="h-9 px-3 rounded-md bg-zinc-900/60 border border-zinc-700 text-zinc-100"
          >
            <option value="all">All decisions</option>
            <option value="allowed">Allowed only</option>
            <option value="blocked">Blocked only</option>
          </select>
        </div>
        <div className="text-zinc-300">
          Total {summary.total} · Allowed {summary.allowed} · Blocked{" "}
          {summary.blocked} · Outcomes {summary.withOutcome} · Avg risk{" "}
          {summary.avgRiskScore}
        </div>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="glass-panel rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs uppercase">
                  {item.surface}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {item.mode}
                </Badge>
                <Badge
                  variant="outline"
                  className={item.allowed ? "text-emerald-300" : "text-red-300"}
                >
                  {item.allowed ? (
                    <ShieldCheck className="w-3 h-3 mr-1" />
                  ) : (
                    <ShieldX className="w-3 h-3 mr-1" />
                  )}
                  {item.allowed ? "Allowed" : "Blocked"}
                </Badge>
              </div>
              <p className="text-[11px] text-zinc-500">
                {new Date(item.createdAt).toLocaleString()}
              </p>
            </div>

            <p className="text-sm text-zinc-100">{item.objective}</p>

            {item.why.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {item.why.map((reason, idx) => (
                  <Badge
                    key={`${item.id}-why-${idx}`}
                    variant="secondary"
                    className="text-[11px]"
                  >
                    {reason}
                  </Badge>
                ))}
              </div>
            ) : null}

            <div className="grid md:grid-cols-3 gap-3 text-xs">
              <div className="rounded-md border border-zinc-700 bg-zinc-900/50 p-2">
                <p className="text-zinc-400">Predicted lead velocity</p>
                <p className="text-zinc-100 font-semibold">
                  {item.predictedImpact?.leadVelocity ?? 0}
                </p>
              </div>
              <div className="rounded-md border border-zinc-700 bg-zinc-900/50 p-2">
                <p className="text-zinc-400">Predicted conversion lift</p>
                <p className="text-zinc-100 font-semibold">
                  {item.predictedImpact?.conversionLift ?? 0}
                </p>
              </div>
              <div className="rounded-md border border-zinc-700 bg-zinc-900/50 p-2">
                <p className="text-zinc-400">Predicted risk score</p>
                <p className="text-zinc-100 font-semibold">
                  {item.predictedImpact?.riskScore ?? 0}
                </p>
              </div>
            </div>

            {item.outcome?.actual ? (
              <div className="rounded-md border border-zinc-700 bg-zinc-900/50 p-2">
                <p className="text-xs text-zinc-400 mb-1">Actual outcome</p>
                <pre className="text-[11px] text-zinc-200 whitespace-pre-wrap break-words">
                  {JSON.stringify(item.outcome.actual, null, 2)}
                </pre>
              </div>
            ) : null}

            {item.deniedActions.length > 0 ? (
              <p className="text-xs text-amber-300">
                Denied:{" "}
                {item.deniedActions
                  .map((d) => `${d.type} (${d.reason})`)
                  .join(", ")}
              </p>
            ) : null}

            {item.memoryRef ? (
              <p className="text-[11px] text-zinc-500">
                Memory ref: {item.memoryRef.memoryId.slice(0, 8)}... · decisions{" "}
                {item.memoryRef.sourceCounts.decisions} · outcomes{" "}
                {item.memoryRef.sourceCounts.outcomes}
              </p>
            ) : null}
          </div>
        ))}
        {!loading && items.length === 0 ? (
          <div className="glass-panel rounded-xl p-6 text-sm text-zinc-400">
            No explainability records yet.
          </div>
        ) : null}
      </div>
    </div>
  );
}
