"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard,
  Megaphone,
  DollarSign,
  Share2,
  Flame,
  ShieldCheck,
  History,
  Zap,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState, type ReactNode } from "react";

const navItems = [
  {
    path: "/dashboard/agent-command-center",
    label: "Command Center",
    icon: LayoutDashboard,
  },
  {
    path: "/dashboard/agent-command-center/marketing",
    label: "Marketing Automation",
    icon: Megaphone,
  },
  {
    path: "/dashboard/agent-command-center/sales",
    label: "Sales System",
    icon: DollarSign,
  },
  {
    path: "/dashboard/agent-command-center/social",
    label: "Social Media",
    icon: Share2,
  },
  {
    path: "/dashboard/agent-command-center/social/go-viral",
    label: "Go Viral",
    icon: Flame,
  },
  {
    path: "/dashboard/agent-command-center/approvals",
    label: "Approvals Inbox",
    icon: ShieldCheck,
  },
  {
    path: "/dashboard/agent-command-center/audit",
    label: "Audit Timeline",
    icon: History,
  },
];

export function CommandCenterLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="ncc flex h-[calc(100vh-5rem)] overflow-hidden rounded-xl border border-zinc-700 bg-[#10141d]">
      <style jsx global>{`
        .ncc {
          --gold: #f59e0b;
        }
        .ncc .glass-panel {
          background: color-mix(in oklab, #1f2937 72%, transparent);
          backdrop-filter: blur(12px);
          border: 1px solid color-mix(in oklab, #4b5563 62%, transparent);
        }
        .ncc .gold-glow {
          box-shadow:
            0 0 20px rgba(245, 158, 11, 0.16),
            0 0 40px rgba(245, 158, 11, 0.06);
        }
        .ncc .pulse-dot {
          animation: ncc-pulse-glow 2s ease-in-out infinite;
        }
        @keyframes ncc-pulse-glow {
          0%,
          100% {
            opacity: 0.6;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.2);
          }
        }
      `}</style>

      <motion.aside
        animate={{ width: collapsed ? 64 : 240 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className="flex flex-col border-r border-zinc-700 bg-[#0d1118] shrink-0"
      >
        <div className="flex items-center gap-3 px-4 h-16 border-b border-zinc-800">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-zinc-900" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="overflow-hidden whitespace-nowrap"
              >
                <h1 className="text-sm font-bold tracking-tight text-zinc-100">
                  NexRel Agent
                </h1>
                <p className="text-[10px] text-zinc-500 -mt-0.5">
                  Command Center
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <nav className="flex-1 py-3 px-2 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link key={item.path} href={item.path}>
                <div
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                    isActive
                      ? "bg-zinc-800 text-amber-400 gold-glow"
                      : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/70"
                  }`}
                >
                  <item.icon
                    className={`w-5 h-5 shrink-0 ${isActive ? "text-amber-400" : "text-zinc-500 group-hover:text-zinc-100"}`}
                  />
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        className="text-sm font-medium overflow-hidden whitespace-nowrap"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-2 border-t border-zinc-800">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center py-2 rounded-lg text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800/50 transition-colors"
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>
      </motion.aside>

      <main className="flex-1 overflow-y-auto bg-[radial-gradient(ellipse_at_top,_rgba(245,158,11,0.08),_transparent_45%),linear-gradient(180deg,#111827,#0f172a)]">
        {children}
      </main>
    </div>
  );
}
