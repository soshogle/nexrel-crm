"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

type AgentStatus = "online" | "idle" | "building";

interface AgentCardProps {
  name: string;
  role: string;
  icon: LucideIcon;
  status: AgentStatus;
  tasks: number;
  color: string;
}

export function AgentCard({
  name,
  role,
  icon: Icon,
  status,
  tasks,
  color,
}: AgentCardProps) {
  const statusColors: Record<AgentStatus, string> = {
    online: "bg-emerald-400",
    idle: "bg-amber-400",
    building: "bg-yellow-400",
  };

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="glass-panel rounded-xl p-4 space-y-3"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{
              backgroundColor: `${color}15`,
              border: `1px solid ${color}35`,
            }}
          >
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-zinc-100">{name}</h4>
            <p className="text-[11px] text-zinc-400">{role}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className={`w-2 h-2 rounded-full ${statusColors[status]} pulse-dot`}
          />
          <span className="text-[10px] uppercase tracking-wide text-zinc-500">
            {status}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-zinc-700/70">
        <span className="text-[10px] text-zinc-500">Active workflows</span>
        <span className="text-sm font-mono font-semibold text-zinc-100">
          {tasks}
        </span>
      </div>
    </motion.div>
  );
}
