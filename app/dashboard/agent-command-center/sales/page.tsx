"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import {
  DollarSign,
  Brain,
  Mail,
  Shield,
  TrendingUp,
  Megaphone,
  ChevronDown,
  Zap,
  Clock,
  Target,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const HERO_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663115065429/mtrWqgThGD22q2prnyPnHE/sales-module-7zmLoPZKg96dDAtod6muTx.webp";

interface SalesAgent {
  id: string;
  name: string;
  codename: string;
  icon: LucideIcon;
  color: string;
  role: string;
  description: string;
  workflows: { title: string; steps: string[] }[];
  nexrelTools: string[];
  status: "online" | "idle" | "building";
}

const salesAgents: SalesAgent[] = [
  {
    id: "alfred",
    name: "Alfred",
    codename: "Chief of Staff",
    icon: Brain,
    color: "#F59E0B",
    role: "Knowledge Base Manager + Daily Briefer",
    description:
      "Maintains strategy memory, briefing context, and self-learning updates from wins and losses.",
    workflows: [
      {
        title: "Knowledge Ops",
        steps: [
          "Normalize business context and winning plays",
          "Version strategic assets and objections",
          "Distribute context to all active agents",
        ],
      },
      {
        title: "Daily Briefing",
        steps: [
          "Identify stale opportunities",
          "Prioritize high-probability follow-ups",
          "Escalate at-risk deals for review",
        ],
      },
    ],
    nexrelTools: ["Knowledge Base", "AI Brain", "Workflow Builder"],
    status: "online",
  },
  {
    id: "greenarrow",
    name: "Green Arrow + Flash",
    codename: "Outbound Squad",
    icon: Mail,
    color: "#14B8A6",
    role: "Lead Discovery + Personalized Outreach",
    description:
      "Runs Apollo discovery, Hunter enrichment, and outbound sequence generation with trust-mode controls.",
    workflows: [
      {
        title: "Discovery + Enrichment",
        steps: [
          "Search Apollo for ICP-aligned prospects",
          "Run Hunter enrichment for missing emails",
          "Score quality and intent before routing",
        ],
      },
      {
        title: "Outreach Engine",
        steps: [
          "Draft personalized email by segment",
          "Queue follow-up sequence logic",
          "Escalate warm replies to qualification",
        ],
      },
    ],
    nexrelTools: ["Apollo Adapter", "Hunter Adapter", "Email/SMS"],
    status: "online",
  },
  {
    id: "oracle",
    name: "Oracle",
    codename: "Inbound Qualifier",
    icon: Shield,
    color: "#A855F7",
    role: "Inbound Lead Scoring + Voice Qualification",
    description:
      "Routes inbound leads by qualification score and initiates voice qualification for hot intent.",
    workflows: [
      {
        title: "Qualification",
        steps: [
          "Score against ICP and urgency",
          "Route hot leads to immediate voice flow",
          "Book meetings and sync CRM fields",
        ],
      },
    ],
    nexrelTools: ["Voice AI", "Contact Graph", "Calendar"],
    status: "idle",
  },
  {
    id: "helios",
    name: "Helios",
    codename: "Growth Engine",
    icon: TrendingUp,
    color: "#10B981",
    role: "Reviews, Referrals, Expansion Revenue",
    description:
      "Triggers post-delivery review/referral loops and surfaces expansion opportunities.",
    workflows: [
      {
        title: "Post-Sale Expansion",
        steps: [
          "Request review after milestone completion",
          "Trigger referral ask after positive signal",
          "Assign upsell follow-up tasks",
        ],
      },
    ],
    nexrelTools: ["Automation", "Reputation", "Pipeline"],
    status: "building",
  },
  {
    id: "curator",
    name: "The Curator",
    codename: "Creative Intel",
    icon: Megaphone,
    color: "#F43F5E",
    role: "Ad Creative Scaling + Competitor Intelligence",
    description:
      "Feeds Campaign Commander with validated creative hooks and competitive pattern analysis.",
    workflows: [
      {
        title: "Creative Feedback Loop",
        steps: [
          "Extract winning ad patterns",
          "Generate variant matrix",
          "Feed winners to paid launch queue",
        ],
      },
    ],
    nexrelTools: ["AI Content Suite", "Meta Adapter", "Analytics"],
    status: "building",
  },
];

