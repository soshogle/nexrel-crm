"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Megaphone,
  DollarSign,
  Share2,
  ArrowRight,
  Brain,
  Workflow,
  Users,
  TrendingUp,
  Database,
  Shield,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AgentCard } from "@/components/command-center/agent-card";

const HERO_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663115065429/mtrWqgThGD22q2prnyPnHE/hero-command-center-MxausxPUjV4675HoDBXEdz.webp";

type AutonomySnapshot = {
  brain: {
    contactsAndLeads: number;
    deals: number;
    pipelineStages: number;
    knowledgeBaseEntries: number;
    selfLearningSignals: number;
  };
  integrations: Record<string, boolean>;
  workflowEngine: {
    activeWorkflowInstances: number;
    executionsLast24h: number;
    successRateLast24h: number;
  };
  trustFramework: {
    mode: "crawl" | "walk" | "run";
    pendingApprovals: number;
    lastUpdatedAt: string | null;
  };
  ownerControl: {
    status: "running" | "paused" | "stopped";
    modules: { marketing: boolean; sales: boolean; social: boolean };
    channels: {
      email: boolean;
      sms: boolean;
      voice: boolean;
      ads: boolean;
      social: boolean;
    };
    windows: {
      enabled: boolean;
      timezone: string;
      days: number[];
      startHour: number;
      endHour: number;
    };
    caps: {
      dailyTasks: number;
      dailyEmails: number;
      dailySms: number;
      dailyPosts: number;
      dailyAdLaunches: number;
    };
    updatedAt: string | null;
  };
};

const modules = [
  {
    path: "/dashboard/agent-command-center/marketing",
    title: "Marketing Automation",
    subtitle: "12 Phases | Offer-to-Launch",
    description:
      "Truth Engine through Campaign Commander with autonomous planning and launch execution.",
    icon: Megaphone,
    color: "#F59E0B",
    image:
      "https://d2xsxph8kpxj0f.cloudfront.net/310519663115065429/mtrWqgThGD22q2prnyPnHE/marketing-module-Z6L8xBdcNhrFSs5Bw29xEi.webp",
  },
  {
    path: "/dashboard/agent-command-center/sales",
    title: "Autonomous Sales",
    subtitle: "6 AI Agents | Inbound + Outbound",
    description:
      "Lead discovery, qualification, voice calls, follow-up sequences, and pipeline automation.",
    icon: DollarSign,
    color: "#14B8A6",
    image:
      "https://d2xsxph8kpxj0f.cloudfront.net/310519663115065429/mtrWqgThGD22q2prnyPnHE/sales-module-7zmLoPZKg96dDAtod6muTx.webp",
  },
  {
    path: "/dashboard/agent-command-center/social",
    title: "Social Media Content",
    subtitle: "8 Phases | Larry Loop",
    description:
      "Content generation, draft-first publishing, diagnostics, hook rotation, and cross-platform scaling.",
    icon: Share2,
    color: "#A855F7",
    image:
      "https://d2xsxph8kpxj0f.cloudfront.net/310519663115065429/mtrWqgThGD22q2prnyPnHE/social-module-nayePQbmmuyM2sXVJMVeew.webp",
  },
];

const agents = [
  {
    name: "Alfred",
    role: "Chief of Staff",
    icon: Brain,
    status: "online" as const,
    tasks: 4,
    color: "#F59E0B",
  },
  {
    name: "Green Arrow",
    role: "Outbound Lead Gen",
    icon: Users,
    status: "online" as const,
    tasks: 3,
    color: "#14B8A6",
  },
  {
    name: "Oracle",
    role: "Inbound Qualification",
    icon: Shield,
    status: "idle" as const,
    tasks: 2,
    color: "#A78BFA",
  },
  {
    name: "Larry",
    role: "Social Content",
    icon: Share2,
    status: "online" as const,
    tasks: 5,
    color: "#FB923C",
  },
  {
    name: "Helios",
    role: "Referrals & Expansion",
    icon: TrendingUp,
    status: "building" as const,
    tasks: 2,
    color: "#10B981",
  },
  {
    name: "Curator",
    role: "Creative Intelligence",
    icon: Megaphone,
    status: "building" as const,
    tasks: 2,
    color: "#F43F5E",
  },
];

