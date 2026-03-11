"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Brain,
  CheckCircle2,
  DollarSign,
  Loader2,
  Rocket,
  Target,
  Users,
  Workflow,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const phaseLabels = [
  "Chief of Staff",
  "Autonomous Outbound",
  "Proactive Deal Finder",
  "Inbound Qualification",
  "Growth Engine",
  "Content & Research",
];

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
    setRunning(true);
    try {
      const response = await fetch("/api/crm-voice-agent/functions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          function_name: "automation_operate",
          parameters: {
            mode: "sales_squad",
            ...parameters,
          },
        }),
      });
      const data = await response.json();
      if (!response.ok || data?.error) {
        throw new Error(data?.error || "Operation failed");
      }
      return data;
    } finally {
      setRunning(false);
    }
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
      setStatus(data);
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
  const automationState = useMemo(() => {
    if (!squad) {
      return {
        level: "Needs Setup",
        reason: "Initialize a sales squad first.",
        next: "Start automation to create your sales squad.",
        cta: "Start Automation",
      };
    }
    if (!readiness?.runnable) {
      const reason = String(
        readiness?.reason || "Prerequisites are not ready.",
      );
      const needsApproval = reason.toLowerCase().includes("trust stage");
      return {
        level: needsApproval ? "Needs Approval" : "Needs Setup",
        reason,
        next: needsApproval
          ? "Promote trust stage before running this phase."
          : "Complete the missing prerequisite shown above.",
        cta: needsApproval ? "Review & Approve" : "Fix Setup",
      };
    }
    if (!enrichmentReady) {
      return {
        level: "Needs Setup",
        reason: "No enrichment key found (Hunter/Clearbit).",
        next: "Add at least one enrichment API key.",
        cta: "Fix Setup",
      };
    }
    return {
      level: "Auto",
      reason: "All checks passed for the next phase.",
      next:
        nextPhase > 0 ? `Run phase ${nextPhase}.` : "Workflow is completed.",
      cta: nextPhase > 0 ? "Run Now" : "View Results",
    };
  }, [enrichmentReady, nextPhase, readiness, squad]);
  const progress = useMemo(() => {
    const phaseStatus = squad?.phaseStatus || {};
    const completed = Object.values(phaseStatus).filter(
      (value) => value === "completed",
    ).length;
    return {
      completed,
      total: 6,
      currentPhase: squad?.currentPhase || 1,
    };
  }, [squad]);

  const initialize = async () => {
    try {
      const data = await callSales({
        action: "initialize",
        squadName,
        primaryGoal,
      });
      setStatus(data);
      toast.success("Sales squad initialized");
    } catch (error: any) {
      toast.error(error?.message || "Failed to initialize sales squad");
    }
  };

  const runPhase = async (phaseId: number) => {
    try {
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
      toast.success(`Phase ${phaseId} executed`);
    } catch (error: any) {
      toast.error(error?.message || `Failed phase ${phaseId}`);
    }
  };

  const setTrust = async () => {
    try {
      const data = await callSales({
        action: "set_trust_stage",
        squadId: squad?.squadId,
        trustStage,
      });
      setStatus(data);
      toast.success(`Trust stage updated to ${trustStage}`);
      refresh();
    } catch (error: any) {
      toast.error(error?.message || "Failed to update trust stage");
    }
  };

  const runPrimaryAction = async () => {
    if (!squad) {
      await initialize();
      return;
    }
    if (automationState.level === "Needs Approval") {
      toast.info("Open Advanced Controls to approve trust stage.");
      return;
    }
    if (automationState.level === "Needs Setup") {
      router.push("/dashboard/settings");
      return;
    }
    if (nextPhase > 0) {
      await runPhase(nextPhase);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50/50 via-white to-pink-50/50 flex items-center justify-center">
        <div className="animate-spin h-10 w-10 border-2 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50/50 via-white to-pink-50/50 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute bottom-0 right-0 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />
      </div>

      <div className="relative z-10 container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
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
              <h1 className="text-4xl font-bold flex items-center gap-3 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 bg-clip-text text-transparent">
                <DollarSign className="h-8 w-8 text-purple-600" />
                Sales AI Squad
              </h1>
              <p className="text-gray-600 mt-1">
                Autonomous sales and growth engine with safe automation
                controls.
              </p>
            </div>
          </div>
          <Badge className="bg-purple-100 text-purple-700 border border-purple-200">
            {squad?.trustStage
              ? `Trust: ${squad.trustStage}`
              : "Not initialized"}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border border-purple-200/50 bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600">Squad</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold text-gray-900">
              {squad?.squadName || "Not initialized"}
            </CardContent>
          </Card>
          <Card className="border border-purple-200/50 bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600">Progress</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold text-gray-900">
              {progress.completed}/{progress.total}
            </CardContent>
          </Card>
          <Card className="border border-purple-200/50 bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600">
                Current Phase
              </CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold text-gray-900">
              {progress.currentPhase}
            </CardContent>
          </Card>
          <Card className="border border-purple-200/50 bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600">
                Primary Goal
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm font-medium text-gray-900">
              {squad?.primaryGoal || "Not set"}
            </CardContent>
          </Card>
        </div>

        <Card className="border border-purple-300/60 bg-white/90 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Owner Automation Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-700 space-y-1">
            <p>
              <span className="font-semibold">Mode:</span>{" "}
              {automationState.level}
            </p>
            <p>
              <span className="font-semibold">Why:</span>{" "}
              {automationState.reason}
            </p>
            <p>
              <span className="font-semibold">Next Step:</span>{" "}
              {automationState.next}
            </p>
            <div className="pt-2">
              <Button onClick={runPrimaryAction} disabled={running}>
                {running && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {automationState.cta}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-purple-300/60 bg-white/90 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Owner Playbook</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-700">
            <p>
              Step 1: Initialize your sales squad with a clear primary goal.
            </p>
            <p>
              Step 2: Use Owner Action Controls to approve trust stage changes
              and add company URLs for outbound enrichment in phase 2.
            </p>
            <p>
              Step 3: Run phases 1-6 in order to activate briefing, outbound,
              re-engagement, qualification, growth, and content support.
            </p>
            <p>
              Step 4: Follow Automation Status when blocked to resolve missing
              approvals or missing setup.
            </p>
            <p className="text-xs text-gray-600">
              Expected result: a structured sales operating rhythm with clear
              owner approvals and faster execution.
            </p>
          </CardContent>
        </Card>

        <details className="rounded-lg border border-purple-200 bg-white/85 p-4">
          <summary className="cursor-pointer font-medium text-sm text-gray-800">
            Advanced Controls
          </summary>
          <div className="mt-4 space-y-4">
            <Card className="border-2 border-purple-200/50 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Initialize Sales Squad</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
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
                <div className="flex gap-2">
                  <Button onClick={initialize} disabled={running}>
                    {running && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Initialize
                  </Button>
                  <Button
                    variant="outline"
                    onClick={refresh}
                    disabled={running}
                  >
                    Refresh
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-purple-300/60 bg-white/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Owner Action Controls</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-800">
                    Trust Stage Approval
                  </p>
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
                  <Button onClick={setTrust} disabled={running || !squad}>
                    Apply Trust Stage
                  </Button>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-800">
                    Phase 2 Company URLs (one per line)
                  </p>
                  <textarea
                    value={companyUrlsText}
                    onChange={(e) => setCompanyUrlsText(e.target.value)}
                    placeholder={"acme.com\nexample.org"}
                    className="w-full min-h-[120px] rounded-md border border-purple-200 bg-white px-3 py-2 text-sm"
                  />
                  <p className="text-xs text-gray-600">
                    Used when running phase 2 to enrich leads and personalize
                    outbound.
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {phaseLabels.map((label, index) => {
                const phaseId = index + 1;
                return (
                  <Card
                    key={label}
                    className="border border-purple-200/50 bg-white/80 backdrop-blur-sm"
                  >
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        {phaseId === 1 && (
                          <Brain className="h-4 w-4 text-purple-600" />
                        )}
                        {phaseId === 2 && (
                          <Rocket className="h-4 w-4 text-purple-600" />
                        )}
                        {phaseId === 3 && (
                          <Target className="h-4 w-4 text-purple-600" />
                        )}
                        {phaseId === 4 && (
                          <Users className="h-4 w-4 text-purple-600" />
                        )}
                        {phaseId === 5 && (
                          <CheckCircle2 className="h-4 w-4 text-purple-600" />
                        )}
                        {phaseId === 6 && (
                          <Workflow className="h-4 w-4 text-purple-600" />
                        )}
                        Phase {phaseId}: {label}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Button
                        size="sm"
                        onClick={() => runPhase(phaseId)}
                        disabled={running || !squad}
                      >
                        Run Phase {phaseId}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}
