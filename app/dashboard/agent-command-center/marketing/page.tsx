"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import {
  Megaphone,
  Search,
  Target,
  Lightbulb,
  Users,
  BarChart3,
  DollarSign,
  CheckCircle2,
  FileText,
  Palette,
  Rocket,
  PenTool,
  ChevronDown,
  ArrowRight,
  Brain,
  Database,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const HERO_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663115065429/mtrWqgThGD22q2prnyPnHE/marketing-module-Z6L8xBdcNhrFSs5Bw29xEi.webp";

interface WorkflowPhase {
  id: number;
  title: string;
  agent: string;
  icon: LucideIcon;
  color: string;
  description: string;
  steps: string[];
  nexrelTools: string[];
  status: "complete" | "active" | "pending";
}

const phases: WorkflowPhase[] = [
  {
    id: 1,
    title: "Truth Engine",
    agent: "Market Validator",
    icon: Search,
    color: "#F59E0B",
    description:
      "Validates market demand using search behavior, competitive pressure, and audience buying signals.",
    steps: [
      "Scan high-intent terms and demand clusters",
      "Map competitor positioning and spend pressure",
      "Estimate demand quality and urgency",
      "Generate viability score with confidence band",
    ],
    nexrelTools: ["AI Brain", "Knowledge Base", "Advanced Analytics"],
    status: "complete",
  },
  {
    id: 2,
    title: "Pain Finder",
    agent: "Customer Researcher",
    icon: Target,
    color: "#EF4444",
    description:
      "Extracts customer pain language from reviews, forums, and conversation transcripts for direct message-market fit.",
    steps: [
      "Collect pain statements from social and review surfaces",
      "Cluster pains by intensity and frequency",
      "Tag objections and urgency triggers",
      "Rank top pain vectors for offer architecture",
    ],
    nexrelTools: ["AI Brain", "Knowledge Base", "Call Intelligence"],
    status: "complete",
  },
  {
    id: 3,
    title: "Solution Architect",
    agent: "Offer Designer",
    icon: Lightbulb,
    color: "#8B5CF6",
    description:
      "Generates differentiated mechanisms that solve top pains with clear strategic advantages.",
    steps: [
      "Map each pain to mechanism options",
      "Create 3 differentiated solution frameworks",
      "Score uniqueness against competitor claims",
      "Select primary mechanism for campaign narrative",
    ],
    nexrelTools: ["AI Brain", "Offer Memory", "Knowledge Base"],
    status: "active",
  },
  {
    id: 4,
    title: "ICP Definer",
    agent: "Audience Profiler",
    icon: Users,
    color: "#06B6D4",
    description:
      "Builds ICP segments by buying behavior, psychographic intent, and conversion friction profile.",
    steps: [
      "Define high-value segment clusters",
      "Attach trigger events and buying moments",
      "Map objections by role and maturity",
      "Set segmentation rules for routing and messaging",
    ],
    nexrelTools: ["Contact Management", "AI Brain", "Pipeline Intelligence"],
    status: "pending",
  },
  {
    id: 5,
    title: "Competitor Analyst",
    agent: "Intel Gatherer",
    icon: BarChart3,
    color: "#10B981",
    description:
      "Builds comparative dossiers on offers, channels, claims, and pricing posture.",
    steps: [
      "Capture funnel and message patterns",
      "Score positioning overlap and whitespace",
      "Track offer anchors and guarantee framing",
      "Output attack and defend positioning matrix",
    ],
    nexrelTools: ["AI Brain", "Competitor Dossier", "Knowledge Base"],
    status: "pending",
  },
  {
    id: 6,
    title: "GTM Playbook",
    agent: "Strategy Builder",
    icon: Rocket,
    color: "#F97316",
    description:
      "Creates channel sequencing, narrative structure, and launch milestone orchestration.",
    steps: [
      "Define channel order and budget envelopes",
      "Attach message by awareness stage",
      "Design launch milestones and KPIs",
      "Generate execution checkpoints",
    ],
    nexrelTools: ["Workflow Builder", "AI Brain", "Analytics"],
    status: "pending",
  },
  {
    id: 7,
    title: "Pricing Engine",
    agent: "Revenue Optimizer",
    icon: DollarSign,
    color: "#22C55E",
    description:
      "Calculates pricing with margin guardrails, CAC assumptions, and value delivery confidence.",
    steps: [
      "Ingest competitor and CAC signals",
      "Model target margin tiers",
      "Generate package ladder and anchors",
      "Validate price against conversion risk",
    ],
    nexrelTools: ["AI Brain", "Revenue Model", "Offer Validator"],
    status: "pending",
  },
  {
    id: 8,
    title: "Offer Validator",
    agent: "Quality Checker",
    icon: CheckCircle2,
    color: "#14B8A6",
    description:
      "Scores the offer against demand, differentiation, economics, and execution confidence.",
    steps: [
      "Run 12-point validation grid",
      "Flag weak dimensions and risk factors",
      "Recommend revisions by impact",
      "Approve or send back to architecture",
    ],
    nexrelTools: ["Offer Validator", "AI Brain", "Knowledge Base"],
    status: "pending",
  },
  {
    id: 9,
    title: "Master Document",
    agent: "Brain Compiler",
    icon: FileText,
    color: "#6366F1",
    description:
      "Compiles all strategic outputs into one operational brain document for downstream agents.",
    steps: [
      "Merge all prior phase outputs",
      "Normalize language and assumptions",
      "Store versioned master artifact",
      "Distribute to all execution modules",
    ],
    nexrelTools: ["Knowledge Base", "AI Brain", "Reports"],
    status: "pending",
  },
  {
    id: 10,
    title: "Asset Factory",
    agent: "Creative Director",
    icon: Palette,
    color: "#EC4899",
    description:
      "Builds landing pages, VSL angle packs, messaging assets, and sales collateral from the master doc.",
    steps: [
      "Generate offer-aligned creative kit",
      "Create page and deck skeletons",
      "Produce CTA and objection answer bank",
      "Prepare channel variants for launch",
    ],
    nexrelTools: ["Website Builder", "Templates", "AI Content Suite"],
    status: "pending",
  },
  {
    id: 11,
    title: "Campaign Commander",
    agent: "Ad Manager",
    icon: Megaphone,
    color: "#F59E0B",
    description:
      "Creates paid campaign structures, targeting logic, and launch approvals with trust-mode gating.",
    steps: [
      "Build campaign shell and adset structure",
      "Assign audience segments from ICP",
      "Attach creative variants and budget logic",
      "Launch in paused or active mode based on trust policy",
    ],
    nexrelTools: ["Meta Ads API", "Workflow Builder", "AI Brain"],
    status: "pending",
  },
  {
    id: 12,
    title: "Content Publisher",
    agent: "Social Manager",
    icon: PenTool,
    color: "#A855F7",
    description:
      "Creates platform-specific content schedules and routes diagnostics into the self-learning loop.",
    steps: [
      "Generate weekly platform mix",
      "Queue draft-first content workflows",
      "Attach CTA and hook rotation rules",
      "Sync performance feedback to memory",
    ],
    nexrelTools: ["Social APIs", "Knowledge Base", "Workflow Builder"],
    status: "pending",
  },
];

