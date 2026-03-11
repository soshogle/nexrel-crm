"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
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

export function ViralPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [projectName, setProjectName] = useState("Viral Growth Loop");
  const [niche, setNiche] = useState("Dental marketing automation");
  const [conversionGoal, setConversionGoal] = useState("qualified leads");
  const [mediaUrl, setMediaUrl] = useState("");
  const [limitPerChannel, setLimitPerChannel] = useState("6");
  const [trustStage, setTrustStage] = useState<"crawl" | "walk" | "run">(
    "crawl",
  );
  const [status, setStatus] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);

  const callViral = useCallback(async (parameters: any) => {
    const response = await fetch("/api/crm-voice-agent/functions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        function_name: "automation_operate",
        parameters: { mode: "viral_loop", ...parameters },
      }),
    });
    const data = await response.json();
    if (!response.ok || data?.error)
      throw new Error(data?.error || "Operation failed");
    return data;
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [data, healthRes] = await Promise.all([
        callViral({ action: "status" }).catch(() => null),
        fetch("/api/automation/health")
          .then((res) => (res.ok ? res.json() : null))
          .catch(() => null),
      ]);
      setStatus(data || null);
      setHealth(healthRes || null);
    } finally {
      setLoading(false);
    }
  }, [callViral]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const project = status?.project;
  const readiness = health?.readiness?.viralLoop;
  const nextPhase = Number(readiness?.nextPhase || 0);
  const socialReady = Boolean(health?.readiness?.socialNativeDraftingReady);

  const ownerState: OwnerState = useMemo(() => {
    if (!project) {
      return {
        chip: "Needs setup",
        message: "Viral automation has not started yet.",
        nextAction: "Start your first content cycle.",
        cta: "Start Content Cycle",
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
        nextAction: "Fix setup, then run again.",
        cta: "Fix Setup",
      };
    }
    if (nextPhase >= 3 && !socialReady) {
      return {
        chip: "Needs setup",
        message: "No native social channels are connected.",
        nextAction: "Connect Instagram or Facebook.",
        cta: "Fix Setup",
      };
    }
    return {
      chip: "Running",
      message: "Viral automation is ready to run the next step.",
      nextAction: nextPhase > 0 ? `Run step ${nextPhase}.` : "Review outcomes.",
      cta: nextPhase > 0 ? "Run Content Cycle" : "View Outcomes",
    };
  }, [nextPhase, project, readiness, socialReady]);

  const initializeProject = async () => {
    const data = await callViral({
      action: "initialize",
      projectName,
      niche,
      conversionGoal,
    });
    setStatus(data);
  };

  const runPhase = async (phaseId: number) => {
    const options: Record<string, any> = {};
    if (phaseId === 3 && mediaUrl.trim()) options.mediaUrl = mediaUrl.trim();
    if (phaseId === 4) {
      const parsed = Number(limitPerChannel);
      if (!Number.isNaN(parsed) && parsed > 0) options.limitPerChannel = parsed;
    }
    const data = await callViral({
      action: "run_phase",
      projectId: project?.projectId,
      phaseId,
      ...options,
    });
    setStatus(data);
  };

  const setTrust = async () => {
    const data = await callViral({
      action: "set_trust_stage",
      projectId: project?.projectId,
      trustStage,
    });
    setStatus(data);
  };

  const runPrimaryAction = async () => {
    setRunning(true);
    try {
      if (!project) {
        await initializeProject();
        toast.success("Content cycle started.");
        await refresh();
        return;
      }
      if (ownerState.chip === "Needs your approval") {
        toast.info("Open Details and approve trust stage.");
        return;
      }
      if (ownerState.chip === "Needs setup") {
        router.push("/dashboard/settings");
        return;
      }
      if (nextPhase > 0) {
        await runPhase(nextPhase);
        toast.success(`Content step ${nextPhase} completed.`);
        await refresh();
      }
    } catch (error: any) {
      toast.error(error?.message || "Action failed");
    } finally {
      setRunning(false);
    }
  };

  const winningHook =
    project?.phaseOutputs?.[5]?.winner?.hook ||
    project?.phaseOutputs?.[4]?.topPerformer?.hook ||
    "Not enough data yet";
  const conversionTrend = Number(
    project?.phaseOutputs?.[6]?.totalConversions || 0,
  );
  const topPost =
    project?.phaseOutputs?.[4]?.topPerformer?.id || "Not enough data yet";

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
          <Sparkles className="h-8 w-8 text-purple-600" />
          Viral
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
          <Button onClick={runPrimaryAction} disabled={running || loading}>
            {(running || loading) && (
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
            <span className="font-semibold">Top post:</span> {topPost}
          </p>
          <p>
            <span className="font-semibold">Winning hook:</span> {winningHook}
          </p>
          <p>
            <span className="font-semibold">Conversion trend:</span>{" "}
            {conversionTrend}
          </p>
        </CardContent>
      </Card>

      <details className="rounded-lg border border-purple-200 bg-white/85 p-4">
        <summary className="cursor-pointer font-medium text-sm text-gray-800">
          Details
        </summary>
        <div className="mt-4 space-y-4">
          <Card className="border border-purple-200 bg-white/90">
            <CardHeader>
              <CardTitle className="text-sm">Setup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
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
                placeholder="Conversion goal"
              />
              <Button
                variant="outline"
                onClick={initializeProject}
                disabled={running}
              >
                Initialize
              </Button>
            </CardContent>
          </Card>

          <Card className="border border-purple-200 bg-white/90">
            <CardHeader>
              <CardTitle className="text-sm">Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <select
                value={trustStage}
                onChange={(e) =>
                  setTrustStage(e.target.value as "crawl" | "walk" | "run")
                }
                className="w-full rounded-md border border-purple-200 bg-white px-3 py-2 text-sm"
              >
                <option value="crawl">crawl</option>
                <option value="walk">walk</option>
                <option value="run">run</option>
              </select>
              <Button
                variant="outline"
                onClick={setTrust}
                disabled={running || !project}
              >
                Apply Trust Stage
              </Button>
              <Input
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder="Step 3 media URL"
              />
              <Input
                value={limitPerChannel}
                onChange={(e) => setLimitPerChannel(e.target.value)}
                placeholder="Step 4 posts per channel"
              />
              <div className="flex flex-wrap gap-2 pt-1">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((phaseId) => (
                  <Button
                    key={phaseId}
                    size="sm"
                    variant="outline"
                    onClick={() => runPhase(phaseId)}
                    disabled={running || !project}
                  >
                    Run {phaseId}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </details>
    </div>
  );
}
