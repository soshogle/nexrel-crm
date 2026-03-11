"use client";

import { ArrowLeft, Megaphone, Sparkles, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function MarketingPage() {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [projectName, setProjectName] = useState("Viral Growth Loop");
  const [niche, setNiche] = useState("Dental marketing automation");
  const [conversionGoal, setConversionGoal] = useState("qualified leads");
  const [taskTitle, setTaskTitle] = useState(
    "Review this week's campaign plan",
  );

  const runMarketingSetup = async () => {
    setRunning(true);
    try {
      const response = await fetch("/api/crm-voice-agent/functions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          function_name: "automation_operate",
          parameters: {
            mode: "viral_loop",
            action: "initialize",
            projectName,
            niche,
            conversionGoal,
          },
        }),
      });
      const data = await response.json();
      if (!response.ok || data?.error) {
        throw new Error(
          data?.error || "Failed to initialize marketing workflow",
        );
      }
      toast.success(
        "Marketing workflow initialized. Open Viral to run phases.",
      );
    } catch (error: any) {
      toast.error(error?.message || "Failed to initialize marketing workflow");
    } finally {
      setRunning(false);
    }
  };

  const createPlanningTask = async () => {
    setRunning(true);
    try {
      const response = await fetch("/api/crm-voice-agent/functions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          function_name: "create_task",
          parameters: {
            title: taskTitle,
            description:
              "Owner planning task created from Marketing page. Review Viral diagnostics, Campaign timing, and Sales follow-up alignment.",
            priority: "HIGH",
          },
        }),
      });
      const data = await response.json();
      if (!response.ok || data?.error) {
        throw new Error(data?.error || "Failed to create task");
      }
      toast.success("Planning task created");
    } catch (error: any) {
      toast.error(error?.message || "Failed to create task");
    } finally {
      setRunning(false);
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
              Control your marketing workflows from one place.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border border-purple-200/50 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-600" /> Viral
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-600">
              <p>
                Run the viral loop with trust-stage controls, diagnostics, and
                platform draft pipelines.
              </p>
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
              <p>
                Manage your email/SMS campaigns directly from the campaigns
                page.
              </p>
              <Link href="/dashboard/campaigns">
                <Button size="sm" variant="outline">
                  Open Campaigns
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <Card className="border border-purple-300/60 bg-white/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base">Owner Quick Tasks</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-800">
                Start Marketing Workflow
              </p>
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
              <Button disabled={running} onClick={runMarketingSetup}>
                Initialize Viral Workflow
              </Button>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-800">
                Create Owner Planning Task
              </p>
              <Input
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Task title"
              />
              <Button
                variant="outline"
                disabled={running}
                onClick={createPlanningTask}
              >
                Create Task
              </Button>
              <p className="text-xs text-gray-600">
                Suggested flow: initialize workflow, run Viral phases, then
                execute from Campaigns.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-purple-300/60 bg-white/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base">Owner Playbook</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-700">
            <p>
              Step 1: Initialize the marketing workflow with project, niche, and
              goal to create your active strategy track.
            </p>
            <p>
              Step 2: Open Viral and run phases in order so content strategy,
              diagnostics, and optimization outputs are generated.
            </p>
            <p>
              Step 3: Open Campaigns to schedule and execute distribution using
              the latest strategy outputs.
            </p>
            <p>
              Step 4: Create planning tasks here when you need owner/team review
              before launch.
            </p>
            <p className="text-xs text-gray-600">
              Expected result: one clear marketing flow from planning to
              execution with fewer manual handoffs.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