export default function AgentCommandCenterPage() {
  const [snapshot, setSnapshot] = useState<AutonomySnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [enableExternal, setEnableExternal] = useState(true);
  const [allowPaidLaunch, setAllowPaidLaunch] = useState(false);
  const [lastRunResult, setLastRunResult] = useState<any>(null);
  const [savingControl, setSavingControl] = useState(false);

  const loadSnapshot = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/agent-command-center/autonomy");
      const data = await res.json();
      if (data?.success) setSnapshot(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSnapshot();
  }, []);

  const setMode = async (mode: "crawl" | "walk" | "run") => {
    await fetch("/api/agent-command-center/autonomy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_mode", mode }),
    });
    await loadSnapshot();
  };

  const runCycle = async () => {
    const res = await fetch("/api/agent-command-center/autonomy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "run_cycle",
        enableExternal,
        allowPaidLaunch,
      }),
    });
    const data = await res.json().catch(() => null);
    setLastRunResult(data);
    await loadSnapshot();
  };

  const updateControl = async (payload: any) => {
    setSavingControl(true);
    try {
      await fetch("/api/agent-command-center/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      await loadSnapshot();
    } finally {
      setSavingControl(false);
    }
  };

  const controlStatus = snapshot?.ownerControl?.status || "running";

  const stats = [
    {
      label: "Active Workflows",
      value: String(snapshot?.workflowEngine.activeWorkflowInstances ?? 0),
      icon: Workflow,
    },
    {
      label: "AI Agents Online",
      value: `${agents.filter((a) => a.status === "online").length}/6`,
      icon: Brain,
    },
    {
      label: "Knowledge Base Items",
      value: String(snapshot?.brain.knowledgeBaseEntries ?? 0),
      icon: Database,
    },
    {
      label: "Lead Graph",
      value: String(snapshot?.brain.contactsAndLeads ?? 0),
      icon: Users,
    },
  ];

  return (
    <div className="min-h-full text-zinc-100">
      <div className="relative h-64 overflow-hidden">
        <img
          src={HERO_IMG}
          alt="Command Center"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/60 to-[#111827]" />
        <div className="relative z-10 flex flex-col justify-end h-full px-8 pb-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-3xl font-bold">Agent Command Center</h1>
            <p className="text-sm text-zinc-300 mt-1 max-w-2xl">
              Exact NexRel war-room replication with real backend state,
              workflow execution, API integrations, and trust-mode autonomy
              controls.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="px-8 py-6 space-y-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06 }}
              className="glass-panel rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className="w-4 h-4 text-amber-400" />
                <span className="text-[11px] text-zinc-400">{stat.label}</span>
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
            </motion.div>
          ))}
        </div>

        <div className="glass-panel rounded-xl p-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold">Trust Framework</h2>
              <p className="text-xs text-zinc-400 mt-1">
                Crawl drafts everything, Walk executes low-risk tasks, Run
                queues full autonomous follow-up.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {(["crawl", "walk", "run"] as const).map((mode) => (
                <Button
                  key={mode}
                  variant={
                    snapshot?.trustFramework.mode === mode
                      ? "default"
                      : "outline"
                  }
                  onClick={() => setMode(mode)}
                  className={
                    snapshot?.trustFramework.mode === mode
                      ? "bg-amber-500 text-zinc-900 hover:bg-amber-400"
                      : "border-zinc-600 text-zinc-200"
                  }
                >
                  {mode.toUpperCase()}
                </Button>
              ))}
              <Button
                onClick={runCycle}
                className="bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Run Cycle
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-6 mt-3 text-xs text-zinc-300">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={enableExternal}
                onChange={(e) => setEnableExternal(e.target.checked)}
              />
              Enable external adapters (Apollo/Hunter/Meta/Social)
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={allowPaidLaunch}
                onChange={(e) => setAllowPaidLaunch(e.target.checked)}
              />
              Allow paid launch in RUN mode
            </label>
          </div>
          <p className="text-xs text-zinc-400 mt-3">
            Pending approvals:{" "}
            <span className="text-zinc-200">
              {snapshot?.trustFramework.pendingApprovals ?? 0}
            </span>{" "}
            · Last 24h execution success:{" "}
            <span className="text-zinc-200">
              {snapshot?.workflowEngine.successRateLast24h ?? 100}%
            </span>
          </p>
        </div>

        <div className="glass-panel rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold">
                Owner Oversight Controls
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Status:{" "}
                <span
                  className={
                    controlStatus === "running"
                      ? "text-emerald-300"
                      : controlStatus === "paused"
                        ? "text-amber-300"
                        : "text-red-300"
                  }
                >
                  {controlStatus.toUpperCase()}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => updateControl({ action: "resume" })}
                className="bg-emerald-600 hover:bg-emerald-500 text-white"
                disabled={savingControl}
              >
                Resume
              </Button>
              <Button
                onClick={() => updateControl({ action: "pause" })}
                className="bg-amber-600 hover:bg-amber-500 text-white"
                disabled={savingControl}
              >
                Pause
              </Button>
              <Button
                onClick={() =>
                  updateControl({
                    action: "stop",
                    reason: "owner_emergency_stop",
                  })
                }
                className="bg-red-600 hover:bg-red-500 text-white"
                disabled={savingControl}
              >
                Stop
              </Button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-zinc-700 bg-zinc-900/50 p-3">
              <h3 className="text-sm font-semibold mb-2">Module Controls</h3>
              <div className="space-y-2 text-xs">
                {(
                  [
                    ["marketing", snapshot?.ownerControl?.modules?.marketing],
                    ["sales", snapshot?.ownerControl?.modules?.sales],
                    ["social", snapshot?.ownerControl?.modules?.social],
                  ] as const
                ).map(([key, enabled]) => (
                  <label
                    key={key}
                    className="inline-flex items-center gap-2 mr-4"
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(enabled)}
                      onChange={(e) =>
                        updateControl({
                          action: "patch",
                          policy: { modules: { [key]: e.target.checked } },
                          reason: `owner_toggle_module_${key}`,
                        })
                      }
                    />
                    <span className="capitalize">{key}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-zinc-700 bg-zinc-900/50 p-3">
              <h3 className="text-sm font-semibold mb-2">Channel Controls</h3>
              <div className="space-y-2 text-xs">
                {(
                  [
                    ["email", snapshot?.ownerControl?.channels?.email],
                    ["sms", snapshot?.ownerControl?.channels?.sms],
                    ["voice", snapshot?.ownerControl?.channels?.voice],
                    ["ads", snapshot?.ownerControl?.channels?.ads],
                    ["social", snapshot?.ownerControl?.channels?.social],
                  ] as const
                ).map(([key, enabled]) => (
                  <label
                    key={key}
                    className="inline-flex items-center gap-2 mr-4"
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(enabled)}
                      onChange={(e) =>
                        updateControl({
                          action: "patch",
                          policy: { channels: { [key]: e.target.checked } },
                          reason: `owner_toggle_channel_${key}`,
                        })
                      }
                    />
                    <span className="capitalize">{key}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {lastRunResult?.external?.enabled && (
          <div className="glass-panel rounded-xl p-5">
            <h3 className="text-sm font-semibold mb-2">
              Last External Adapter Execution
            </h3>
            <div className="grid md:grid-cols-2 gap-2">
              {Array.isArray(lastRunResult?.external?.results)
                ? lastRunResult.external.results.map((result: any) => (
                    <div
                      key={result.integration}
                      className="rounded-lg border border-zinc-700 bg-zinc-900/50 p-3"
                    >
                      <p className="text-xs font-semibold text-zinc-100">
                        {result.integration}
                      </p>
                      <p
                        className={`text-[11px] mt-1 ${result.status === "executed" ? "text-emerald-300" : result.status === "skipped" ? "text-amber-300" : "text-red-300"}`}
                      >
                        {result.status.toUpperCase()}
                      </p>
                      <p className="text-[11px] text-zinc-400 mt-1">
                        {result.detail}
                      </p>
                    </div>
                  ))
                : null}
            </div>
          </div>
        )}

        <div className="glass-panel rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-3">Integration Readiness</h2>
          <div className="grid grid-cols-[1.2fr_0.8fr] gap-0 text-xs">
            <div className="px-3 py-2 bg-zinc-800/70 text-zinc-400 border-b border-zinc-700">
              Integration
            </div>
            <div className="px-3 py-2 bg-zinc-800/70 text-zinc-400 border-b border-zinc-700">
              Status
            </div>
            {[
              ["Apollo", snapshot?.integrations.apollo],
              ["Hunter", snapshot?.integrations.hunter],
              ["Meta Ads", snapshot?.integrations.metaAds],
              ["Instagram", snapshot?.integrations.instagram],
              ["TikTok", snapshot?.integrations.tiktok],
              ["LinkedIn", snapshot?.integrations.linkedin],
            ].map(([name, ready]) => (
              <div key={String(name)} className="contents">
                <div className="px-3 py-2 border-b border-zinc-700/40 text-zinc-300">
                  {name}
                </div>
                <div className="px-3 py-2 border-b border-zinc-700/40">
                  <span
                    className={ready ? "text-emerald-300" : "text-amber-300"}
                  >
                    {ready ? "Connected" : "Not configured"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4">System Modules</h2>
          <div className="grid lg:grid-cols-3 gap-4">
            {modules.map((mod, index) => (
              <Link key={mod.path} href={mod.path}>
                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.08 }}
                  whileHover={{ y: -4 }}
                  className="glass-panel rounded-xl overflow-hidden group cursor-pointer"
                >
                  <div className="relative h-36 overflow-hidden">
                    <img
                      src={mod.image}
                      alt={mod.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#111827] via-[#111827]/50 to-transparent" />
                    <div className="absolute bottom-3 left-4 right-4">
                      <div className="flex items-center gap-2">
                        <mod.icon
                          className="w-5 h-5"
                          style={{ color: mod.color }}
                        />
                        <h3 className="text-base font-bold">{mod.title}</h3>
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-0.5">
                        {mod.subtitle}
                      </p>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {mod.description}
                    </p>
                    <div className="flex items-center gap-1 mt-3 text-amber-400 text-xs font-medium">
                      <span>Open Module</span>
                      <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4">AI Agent Squad</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {agents.map((agent, index) => (
              <motion.div
                key={agent.name}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 + index * 0.06 }}
              >
                <AgentCard {...agent} />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
