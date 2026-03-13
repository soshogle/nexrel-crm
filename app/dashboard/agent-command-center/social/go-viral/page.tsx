"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Flame,
  RefreshCw,
  ImageIcon,
  Video,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Users,
  Sparkles,
} from "lucide-react";

type ViralAsset = {
  jobId: string;
  createdAt: string;
  asset: {
    kind: "image" | "video";
    model: "nanobanana" | "gemini_pro";
    prompt: string;
    hook: string;
    caption: string;
    status: "draft" | "approved" | "rejected";
    url: string;
    providerStatus: string;
    performance?: {
      views?: number;
      engagementRate?: number;
      leads?: number;
    } | null;
  } | null;
};

export default function GoViralPage() {
  const [assets, setAssets] = useState<ViralAsset[]>([]);
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [objective, setObjective] = useState(
    "Generate more qualified leads this week",
  );
  const [product, setProduct] = useState("NexRel CRM services");
  const [audience, setAudience] = useState("SMB founders and operators");
  const [kind, setKind] = useState<"image" | "video">("image");
  const [model, setModel] = useState<"nanobanana" | "gemini_pro">("nanobanana");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/agent-command-center/go-viral");
      const data = await res.json();
      setAssets(Array.isArray(data?.assets) ? data.assets : []);
      setInsights(data?.insights || null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const generate = async () => {
    setBusyId("generate");
    try {
      await fetch("/api/agent-command-center/go-viral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          objective,
          product,
          audience,
          kind,
          model,
        }),
      });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const act = async (jobId: string, action: string, extra?: any) => {
    setBusyId(jobId + action);
    try {
      await fetch("/api/agent-command-center/go-viral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, jobId, ...extra }),
      });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const stats = useMemo(
    () => [
      {
        label: "Approval Rate",
        value: `${insights?.approvalRate ?? 0}%`,
        icon: CheckCircle2,
      },
      {
        label: "Recent Leads",
        value: String(insights?.recentLeads ?? 0),
        icon: Users,
      },
      {
        label: "Leads From Content",
        value: String(insights?.leadsFromContent ?? 0),
        icon: TrendingUp,
      },
      {
        label: "Sentiment Pulse",
        value: String(insights?.sentiment || "mixed"),
        icon: Sparkles,
      },
    ],
    [insights],
  );

  const tabClass = (active: boolean) =>
    active
      ? "px-4 py-2 rounded-lg bg-amber-500 text-zinc-900 text-sm font-semibold hover:bg-amber-400 transition-colors"
      : "px-4 py-2 rounded-lg border border-zinc-600 text-zinc-200 text-sm font-semibold hover:bg-zinc-800/70 transition-colors";

  const actionClass =
    "px-4 py-2 rounded-lg bg-amber-500 text-zinc-900 text-sm font-semibold hover:bg-amber-400 transition-colors";
  const secondaryClass =
    "px-4 py-2 rounded-lg border border-zinc-600 text-zinc-200 text-sm font-semibold hover:bg-zinc-800/70 transition-colors";

  return (
    <div className="min-h-full text-zinc-100 px-8 py-6 space-y-6">
      <div className="glass-panel rounded-xl p-5">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-amber-400" />
          <h1 className="text-2xl font-bold">Go Viral</h1>
        </div>
        <p className="text-xs text-zinc-400 mt-1">
          Nexrel AI runs your viral mandate: generate, test, learn, and optimize
          content to convert attention into leads.
        </p>
      </div>

      <div className="grid md:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="glass-panel rounded-xl p-4">
            <div className="flex items-center gap-2 text-zinc-400 text-[11px]">
              <s.icon className="w-4 h-4 text-amber-300" />
              {s.label}
            </div>
            <p className="text-xl font-bold mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="glass-panel rounded-xl p-5 space-y-3">
        <h2 className="text-lg font-semibold">Create Viral Asset</h2>
        <div className="grid md:grid-cols-3 gap-3">
          <input
            className="rounded-lg bg-zinc-900/70 border border-zinc-700 px-3 py-2 text-sm"
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder="Objective"
          />
          <input
            className="rounded-lg bg-zinc-900/70 border border-zinc-700 px-3 py-2 text-sm"
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            placeholder="Product"
          />
          <input
            className="rounded-lg bg-zinc-900/70 border border-zinc-700 px-3 py-2 text-sm"
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            placeholder="Audience"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="ghost"
            onClick={() => setKind("image")}
            className={tabClass(kind === "image")}
          >
            Image
          </Button>
          <Button
            variant="ghost"
            onClick={() => setKind("video")}
            className={tabClass(kind === "video")}
          >
            Video
          </Button>
          <Button
            variant="ghost"
            onClick={() => setModel("nanobanana")}
            className={tabClass(model === "nanobanana")}
          >
            NanoBanana
          </Button>
          <Button
            variant="ghost"
            onClick={() => setModel("gemini_pro")}
            className={tabClass(model === "gemini_pro")}
          >
            Gemini Pro
          </Button>
          <Button onClick={generate} className={actionClass}>
            {busyId === "generate" ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : null}
            Generate
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {assets.map((item, idx) => {
          const asset = item.asset;
          if (!asset) return null;
          const isBusy = busyId?.startsWith(item.jobId);
          return (
            <motion.div
              key={item.jobId}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="glass-panel rounded-xl p-4"
            >
              <div className="grid lg:grid-cols-[220px_1fr] gap-4">
                <div className="rounded-lg overflow-hidden border border-zinc-700 bg-zinc-900/50 h-44">
                  <img
                    src={asset.url}
                    alt="Viral draft"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono px-2 py-1 rounded bg-zinc-800 text-zinc-300">
                      {asset.kind === "video" ? (
                        <Video className="w-3 h-3 inline mr-1" />
                      ) : (
                        <ImageIcon className="w-3 h-3 inline mr-1" />
                      )}
                      {asset.kind}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-1 rounded bg-zinc-800 text-zinc-300">
                      {asset.model}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-1 rounded ${asset.status === "approved" ? "bg-emerald-500/20 text-emerald-300" : asset.status === "rejected" ? "bg-red-500/20 text-red-300" : "bg-amber-500/20 text-amber-300"}`}
                    >
                      {asset.status}
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      {new Date(item.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm font-semibold">Hook: {asset.hook}</p>
                  <p className="text-xs text-zinc-400">{asset.caption}</p>
                  <p className="text-[11px] text-zinc-500 line-clamp-2">
                    Prompt: {asset.prompt}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap pt-2">
                    <Button
                      disabled={!!isBusy}
                      onClick={() => act(item.jobId, "approve")}
                      className={actionClass}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      disabled={!!isBusy}
                      onClick={() => act(item.jobId, "reject")}
                      className={secondaryClass}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Reject
                    </Button>
                    <Button
                      disabled={!!isBusy}
                      onClick={() =>
                        act(item.jobId, "regenerate", { model: asset.model })
                      }
                      variant="ghost"
                      className={secondaryClass}
                    >
                      <RefreshCw className="w-4 h-4 mr-1" />
                      Regenerate
                    </Button>
                    <Button
                      disabled={!!isBusy}
                      onClick={() =>
                        act(item.jobId, "record_performance", {
                          views: 1200,
                          engagementRate: 8.4,
                          leads: 3,
                        })
                      }
                      variant="ghost"
                      className={secondaryClass}
                    >
                      Log Performance
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
        {!loading && assets.length === 0 ? (
          <div className="glass-panel rounded-xl p-6 text-sm text-zinc-400">
            No viral assets yet. Generate your first draft.
          </div>
        ) : null}
      </div>
    </div>
  );
}
