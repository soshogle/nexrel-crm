"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type OwnerState = {
  chip: "Running" | "Needs your approval" | "Needs setup";
  message: string;
  nextAction: string;
  cta: string;
};

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
    if (!response.ok || data?.error)
      throw new Error(data?.error || "Request failed");
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
  const completedCount = Object.values(project?.phaseStatus || {}).filter(
    (value: any) => value === "completed",
  ).length;

  const ownerState: OwnerState = useMemo(() => {
    if (!project) {
      return {
        chip: "Needs setup",
        message: "Marketing automation has not started yet.",
        nextAction: "Start your first marketing cycle.",
        cta: "Start Marketing Cycle",
      };
    }
    if (!readiness?.runnable) {
      const reason = String(readiness?.reason || "A prerequisite is missing.");
      if (reason.toLowerCase().includes("trust stage")) {
        return {
          chip: "Needs your approval",
          message: "Automation is waiting for your approval to continue.",
          nextAction: "Approve the next trust stage in details.",
          cta: "Review Approval",
        };
      }
      return {
        chip: "Needs setup",
        message: reason,
        nextAction: "Fix setup, then run the cycle.",
        cta: "Fix Setup",
      };
    }
    return {
      chip: "Running",
      message: "Automation is ready to run the next marketing step.",
      nextAction: nextPhase > 0 ? `Run step ${nextPhase}.` : "Review outcomes.",
      cta: nextPhase > 0 ? "Run Marketing Cycle" : "View Outcomes",
    };
  }, [nextPhase, project, readiness]);

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
        toast.success("Marketing cycle started.");
        await refresh();
        return;
      }
      if (ownerState.chip === "Needs your approval") {
        router.push("/dashboard/marketing/viral");
        return;
      }
      if (ownerState.chip === "Needs setup") {
        router.push("/dashboard/settings");
        return;
      }
      if (nextPhase > 0) {
        await callAutomation({
          action: "run_phase",
          projectId: project.projectId,
          phaseId: nextPhase,
        });
        toast.success(`Marketing step ${nextPhase} completed.`);
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
            description: "Owner planning task from Marketing page.",
            priority: "HIGH",
          },
        }),
      });
      const data = await response.json();
      if (!response.ok || data?.error)
        throw new Error(data?.error || "Failed to create task");
      toast.success("Planning task created.");
    } catch (error: any) {
      toast.error(error?.message || "Failed to create task");
    } finally {
      setBusy(false);
    }
  };

  const campaignsLaunched = project?.phaseOutputs?.[3]?.draftCampaign ? 1 : 0;
  const leadsInfluenced = Number(
    project?.phaseOutputs?.[6]?.totalConversions || 0,
  );
  const topChannel =
    project?.phaseOutputs?.[7]?.recommendation?.primaryChannel ||
    "Not enough data yet";

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50/50 via-white to-pink-50/50 p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          title="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-4xl font-bold flex items-center gap-3">
          <Megaphone className="h-8 w-8 text-purple-600" />
          Marketing
        </h1>
      </div>

      <Card className="border border-purple-300/60 bg-white/90">
        <CardHeader>
          <CardTitle className="text-base">What should I do now?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-700">
          <Badge className="w-fit bg-purple-100 text-purple-700">
            {ownerState.chip}
          </Badge>
          <p>
            <span className="font-semibold">Status:</span> {ownerState.message}
          </p>
          <p>
            <span className="font-semibold">Next:</span> {ownerState.nextAction}
          </p>
          <Button onClick={runPrimaryAction} disabled={busy || loading}>
            {(busy || loading) && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            {ownerState.cta}
          </Button>
        </CardContent>
      </Card>

      <Card className="border border-purple-300/60 bg-white/90">
        <CardHeader>
          <CardTitle className="text-base">What changed this week</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-700 space-y-1">
          <p>
            <span className="font-semibold">Campaigns launched:</span>{" "}
            {campaignsLaunched}
          </p>
          <p>
            <span className="font-semibold">Leads influenced:</span>{" "}
            {leadsInfluenced}
          </p>
          <p>
            <span className="font-semibold">Top channel:</span> {topChannel}
          </p>
          <p>
            <span className="font-semibold">Completed steps:</span>{" "}
            {completedCount}/8
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Link href="/dashboard/marketing/viral">
          <Button>Open Viral</Button>
        </Link>
        <Link href="/dashboard/campaigns">
          <Button variant="outline">Open Campaigns</Button>
        </Link>
      </div>

      <details className="rounded-lg border border-purple-200 bg-white/85 p-4">
        <summary className="cursor-pointer font-medium text-sm text-gray-800">
          Details
        </summary>
        <div className="mt-3 space-y-2">
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
  );
}