const featureMappings = [
  { ext: "Anthropic / GPT API", nx: "NexRel AI Brain" },
  { ext: "Apollo + Hunter", nx: "Lead Discovery + Enrichment Adapters" },
  { ext: "Asana / Todoist", nx: "NexRel Workflow + Tasks" },
  { ext: "HubSpot CRM", nx: "NexRel Contact + Pipeline" },
  { ext: "Meta Ads Manager", nx: "Meta Campaign Adapter (Trust-Gated)" },
  { ext: "Notion / Docs", nx: "Knowledge Base + Master Offer Doc" },
  { ext: "Social Posting Suites", nx: "Social Loop + Draft Publisher" },
  { ext: "Cron Jobs", nx: "OpenClaw + Scheduler Worker" },
];

export default function MarketingModulePage() {
  const [expandedPhase, setExpandedPhase] = useState<number | null>(3);
  const completedCount = phases.filter((p) => p.status === "complete").length;
  const progress = (completedCount / phases.length) * 100;

  return (
    <div className="min-h-full text-zinc-100">
      <div className="relative h-48 overflow-hidden">
        <img
          src={HERO_IMG}
          alt="Marketing"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/70 to-[#111827]" />
        <div className="relative z-10 flex flex-col justify-end h-full px-8 pb-5">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Megaphone className="w-5 h-5 text-[#F59E0B]" />
              <span className="text-xs font-mono text-[#F59E0B]">
                MODULE 01
              </span>
            </div>
            <h1 className="text-2xl font-bold">Marketing Automation System</h1>
            <p className="text-sm text-zinc-300 mt-1">
              12-phase offer-to-launch engine with autonomous campaign execution
            </p>
          </motion.div>
        </div>
      </div>

      <div className="px-8 py-6 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel rounded-xl p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Build Progress</h2>
            <span className="text-xs font-mono text-amber-400">
              {completedCount}/{phases.length} phases
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-zinc-800 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1 }}
              className="h-full rounded-full bg-gradient-to-r from-[#F59E0B] to-[#EF4444]"
            />
          </div>
        </motion.div>

        <div>
          <h2 className="text-lg font-semibold mb-4">Workflow Phases</h2>
          <div className="relative space-y-3">
            <div className="absolute left-[23px] top-8 bottom-8 w-0.5 bg-gradient-to-b from-[#F59E0B]/60 via-zinc-700 to-zinc-700/30" />
            {phases.map((phase, index) => {
              const isExpanded = expandedPhase === phase.id;
              const Icon = phase.icon;
              return (
                <motion.div
                  key={phase.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.04 }}
                >
                  <div
                    className="relative pl-16 cursor-pointer group"
                    onClick={() =>
                      setExpandedPhase(isExpanded ? null : phase.id)
                    }
                  >
                    <div
                      className={`absolute left-2.5 top-4 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${phase.status === "complete" ? "bg-emerald-400/15 border border-emerald-400/40" : phase.status === "active" ? "bg-amber-500/15 border border-amber-500/50 gold-glow" : "bg-zinc-800 border border-zinc-700"}`}
                    >
                      <Icon
                        className="w-4.5 h-4.5"
                        style={{
                          color:
                            phase.status === "pending"
                              ? "#71717a"
                              : phase.color,
                        }}
                      />
                    </div>
                    <div
                      className={`rounded-xl p-4 transition-all duration-300 ${phase.status === "active" ? "glass-panel gold-glow" : phase.status === "complete" ? "bg-emerald-400/5 border border-emerald-400/15" : "bg-zinc-800/40 border border-zinc-700 hover:border-zinc-600"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                              Phase {String(phase.id).padStart(2, "0")}
                            </span>
                            <h3 className="text-sm font-bold">{phase.title}</h3>
                            <span className="text-[10px] text-zinc-400 italic hidden sm:inline">
                              - {phase.agent}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                            {phase.description}
                          </p>
                        </div>
                        <ChevronDown
                          className={`w-4 h-4 text-zinc-500 shrink-0 mt-1 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        />
                      </div>
                      <motion.div
                        initial={false}
                        animate={{
                          height: isExpanded ? "auto" : 0,
                          opacity: isExpanded ? 1 : 0,
                        }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-4 pt-4 border-t border-zinc-700/70 grid sm:grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                              Build Steps
                            </h4>
                            <div className="space-y-1.5">
                              {phase.steps.map((step, i) => (
                                <div key={i} className="flex items-start gap-2">
                                  <div className="w-4 h-4 rounded flex items-center justify-center bg-zinc-800 shrink-0 mt-0.5">
                                    <span className="text-[9px] font-mono text-zinc-400">
                                      {i + 1}
                                    </span>
                                  </div>
                                  <p className="text-xs text-zinc-400">
                                    {step}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <h4 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                              NexRel Tools Used
                            </h4>
                            <div className="flex flex-wrap gap-1.5">
                              {phase.nexrelTools.map((tool) => (
                                <span
                                  key={tool}
                                  className="text-[10px] font-mono px-2 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-400/20"
                                >
                                  {tool}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <h2 className="text-lg font-semibold mb-4">Tool Integration Map</h2>
          <div className="glass-panel rounded-xl overflow-hidden">
            <div className="grid grid-cols-[1fr_32px_1fr]">
              <div className="px-4 py-2.5 bg-zinc-800/70 text-[11px] font-semibold text-zinc-400 border-b border-zinc-700/60">
                External Tool
              </div>
              <div className="bg-zinc-800/70 border-b border-zinc-700/60" />
              <div className="px-4 py-2.5 bg-zinc-800/70 text-[11px] font-semibold text-amber-300 border-b border-zinc-700/60">
                NexRel Equivalent
              </div>
              {featureMappings.map((m, i) => (
                <motion.div
                  key={i}
                  className="contents"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 + i * 0.03 }}
                >
                  <div className="px-4 py-2.5 text-xs text-zinc-400 border-b border-zinc-700/30">
                    {m.ext}
                  </div>
                  <div className="flex items-center justify-center border-b border-zinc-700/30">
                    <ArrowRight className="w-3 h-3 text-amber-400/60" />
                  </div>
                  <div className="px-4 py-2.5 text-xs text-zinc-100 font-medium border-b border-zinc-700/30">
                    {m.nx}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="grid sm:grid-cols-3 gap-3"
        >
          {[
            {
              icon: Brain,
              title: "AI-First",
              desc: "Every phase is generated and validated by NexRel AI Brain with structured outputs.",
              color: "#F59E0B",
            },
            {
              icon: Database,
              title: "Knowledge Compounds",
              desc: "Each phase output is persisted, versioned, and reused by downstream agents.",
              color: "#14B8A6",
            },
            {
              icon: Workflow,
              title: "Execution-Ready",
              desc: "Workflow Builder receives deterministic tasks aligned to trust mode and risk policy.",
              color: "#A855F7",
            },
          ].map((p) => (
            <div key={p.title} className="glass-panel rounded-xl p-4">
              <p.icon className="w-5 h-5 mb-2" style={{ color: p.color }} />
              <h4 className="text-sm font-semibold">{p.title}</h4>
              <p className="text-xs text-zinc-400 mt-1">{p.desc}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