const pipelineStages = [
  { name: "Lead Found", count: 156, color: "#6366F1" },
  { name: "Enriched", count: 142, color: "#8B5CF6" },
  { name: "Contacted", count: 98, color: "#A78BFA" },
  { name: "Replied", count: 34, color: "#14B8A6" },
  { name: "Qualified", count: 22, color: "#10B981" },
  { name: "Meeting Set", count: 15, color: "#F59E0B" },
  { name: "Proposal Sent", count: 8, color: "#F97316" },
  { name: "Closed Won", count: 4, color: "#22C55E" },
];

export default function SalesModulePage() {
  const [expandedAgent, setExpandedAgent] = useState<string | null>("alfred");
  const [expandedWorkflow, setExpandedWorkflow] = useState<number | null>(0);

  return (
    <div className="min-h-full text-zinc-100">
      <div className="relative h-48 overflow-hidden">
        <img
          src={HERO_IMG}
          alt="Sales"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/70 to-[#111827]" />
        <div className="relative z-10 flex flex-col justify-end h-full px-8 pb-5">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-5 h-5 text-[#14B8A6]" />
              <span className="text-xs font-mono text-[#14B8A6]">
                MODULE 02
              </span>
            </div>
            <h1 className="text-2xl font-bold">Autonomous Sales System</h1>
            <p className="text-sm text-zinc-300 mt-1">
              6 AI agents coordinating inbound + outbound sales autonomously
            </p>
          </motion.div>
        </div>
      </div>

      <div className="px-8 py-6 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-lg font-semibold mb-4">Sales Pipeline</h2>
          <div className="glass-panel rounded-xl p-5 space-y-2">
            {pipelineStages.map((stage, i) => {
              const maxCount = pipelineStages[0].count;
              const widthPct = Math.max((stage.count / maxCount) * 100, 8);
              return (
                <motion.div
                  key={stage.name}
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.12 + i * 0.06 }}
                  className="flex items-center gap-3"
                >
                  <span className="text-[11px] text-zinc-400 w-24 text-right shrink-0 truncate">
                    {stage.name}
                  </span>
                  <div className="flex-1 h-7 bg-zinc-800/50 rounded-md overflow-hidden relative">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${widthPct}%` }}
                      transition={{ delay: 0.2 + i * 0.06, duration: 0.6 }}
                      className="h-full rounded-md flex items-center justify-end pr-2"
                      style={{
                        backgroundColor: `${stage.color}30`,
                        borderLeft: `3px solid ${stage.color}`,
                      }}
                    >
                      <span className="text-[11px] font-mono font-bold">
                        {stage.count}
                      </span>
                    </motion.div>
                  </div>
                </motion.div>
              );
            })}
            <div className="flex items-center justify-between pt-3 border-t border-zinc-700/40 mt-3">
              <span className="text-[10px] text-zinc-400">
                Conversion Rate: Lead to Close
              </span>
              <span className="text-sm font-mono font-bold text-emerald-400">
                2.6%
              </span>
            </div>
          </div>
        </motion.div>

        <div>
          <h2 className="text-lg font-semibold mb-4">AI Agent Squad</h2>
          <div className="space-y-3">
            {salesAgents.map((agent, index) => {
              const isExpanded = expandedAgent === agent.id;
              const Icon = agent.icon;
              const statusColors = {
                online: "bg-emerald-400",
                idle: "bg-amber-400",
                building: "bg-amber-500",
              };

              return (
                <motion.div
                  key={agent.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.06 }}
                >
                  <div
                    className={`rounded-xl transition-all duration-300 cursor-pointer ${isExpanded ? "glass-panel" : "bg-zinc-800/40 border border-zinc-700"}`}
                    onClick={() =>
                      setExpandedAgent(isExpanded ? null : agent.id)
                    }
                  >
                    <div className="flex items-center gap-4 p-4">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: `${agent.color}15`,
                          border: `1px solid ${agent.color}30`,
                        }}
                      >
                        <Icon
                          className="w-5 h-5"
                          style={{ color: agent.color }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold">{agent.name}</h3>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                            {agent.codename}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          {agent.role}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1.5">
                          <div
                            className={`w-2 h-2 rounded-full ${statusColors[agent.status]} pulse-dot`}
                          />
                          <span className="text-[10px] font-mono text-zinc-400 capitalize">
                            {agent.status}
                          </span>
                        </div>
                        <ChevronDown
                          className={`w-4 h-4 text-zinc-500 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        />
                      </div>
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
                          {agent.description}
                        </p>

                        <div className="space-y-2">
                          {agent.workflows.map((wf, wi) => (
                            <div
                              key={wi}
                              className="rounded-lg bg-zinc-800/40 border border-zinc-700/40 overflow-hidden"
                            >
                              <div
                                className="flex items-center justify-between px-3 py-2.5 cursor-pointer hover:bg-zinc-800/70 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedWorkflow(
                                    expandedWorkflow === wi &&
                                      expandedAgent === agent.id
                                      ? null
                                      : wi,
                                  );
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  <Zap className="w-3 h-3 text-amber-300" />
                                  <span className="text-xs font-semibold">
                                    {wf.title}
                                  </span>
                                </div>
                                <ChevronDown
                                  className={`w-3 h-3 text-zinc-500 transition-transform ${expandedWorkflow === wi && expandedAgent === agent.id ? "rotate-180" : ""}`}
                                />
                              </div>
                              {expandedWorkflow === wi &&
                                expandedAgent === agent.id && (
                                  <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="px-3 pb-3 space-y-1.5"
                                  >
                                    {wf.steps.map((step, si) => (
                                      <div
                                        key={si}
                                        className="flex items-start gap-2"
                                      >
                                        <div className="w-5 h-5 rounded flex items-center justify-center bg-amber-500/10 shrink-0 mt-0.5">
                                          <span className="text-[9px] font-mono text-amber-300 font-bold">
                                            {si + 1}
                                          </span>
                                        </div>
                                        <p className="text-[11px] text-zinc-400 leading-relaxed">
                                          {step}
                                        </p>
                                      </div>
                                    ))}
                                  </motion.div>
                                )}
                            </div>
                          ))}
                        </div>

                        <div>
                          <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                            NexRel Tools
                          </span>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {agent.nexrelTools.map((tool) => (
                              <span
                                key={tool}
                                className="text-[10px] font-mono px-2 py-1 rounded-lg bg-teal-500/10 text-teal-300 border border-teal-400/20"
                              >
                                {tool}
                              </span>
                            ))}
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
          transition={{ delay: 0.6 }}
        >
          <h2 className="text-lg font-semibold mb-4">Trust Framework</h2>
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              {
                phase: "Crawl",
                desc: "Everything goes to drafts and approval queues first. No autonomous outbound action.",
                color: "#F59E0B",
                icon: Clock,
              },
              {
                phase: "Walk",
                desc: "Low-risk internal tasks auto-execute; high-risk communication and spend still require approval.",
                color: "#14B8A6",
                icon: Target,
              },
              {
                phase: "Run",
                desc: "Agents execute full follow-up flow and external adapters with weekly governance reporting.",
                color: "#10B981",
                icon: Zap,
              },
            ].map((p) => (
              <div key={p.phase} className="glass-panel rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <p.icon className="w-4 h-4" style={{ color: p.color }} />
                  <h4 className="text-sm font-bold" style={{ color: p.color }}>
                    {p.phase}
                  </h4>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {p.desc}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
