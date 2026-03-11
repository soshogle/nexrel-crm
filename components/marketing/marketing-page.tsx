"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Megaphone, Sparkles, Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type OwnerMode = "Auto" | "Needs Approval" | "Needs Setup";

export function MarketingPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [projectName, setProjectName] = useState("Viral Growth Loop");
  const [niche, setNiche] = useState("Dental marketing automation");
  const [conversionGoal, setConversionGoal] = useState("qualified leads");
  const [taskTitle, setTaskTitle] = useState(
    "Review this week's campaign plan",
  );
  const [status, setStatus] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);

  const callAutomation = useCallback(async (parameters: any) => {
    const response = await fetch("/api/crm-voice-agent/functions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        function_name: "automation_operate",
        parameters: {
          mode: "viral_loop",
          ...parameters,
        },
      }),
    });
    const data = await response.json();
    if (!response.ok || data?.error) {
      throw new Error(data?.error || "Automation request failed");
    }
    return data;
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [statusData, healthData] = await Promise.all([
        callAutomation({ action: "status" }).catch(() => null),
        fetch("/api/automation/health")
          .then((res) => (res.ok ? res.json() : null))
          .catch(() => null),
      ]);
      setStatus(statusData || null);
      setHealth(healthData || null);
    } finally {
      setLoading(false);
    }
  }, [callAutomation]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const project = status?.project;
  const readiness = health?.readiness?.viralLoop;
  const nextPhase = Number(readiness?.nextPhase || 0);

  const ownerState = useMemo(() => {
    if (!project) {
      return {
        mode: "Needs Setup" as OwnerMode,
        reason: "No marketing workflow is active yet.",
        next: "Start automation to create your marketing workflow.",
        cta: "Start Automation",
      };
    }

    if (!readiness?.runnable) {
      const reason = String(readiness?.reason || "A prerequisite is missing.");
      if (reason.toLowerCase().includes("trust stage")) {
        return {
          mode: "Needs Approval" as OwnerMode,
          reason,
          next: "Review and approve the next trust stage.",
          cta: "Review & Approve",
        };
      }
      return {
        mode: "Needs Setup" as OwnerMode,
        reason,
        next: "Fix setup and run again.",
        cta: "Fix Setup",
      };
    }

    return {
      mode: "Auto" as OwnerMode,
      reason: "Automation can run the next marketing step now.",
      next:
        nextPhase > 0
          ? `Run phase ${nextPhase} now.`
          : "Workflow is completed.",
      cta: nextPhase > 0 ? "Run Now" : "View Results",
    };
  }, [project, readiness, nextPhase]);

  const runPrimaryAction = async () => {
    setBusy(true);
    try {
      if (!project) {
        await callAutomation({
          action: "initialize",
          projectName,
          niche,
          conversionGoal,
        });
        toast.success("Marketing workflow started.");
        await refresh();
        return;
      }

      if (ownerState.mode === "Needs Approval") {
        router.push("/dashboard/marketing/viral");
        return;
      }

      if (ownerState.mode === "Needs Setup") {
        router.push("/dashboard/settings");
        return;
      }

      if (nextPhase > 0) {
        await callAutomation({
          action: "run_phase",
          projectId: project?.projectId,
          phaseId: nextPhase,
        });
        toast.success(`Marketing phase ${nextPhase} executed.`);
        await refresh();
      }
    } catch (error: any) {
      toast.error(error?.message || "Action failed");
    } finally {
      setBusy(false);
    }
  };

  const createPlanningTask = async () => {
    setBusy(true);
    try {
      const response = await fetch("/api/crm-voice-agent/functions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          function_name: "create_task",
          parameters: {
            title: taskTitle,
            description:
              "Owner planning task from Marketing hub. Review current outcomes and approve the next cycle if needed.",
            priority: "HIGH",
          },
        }),
      });
      const data = await response.json();
      if (!response.ok || data?.error) {
        throw new Error(data?.error || "Failed to create task");
      }
      toast.success("Planning task created.");
    } catch (error: any) {
      toast.error(error?.message || "Failed to create task");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50/50 via-white to-pink-50/50 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute bottom-0 right-0 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />
      </div>

      <div className="relative z-10 p-8 space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            title="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-3">
              <Megaphone className="h-8 w-8 text-purple-600" />
              <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 bg-clip-text text-transparent">
                Marketing
              </span>
            </h1>
            <p className="text-gray-600 mt-1">
              One place to run and review your owner marketing automation.
            </p>
          </div>
        </div>

        <Card className="border border-purple-300/60 bg-white/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base">Automation Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-700">
            <p>
              <span className="font-semibold">Mode:</span> {ownerState.mode}
            </p>
            <p>
              <span className="font-semibold">Why:</span> {ownerState.reason}
            </p>
            <p>
              <span className="font-semibold">Next:</span> {ownerState.next}
            </p>
            <div className="pt-1">
              <Button onClick={runPrimaryAction} disabled={busy || loading}>
                {(busy || loading) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {ownerState.cta}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-purple-300/60 bg-white/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base">Last Result</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-700 space-y-1">
            <p>
              <span className="font-semibold">Project:</span>{" "}
              {project?.projectName || "Not started"}
            </p>
            <p>
              <span className="font-semibold">Current Phase:</span>{" "}
              {project?.currentPhase || 0}
            </p>
            <p>
              <span className="font-semibold">Completed Phases:</span>{" "}
              {
                Object.values(project?.phaseStatus || {}).filter(
                  (v: any) => v === "completed",
                ).length
              }
              /8
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border border-purple-200/50 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-600" /> Viral
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-600">
              <p>Run content generation, diagnostics, and optimization.</p>
              <Link href="/dashboard/marketing/viral">
                <Button size="sm">Open Viral</Button>
              </Link>
            </CardContent>
          </Card>
          <Card className="border border-purple-200/50 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="h-4 w-4 text-purple-600" /> Campaigns
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-600">
              <p>Launch and manage outbound messaging campaigns.</p>
              <Link href="/dashboard/campaigns">
                <Button size="sm" variant="outline">
                  Open Campaigns
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <details className="rounded-lg border border-purple-200 bg-white/80 p-4">
          <summary className="cursor-pointer font-medium text-sm text-gray-800">
            Advanced Controls
          </summary>
          <div className="mt-3 space-y-3">
            <Input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Project name"
            />
            <Input
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              placeholder="Niche"
            />
            <Input
              value={conversionGoal}
              onChange={(e) => setConversionGoal(e.target.value)}
              placeholder="Goal"
            />
            <Input
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="Planning task title"
            />
            <Button
              variant="outline"
              onClick={createPlanningTask}
              disabled={busy}
            >
              Create Planning Task
            </Button>
          </div>
        </details>
      </div>
    </div>
  );
}
