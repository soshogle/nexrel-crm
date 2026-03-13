"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import Link from "next/link";
import {
  Share2,
  Search,
  PenTool,
  FileText,
  BarChart3,
  RefreshCw,
  Target,
  Globe,
  Database,
  ChevronDown,
  ArrowRight,
  Eye,
  MousePointer,
  Heart,
  Repeat,
  TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const HERO_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663115065429/mtrWqgThGD22q2prnyPnHE/social-module-nayePQbmmuyM2sXVJMVeew.webp";

interface ContentPhase {
  id: number;
  title: string;
  icon: LucideIcon;
  color: string;
  description: string;
  steps: string[];
  nexrelTools: string[];
}

const contentPhases: ContentPhase[] = [
  {
    id: 1,
    title: "Niche Research & Setup",
    icon: Search,
    color: "#F59E0B",
    description:
      "Initialize Larry agent memory, hook libraries, and content pillars grounded in niche performance signals.",
    steps: [
      "Seed brand voice and prior winners",
      "Analyze top format/hook patterns",
      "Define initial pillar stack and schedule",
      "Create baseline hypothesis set",
    ],
    nexrelTools: ["AI Employees", "Knowledge Base", "AI Brain"],
  },
  {
    id: 2,
    title: "Content Creation Engine",
    icon: PenTool,
    color: "#8B5CF6",
    description:
      "Generate daily carousel/video concepts with structure, hooks, and CTA variants.",
    steps: [
      "Select hook by 60/30/10 rotation",
      "Produce visual and copy variants",
      "Generate captions and hashtag sets",
      "Create platform-specific derivatives",
    ],
    nexrelTools: ["AI Content Suite", "AI Brain", "Templates"],
  },
  {
    id: 3,
    title: "Draft-First Publishing",
    icon: FileText,
    color: "#14B8A6",
    description:
      "Posts are queued as drafts first to preserve control and platform-native finishing touches.",
    steps: [
      "Queue draft payload per channel",
      "Notify operator for final review",
      "Capture final publish metadata",
      "Store post IDs for diagnostics",
    ],
    nexrelTools: ["Workflow Builder", "Notifications", "Social Connectors"],
  },
  {
    id: 4,
    title: "Diagnostic Engine",
    icon: BarChart3,
    color: "#EF4444",
    description:
      "Runs 24h/72h diagnostics to explain performance outcomes and trigger strategic corrections.",
    steps: [
      "Collect engagement and conversion metrics",
      "Run symptom-diagnosis mapping",
      "Tag root causes and likely interventions",
      "Push adjustments back into creation loop",
    ],
    nexrelTools: ["Advanced Analytics", "AI Brain", "Knowledge Base"],
  },
  {
    id: 5,
    title: "Hook Rotation & CTA Evolution",
    icon: RefreshCw,
    color: "#F97316",
    description:
      "Rotates hooks and CTA patterns automatically to fight fatigue and improve conversion quality.",
    steps: [
      "Maintain hook score board",
      "Detect fatigue after trend degradation",
      "Promote emergent winners",
      "Retire weak patterns",
    ],
    nexrelTools: ["AI Brain", "Memory Store", "Workflow Rules"],
  },
  {
    id: 6,
    title: "Goal Tracking & Conversions",
    icon: Target,
    color: "#10B981",
    description:
      "Connects content events to leads, deals, and revenue attribution in CRM.",
    steps: [
      "Attach UTM and source telemetry",
      "Map engagement to pipeline outcomes",
      "Compute ROI by content pillar",
      "Feed conversion winners into planning",
    ],
    nexrelTools: ["Pipeline", "Analytics", "Attribution"],
  },
  {
    id: 7,
    title: "Multi-Platform Expansion",
    icon: Globe,
    color: "#6366F1",
    description:
      "Repurposes primary assets for TikTok, Instagram, LinkedIn, YouTube Shorts, and X.",
    steps: [
      "Reformat and resize by platform",
      "Adjust copy length and CTA style",
      "Schedule by platform timing profile",
      "Track per-platform performance variance",
    ],
    nexrelTools: ["Social APIs", "AI Content Suite", "Workflow Builder"],
  },
  {
    id: 8,
    title: "Memory & Self-Learning",
    icon: Database,
    color: "#A855F7",
    description:
      "Creates durable content intelligence with weekly backups and model feedback loops.",
    steps: [
      "Snapshot weekly performance memory",
      "Generate content intelligence report",
      "Update winning pattern priors",
      "Distribute learnings to marketing and sales",
    ],
    nexrelTools: ["Knowledge Base", "Reports", "AI Brain"],
  },
];

const diagnosticTable = [
  {
    symptom: "Low Views",
    diagnosis: "Weak Hook",
    fix: "Test pattern interrupts and tighter first-line claims.",
    icon: Eye,
    color: "#EF4444",
  },
  {
    symptom: "High Views, Low Likes",
    diagnosis: "Body Value Gap",
    fix: "Increase practical utility in mid-content frames.",
    icon: Heart,
    color: "#F97316",
  },
  {
    symptom: "High Likes, Low Shares",
    diagnosis: "Low Shareability",
    fix: "Add perspective hooks and audience-identity framing.",
    icon: Repeat,
    color: "#F59E0B",
  },
  {
    symptom: "High Views, Low Follows",
    diagnosis: "Identity CTA Missing",
    fix: "Attach audience-specific follow CTA with authority cue.",
    icon: MousePointer,
    color: "#8B5CF6",
  },
  {
    symptom: "High Engagement, Low Conversions",
    diagnosis: "CTA Friction",
    fix: "Simplify call-to-action and shorten conversion path.",
    icon: Target,
    color: "#14B8A6",
  },
  {
    symptom: "Views Declining Over Time",
    diagnosis: "Hook Fatigue",
    fix: "Rotate hooks faster and reset visual style.",
    icon: TrendingUp,
    color: "#6366F1",
  },
];

const loopSteps = [
  { label: "Research", icon: Search, color: "#F59E0B" },
  { label: "Create", icon: PenTool, color: "#8B5CF6" },
  { label: "Draft", icon: FileText, color: "#14B8A6" },
  { label: "Analyze", icon: BarChart3, color: "#EF4444" },
  { label: "Optimize", icon: RefreshCw, color: "#F97316" },
  { label: "Scale", icon: Globe, color: "#6366F1" },
];

export default function SocialModulePage() {
  const [expandedPhase, setExpandedPhase] = useState<number | null>(2);

  return (
    <div className="min-h-full text-zinc-100">
      <div className="relative h-48 overflow-hidden">
        <img
          src={HERO_IMG}
          alt="Social"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/70 to-[#111827]" />
        <div className="relative z-10 flex flex-col justify-end h-full px-8 pb-5">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Share2 className="w-5 h-5 text-[#A855F7]" />
              <span className="text-xs font-mono text-[#A855F7]">
                MODULE 03
              </span>
            </div>
            <h1 className="text-2xl font-bold">Social Media Content System</h1>
            <p className="text-sm text-zinc-300 mt-1">
              The Larry Loop - autonomous content creation, publishing, and
              optimization
            </p>
          </motion.div>
        </div>
      </div>

      <div className="px-8 py-6 space-y-8">
        <div className="glass-panel rounded-xl p-5 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold">Go Viral Studio</h2>
            <p className="text-xs text-zinc-400 mt-1">
              Approve, regenerate, and learn from image/video drafts powered by
              Nexrel AI viral mandate loops.
            </p>
          </div>
          <Link href="/dashboard/agent-command-center/social/go-viral">
            <button className="px-4 py-2 rounded-lg bg-amber-500 text-zinc-900 text-sm font-semibold hover:bg-amber-400 transition-colors">
              Open Go Viral
            </button>
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-lg font-semibold mb-4">The Larry Loop</h2>
          <div className="glass-panel rounded-xl p-6">
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {loopSteps.map((step, i) => (
                <motion.div
                  key={step.label}
                  className="flex items-center gap-2"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 + i * 0.08 }}
                >
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center"
                      style={{
                        backgroundColor: `${step.color}15`,
                        border: `1px solid ${step.color}35`,
                      }}
                    >
                      <step.icon
                        className="w-6 h-6"
                        style={{ color: step.color }}
                      />
                    </div>
                    <span className="text-[10px] font-semibold">
                      {step.label}
                    </span>
                  </div>
                  {i < loopSteps.length - 1 && (
                    <ArrowRight className="w-4 h-4 text-zinc-500/50 mb-5" />
                  )}
                </motion.div>
              ))}
            </div>
            <p className="text-xs text-zinc-400 text-center mt-4">
              Continuous intelligence cycle: every iteration sharpens the next
            </p>
          </div>
        </motion.div>

        <div>
          <h2 className="text-lg font-semibold mb-4">System Phases</h2>
          <div className="space-y-3">
            {contentPhases.map((phase, index) => {
              const isExpanded = expandedPhase === phase.id;
              const Icon = phase.icon;
              return (
                <motion.div
                  key={phase.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + index * 0.05 }}
                >
                  <div
                    className={`rounded-xl transition-all duration-300 cursor-pointer ${isExpanded ? "glass-panel" : "bg-zinc-800/40 border border-zinc-700"}`}
                    onClick={() =>
                      setExpandedPhase(isExpanded ? null : phase.id)
                    }
                  >
                    <div className="flex items-center gap-4 p-4">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: `${phase.color}15`,
                          border: `1px solid ${phase.color}30`,
                        }}
                      >
                        <Icon
                          className="w-5 h-5"
                          style={{ color: phase.color }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                            {String(phase.id).padStart(2, "0")}
                          </span>
                          <h3 className="text-sm font-bold">{phase.title}</h3>
                        </div>
                        <p className="text-xs text-zinc-400 mt-0.5 truncate">
                          {phase.description}
                        </p>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-zinc-500 shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
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
                      <div className="px-4 pb-4 space-y-4">
                        <p className="text-xs text-zinc-400 leading-relaxed border-t border-zinc-700/60 pt-4">
                          {phase.description}
                        </p>
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                              Build Steps
                            </h4>
                            <div className="space-y-1.5">
                              {phase.steps.map((step, i) => (
                                <div key={i} className="flex items-start gap-2">
                                  <div className="w-5 h-5 rounded flex items-center justify-center bg-purple-500/10 shrink-0 mt-0.5">
                                    <span className="text-[9px] font-mono text-purple-300 font-bold">
                                      {i + 1}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                                    {step}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <h4 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                              NexRel Tools
                            </h4>
                            <div className="flex flex-wrap gap-1.5">
                              {phase.nexrelTools.map((tool) => (
                                <span
                                  key={tool}
                                  className="text-[10px] font-mono px-2 py-1 rounded-lg bg-purple-500/10 text-purple-200 border border-purple-400/20"
                                >
                                  {tool}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
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
          <h2 className="text-lg font-semibold mb-4">Diagnostic Framework</h2>
          <p className="text-xs text-zinc-400 mb-3">
            The AI uses this framework to diagnose post performance and
            auto-adjust strategy.
          </p>
          <div className="glass-panel rounded-xl overflow-hidden">
            <div className="grid grid-cols-[1fr_1fr_2fr] gap-0">
              <div className="px-4 py-2.5 bg-zinc-800/70 text-[11px] font-semibold text-zinc-400 border-b border-zinc-700/60">
                Symptom
              </div>
              <div className="px-4 py-2.5 bg-zinc-800/70 text-[11px] font-semibold text-red-300 border-b border-zinc-700/60">
                Diagnosis
              </div>
              <div className="px-4 py-2.5 bg-zinc-800/70 text-[11px] font-semibold text-purple-300 border-b border-zinc-700/60">
                Auto-Fix
              </div>
            </div>
            {diagnosticTable.map((row, i) => {
              const Icon = row.icon;
              return (
                <motion.div
                  key={i}
                  className="grid grid-cols-[1fr_1fr_2fr] gap-0"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.55 + i * 0.05 }}
                >
                  <div className="px-4 py-3 border-b border-zinc-700/30 flex items-center gap-2">
                    <Icon
                      className="w-3.5 h-3.5 shrink-0"
                      style={{ color: row.color }}
                    />
                    <span className="text-xs font-medium">{row.symptom}</span>
                  </div>
                  <div className="px-4 py-3 border-b border-zinc-700/30">
                    <span className="text-xs text-red-300 font-medium">
                      {row.diagnosis}
                    </span>
                  </div>
                  <div className="px-4 py-3 border-b border-zinc-700/30">
                    <span className="text-xs text-zinc-400">{row.fix}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
