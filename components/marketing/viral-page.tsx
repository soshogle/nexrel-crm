"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type OwnerMode = "Auto" | "Needs Approval" | "Needs Setup";

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
  const completedCount = Object.values(project?.phaseStatus || {}).filter(
    (value: any) => value === "completed",
  ).length;

  const ownerState = useMemo(() => {
    if (!project) {
      return {
        mode: "Needs Setup" as OwnerMode,
        reason: "Viral automation is not started yet.",
        next: "Start automation.",
        cta: "Start Automation",
      };
    }

    if (!readiness?.runnable) {
      const reason = String(readiness?.reason || "A prerequisite is missing.");
      if (reason.toLowerCase().includes("trust stage")) {
        return {
          mode: "Needs Approval" as OwnerMode,
          reason,
          next: "Approve the next trust stage.",
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

    if (nextPhase >= 3 && !socialReady) {
      return {
        mode: "Needs Setup" as OwnerMode,
        reason: "Native social channels are not connected.",
        next: "Connect Instagram or Facebook.",
        cta: "Fix Setup",
      };
    }

    return {
      mode: "Auto" as OwnerMode,
      reason: "Viral automation is ready for the next step.",
      next: nextPhase > 0 ? `Run phase ${nextPhase}.` : "Workflow completed.",
      cta: nextPhase > 0 ? "Run Now" : "View Results",
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
        toast.success("Viral automation started.");
        await refresh();
        return;
      }
      if (ownerState.mode === "Needs Approval") {
        toast.info("Open Advanced and approve trust stage.");
        return;
      }
      if (ownerState.mode === "Needs Setup") {
        router.push("/dashboard/settings");
        return;
      }
      if (nextPhase > 0) {
        await runPhase(nextPhase);
        toast.success(`Phase ${nextPhase} executed.`);
        await refresh();
      }
    } catch (error: any) {
      toast.error(error?.message || "Action failed");
    } finally {
      setRunning(false);
    }
  };

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
          <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 bg-clip-text text-transparent">
            Viral
          </span>
        </h1>
      </div>

      <Card className="border border-purple-300/60 bg-white/90">
        <CardHeader>
          <CardTitle className="text-base">Current Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-700">
          <p>
            <span className="font-semibold">Mode:</span> {ownerState.mode}
          </p>
          <p>
            <span className="font-semibold">What is happening:</span>{" "}
            {ownerState.reason}
          </p>
          <p>
            <span className="font-semibold">Next action:</span>{" "}
            {ownerState.next}
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
          <CardTitle className="text-base">Business Result</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-700 space-y-1">
          <p>
            <span className="font-semibold">Active workflow:</span>{" "}
            {project?.projectName || "Not started"}
          </p>
          <p>
            <span className="font-semibold">Completed steps:</span>{" "}
            {completedCount}/8
          </p>
          <p>
            <span className="font-semibold">Expected outcome:</span>{" "}
            Better-performing content with clearer lead intent signals.
          </p>
        </CardContent>
      </Card>

      <details className="rounded-lg border border-purple-200 bg-white/85 p-4">
        <summary className="cursor-pointer font-medium text-sm text-gray-800">
          Advanced
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
                placeholder="Phase 3 media URL"
              />
              <Input
                value={limitPerChannel}
                onChange={(e) => setLimitPerChannel(e.target.value)}
                placeholder="Phase 4 posts per channel"
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
