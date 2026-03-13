"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw } from "lucide-react";

type MemorySnippet = {
  kind: "strategy" | "risk" | "event" | "profile";
  title: string;
  detail: string;
  score: number;
};

type MemoryContext = {
  memoryId: string;
  generatedAt: string;
  windowDays: number;
  snippets: MemorySnippet[];
  sourceCounts: {
    decisions: number;
    outcomes: number;
    crmEvents: number;
    profiles: number;
  };
};

export default function MemoryLayerPage() {
  const [memory, setMemory] = useState<MemoryContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [windowDays, setWindowDays] = useState(30);

  const load = async (days = windowDays) => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/agent-command-center/memory?windowDays=${days}`,
      );
      const data = await response.json().catch(() => ({}));
      if (data?.success && data?.memory) setMemory(data.memory);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const primaryBtn =
    "px-4 py-2 rounded-lg bg-amber-500 text-zinc-900 text-sm font-semibold hover:bg-amber-400 transition-colors";

  return (
    <div className="min-h-full text-zinc-100 px-8 py-6 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Long-term Memory Layer</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Durable strategy memory from decisions, outcomes, CRM events, and
            profile state.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {[14, 30, 60].map((days) => (
            <Button
              key={days}
              variant={windowDays === days ? "default" : "outline"}
              className={
                windowDays === days
                  ? "bg-amber-500 text-zinc-900 hover:bg-amber-400"
                  : "border-zinc-600 text-zinc-200"
              }
              onClick={() => {
                setWindowDays(days);
                load(days);
              }}
            >
              {days}d
            </Button>
          ))}
          <Button className={primaryBtn} onClick={() => load()}>
            {loading ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : null}
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-3 text-xs">
        <div className="glass-panel rounded-xl p-3">
          <p className="text-zinc-400">Decision memories</p>
          <p className="text-lg font-bold">
            {memory?.sourceCounts.decisions || 0}
          </p>
        </div>
        <div className="glass-panel rounded-xl p-3">
          <p className="text-zinc-400">Outcome memories</p>
          <p className="text-lg font-bold">
            {memory?.sourceCounts.outcomes || 0}
          </p>
        </div>
        <div className="glass-panel rounded-xl p-3">
          <p className="text-zinc-400">CRM event memories</p>
          <p className="text-lg font-bold">
            {memory?.sourceCounts.crmEvents || 0}
          </p>
        </div>
        <div className="glass-panel rounded-xl p-3">
          <p className="text-zinc-400">Profile snapshots</p>
          <p className="text-lg font-bold">
            {memory?.sourceCounts.profiles || 0}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {(memory?.snippets || []).map((snippet, idx) => (
          <div
            key={`${snippet.kind}-${idx}`}
            className="glass-panel rounded-xl p-4"
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs uppercase">
                {snippet.kind}
              </Badge>
              <span className="text-[11px] text-zinc-500">
                score {snippet.score}
              </span>
            </div>
            <p className="text-sm font-semibold mt-2">{snippet.title}</p>
            <p className="text-xs text-zinc-400 mt-1">{snippet.detail}</p>
          </div>
        ))}
        {!loading && (memory?.snippets || []).length === 0 ? (
          <div className="glass-panel rounded-xl p-6 text-sm text-zinc-400">
            No memory snippets available yet.
          </div>
        ) : null}
      </div>
    </div>
  );
}
