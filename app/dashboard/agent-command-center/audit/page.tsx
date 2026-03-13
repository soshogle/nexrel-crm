"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";

type AuditItem = {
  id: string;
  entityType: string;
  action: string;
  severity: string;
  success: boolean;
  errorMessage: string | null;
  metadata: any;
  createdAt: string;
  user: { id: string; name: string | null; email: string | null } | null;
};

function summarize(item: AuditItem): string {
  if (item.entityType === "AUTONOMY_CONTROL_POLICY") {
    const reason = item?.metadata?.reason || "owner control update";
    const status = item?.metadata?.status || "unknown";
    return `Owner control changed to ${status} (${reason})`;
  }
  if (item.entityType === "NEXREL_AI_BRAIN_OPERATOR_APPROVAL") {
    return "High-risk action approved by owner";
  }
  if (item.entityType === "NEXREL_AI_BRAIN_OPERATOR_REJECTION") {
    return "High-risk action rejected by owner";
  }
  if (item.entityType === "OPENCLAW_OPERATION") {
    const mode = item?.metadata?.mode || "operation";
    return `Nexrel AI executed ${mode}`;
  }
  if (item.entityType === "NEXREL_AI_BRAIN_DECISION") {
    const objective = item?.metadata?.objective || "decision";
    const status = item?.metadata?.allowed ? "allowed" : "blocked";
    return `Decision ${status}: ${objective}`;
  }
  if (item.entityType === "NEXREL_AI_BRAIN_OUTCOME") {
    const actual = item?.metadata?.actual || {};
    const sent = Number(actual?.sent || 0);
    const failed = Number(actual?.failed || 0);
    return `Outcome recorded (sent ${sent}, failed ${failed})`;
  }
  if (item.entityType === "NEXREL_AI_BRAIN_PROFILE") {
    return "Business brain profile updated";
  }
  if (item.entityType === "AUTONOMY_DRAFT_ACTION") {
    return "Draft-only action generated (crawl mode)";
  }
  return item.entityType;
}

export default function AuditTimelinePage() {
  const [timeline, setTimeline] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/agent-command-center/audit?limit=200");
      const data = await res.json();
      setTimeline(Array.isArray(data?.timeline) ? data.timeline : []);
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
          <h1 className="text-2xl font-bold">Audit Timeline</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Per-action trace for owner overrides, approvals, rejections, and
            autonomous runs.
          </p>
        </div>
        <Button onClick={load} className={primaryBtn}>
          {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
          Refresh
        </Button>
      </div>

      <div className="space-y-3">
        {timeline.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.02 }}
            className="glass-panel rounded-xl p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">{summarize(item)}</p>
                <p className="text-xs text-zinc-400 mt-1">
                  by {item.user?.name || item.user?.email || "system"}
                </p>
                <p className="text-[11px] text-zinc-500 mt-2">
                  {item.entityType}
                </p>
              </div>
              <div className="text-right">
                <div
                  className={`text-[11px] font-semibold ${item.success ? "text-emerald-300" : "text-red-300"}`}
                >
                  {item.success ? "SUCCESS" : "FAILED"}
                </div>
                <div className="text-[11px] text-zinc-500 mt-1 inline-flex items-center gap-1">
                  <Clock3 className="w-3 h-3" />
                  {new Date(item.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
            {item.errorMessage ? (
              <p className="text-xs text-red-300 mt-2">{item.errorMessage}</p>
            ) : null}
            {Array.isArray(item?.metadata?.why) &&
            item.metadata.why.length > 0 ? (
              <p className="text-[11px] text-zinc-400 mt-2">
                Why: {item.metadata.why.join(" | ")}
              </p>
            ) : null}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
