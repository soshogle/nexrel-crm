"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Brain,
  FileEdit,
  FlaskConical,
  Loader2,
  Megaphone,
  Sparkles,
  Target,
  Workflow,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export function ViralPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [projectName, setProjectName] = useState("Viral Growth Loop");
  const [niche, setNiche] = useState("Dental marketing automation");
  const [conversionGoal, setConversionGoal] = useState("qualified leads");
  const [status, setStatus] = useState<any>(null);

  const callViral = useCallback(async (parameters: any) => {
    setRunning(true);
    try {
      const response = await fetch("/api/crm-voice-agent/functions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          function_name: "openclaw_operate",
          parameters: {
            mode: "viral_loop",
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

  const refreshStatus = useCallback(async () => {
    setLoading(true);
    try {
      const data = await callViral({ action: "status" }).catch(() => null);
      setStatus(data || null);
    } finally {
      setLoading(false);
    }
  }, [callViral]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const project = status?.project;
  const progress = useMemo(() => {
    const phaseStatus = project?.phaseStatus || {};
    const completed = Object.values(phaseStatus).filter(
      (value) => value === "completed",
    ).length;
    return {
      completed,
      total: 8,
      currentPhase: project?.currentPhase || 1,
    };
  }, [project]);

  const initializeProject = async () => {
    try {
      const data = await callViral({
        action: "initialize",
        projectName,
        niche,
        conversionGoal,
      });
      setStatus(data);
      toast.success("Viral project initialized");
    } catch (error: any) {
      toast.error(error?.message || "Failed to initialize");
    }
  };

  const runPhase = async (phaseId: number) => {
    try {
      const data = await callViral({
        action: "run_phase",
        projectId: project?.projectId,
        phaseId,
      });
      setStatus(data);
      toast.success(`Phase ${phaseId} completed`);
    } catch (error: any) {
      toast.error(error?.message || `Failed phase ${phaseId}`);
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

      <div className="relative z-10 p-8 space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
                <span className="text-gray-700">Marketing</span>
                <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 bg-clip-text text-transparent">
                  Viral
                </span>
              </h1>
              <p className="text-gray-600 mt-1">
                OpenClaw + AI Brain autonomous social media loop (draft-first).
              </p>
            </div>
          </div>
          <Badge className="bg-purple-100 text-purple-700 border border-purple-200 w-fit">
            {project?.trustStage
              ? `Trust: ${project.trustStage}`
              : "Not initialized"}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border border-purple-200/50 bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600">Project</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold text-gray-900">
              {project?.projectName || "Not initialized"}
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
        </div>

        <Tabs defaultValue="setup" className="w-full">
          <TabsList className="bg-white/80 border border-purple-200 backdrop-blur-sm">
            <TabsTrigger
              value="setup"
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
            >
              <Workflow className="w-4 h-4 mr-2" /> Setup
            </TabsTrigger>
            <TabsTrigger
              value="modules"
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
            >
              <Sparkles className="w-4 h-4 mr-2" /> Viral Modules
            </TabsTrigger>
          </TabsList>

          <TabsContent value="setup" className="mt-6 space-y-4">
            <Card className="border border-purple-200/50 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Initialize Viral Project</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
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
                <div className="flex gap-2">
                  <Button onClick={initializeProject} disabled={running}>
                    {running && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}{" "}
                    Initialize
                  </Button>
                  <Button
                    variant="outline"
                    onClick={refreshStatus}
                    disabled={running}
                  >
                    Refresh Status
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="modules" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="border border-purple-200/50 bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-purple-600" /> Niche
                    Research
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-gray-600">
                  <p>Research winning hooks, CTA styles, and visual formats.</p>
                  <Button
                    size="sm"
                    onClick={() => runPhase(1)}
                    disabled={running || !project}
                  >
                    Run Phase 1
                  </Button>
                </CardContent>
              </Card>

              <Card className="border border-purple-200/50 bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Brain className="w-4 h-4 text-purple-600" /> Content
                    Creation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-gray-600">
                  <p>
                    Generate viral content package from current winning
                    strategy.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => runPhase(2)}
                    disabled={running || !project}
                  >
                    Run Phase 2
                  </Button>
                </CardContent>
              </Card>

              <Card className="border border-purple-200/50 bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileEdit className="w-4 h-4 text-purple-600" /> Draft
                    Pipeline
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-gray-600">
                  <p>
                    Create draft-ready campaign + human review task for publish.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => runPhase(3)}
                    disabled={running || !project}
                  >
                    Run Phase 3
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
              <Card className="border border-purple-200/50 bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="w-4 h-4 text-purple-600" /> Next Wave
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-gray-600">
                  Diagnostics, hook rotation, goal tracking, and memory backup
                  are queued for the next phase rollout.
                </CardContent>
              </Card>
              <Card className="border border-purple-200/50 bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-purple-600" /> Posting
                    Policy
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-gray-600">
                  Draft-first mode is enforced. Human publishes from mobile
                  after adding sound/trending context.
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
