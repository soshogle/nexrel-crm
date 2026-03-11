"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, DollarSign, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const phaseLabels = [
  "Chief of Staff",
  "Autonomous Outbound",
  "Proactive Deal Finder",
  "Inbound Qualification",
  "Growth Engine",
  "Content & Research",
];

type OwnerMode = "Auto" | "Needs Approval" | "Needs Setup";

export function SalesAgentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [squadName, setSquadName] = useState("Autonomous Sales Squad");
  const [primaryGoal, setPrimaryGoal] = useState("book qualified meetings");
  const [trustStage, setTrustStage] = useState<"crawl" | "walk" | "run">(
    "crawl",
  );
  const [companyUrlsText, setCompanyUrlsText] = useState("");
  const [status, setStatus] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);

  const callSales = useCallback(async (parameters: any) => {
    const response = await fetch("/api/crm-voice-agent/functions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        function_name: "automation_operate",
        parameters: { mode: "sales_squad", ...parameters },
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
        callSales({ action: "status" }).catch(() => null),
        fetch("/api/automation/health")
          .then((res) => (res.ok ? res.json() : null))
          .catch(() => null),
      ]);
      setStatus(data || null);
      setHealth(healthRes || null);
    } finally {
      setLoading(false);
    }
  }, [callSales]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const squad = status?.squad;
  const readiness = health?.readiness?.salesSquad;
  const nextPhase = Number(readiness?.nextPhase || 0);
  const enrichmentReady = Boolean(
    health?.readiness?.enrichmentKeys?.anyConfigured,
  );
  const completedCount = Object.values(squad?.phaseStatus || {}).filter(
    (value: any) => value === "completed",
  ).length;

  const ownerState = useMemo(() => {
    if (!squad) {
      return {
        mode: "Needs Setup" as OwnerMode,
        reason: "Sales automation is not started yet.",
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

    if (nextPhase >= 2 && !enrichmentReady) {
      return {
        mode: "Needs Setup" as OwnerMode,
        reason: "Enrichment API keys are not configured.",
        next: "Add Hunter or Clearbit key.",
        cta: "Fix Setup",
      };
    }

    return {
      mode: "Auto" as OwnerMode,
      reason: "Sales automation is ready for the next step.",
      next: nextPhase > 0 ? `Run phase ${nextPhase}.` : "Workflow completed.",
      cta: nextPhase > 0 ? "Run Now" : "View Results",
    };
  }, [enrichmentReady, nextPhase, readiness, squad]);

  const initialize = async () => {
    const data = await callSales({
      action: "initialize",
      squadName,
      primaryGoal,
    });
    setStatus(data);
  };

  const runPhase = async (phaseId: number) => {
    const options: Record<string, any> = {};
    if (phaseId === 2 && companyUrlsText.trim()) {
      options.companyUrls = companyUrlsText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
    }
    const data = await callSales({
      action: "run_phase",
      squadId: squad?.squadId,
      phaseId,
      ...options,
    });
    setStatus(data);
  };

  const setTrust = async () => {
    const data = await callSales({
      action: "set_trust_stage",
      squadId: squad?.squadId,
      trustStage,
    });
    setStatus(data);
  };

  const runPrimaryAction = async () => {
    setRunning(true);
    try {
      if (!squad) {
        await initialize();
        toast.success("Sales automation started.");
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
          <DollarSign className="h-8 w-8 text-purple-600" />
          <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 bg-clip-text text-transparent">
            Sales
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
            {squad?.squadName || "Not started"}
          </p>
          <p>
            <span className="font-semibold">Completed steps:</span>{" "}
            {completedCount}/6
          </p>
          <p>
            <span className="font-semibold">Expected outcome:</span> More
            consistent meetings and qualified pipeline movement.
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
                value={squadName}
                onChange={(e) => setSquadName(e.target.value)}
                placeholder="Squad name"
              />
              <Input
                value={primaryGoal}
                onChange={(e) => setPrimaryGoal(e.target.value)}
                placeholder="Primary goal"
              />
              <Button variant="outline" onClick={initialize} disabled={running}>
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
                disabled={running || !squad}
              >
                Apply Trust Stage
              </Button>
              <textarea
                value={companyUrlsText}
                onChange={(e) => setCompanyUrlsText(e.target.value)}
                placeholder={"acme.com\nexample.org"}
                className="w-full min-h-[120px] rounded-md border border-purple-200 bg-white px-3 py-2 text-sm"
              />
              <div className="flex flex-wrap gap-2 pt-1">
                {phaseLabels.map((_, index) => {
                  const phaseId = index + 1;
                  return (
                    <Button
                      key={phaseId}
                      size="sm"
                      variant="outline"
                      onClick={() => runPhase(phaseId)}
                      disabled={running || !squad}
                    >
                      Run {phaseId}
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </details>
    </div>
  );
}
