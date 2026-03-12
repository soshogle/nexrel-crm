"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, ShieldAlert, RefreshCw } from "lucide-react";

type ApprovalItem = {
  id: string;
  jobType: string;
  priority: string;
  input: any;
  createdAt: string;
  hitl: {
    id: string;
    taskName: string;
    message: string;
    urgency: string;
    createdAt: string;
  } | null;
};

export default function ApprovalsInboxPage() {
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyJob, setBusyJob] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/agent-command-center/approvals");
      const data = await res.json();
      setApprovals(Array.isArray(data?.approvals) ? data.approvals : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const decide = async (jobId: string, decision: "approve" | "reject") => {
    setBusyJob(jobId);
    try {
      await fetch("/api/agent-command-center/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, decision }),
      });
      await load();
    } finally {
      setBusyJob(null);
    }
  };

  return (
    <div className="min-h-full text-zinc-100 px-8 py-6 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Approvals Inbox</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Review and approve high-risk autonomous actions before execution.
          </p>
        </div>
        <Button
          onClick={load}
          variant="outline"
          className="border-zinc-600 text-zinc-200"
        >
          {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
          Refresh
        </Button>
      </div>

      <div className="glass-panel rounded-xl p-4">
        <div className="flex items-center gap-2 text-xs text-amber-200">
          <ShieldAlert className="w-4 h-4" />
          Pending approvals: {approvals.length}
        </div>
      </div>

      <div className="space-y-3">
        {approvals.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            className="glass-panel rounded-xl p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">
                  {item.hitl?.taskName || item.jobType}
                </p>
                <p className="text-xs text-zinc-400 mt-1">
                  {item.hitl?.message || "Approval required"}
                </p>
                <p className="text-[11px] text-zinc-500 mt-2">
                  {new Date(item.createdAt).toLocaleString()} · {item.priority}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => decide(item.id, "approve")}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white"
                  disabled={busyJob === item.id}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Approve
                </Button>
                <Button
                  onClick={() => decide(item.id, "reject")}
                  className="bg-red-600 hover:bg-red-500 text-white"
                  disabled={busyJob === item.id}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
        {!loading && approvals.length === 0 ? (
          <div className="glass-panel rounded-xl p-6 text-sm text-zinc-400">
            No pending high-risk approvals.
          </div>
        ) : null}
      </div>
    </div>
  );
}
