"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  Clock3,
  RefreshCw,
} from "lucide-react";

type Props = {
  leadId: string;
  clinicId?: string;
};

function pct(value?: number | null): string {
  return `${Math.round((value || 0) * 100)}%`;
}

export function OrthoDriftCopilot({ leadId, clinicId }: Props) {
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [wearHours, setWearHours] = useState<string>("22");
  const [elastics, setElastics] = useState<string>("0.9");
  const [latestAssessment, setLatestAssessment] = useState<any | null>(null);
  const [summary, setSummary] = useState<any | null>(null);

  const load = useCallback(async () => {
    if (!leadId) return;
    setLoading(true);
    try {
      const q = clinicId ? `&clinicId=${clinicId}` : "";
      const [dashRes, assessRes] = await Promise.all([
        fetch(`/api/dental/ortho-copilot/dashboard?leadId=${leadId}${q}`),
        fetch(
          `/api/dental/ortho-copilot/assessments?leadId=${leadId}${q}&limit=1`,
        ),
      ]);

      const dashData = dashRes.ok ? await dashRes.json() : null;
      const assessData = assessRes.ok ? await assessRes.json() : null;

      setSummary(dashData?.summary || null);
      setLatestAssessment(
        Array.isArray(assessData?.assessments) &&
          assessData.assessments.length > 0
          ? assessData.assessments[0]
          : null,
      );
    } catch (error) {
      console.error("Failed loading Ortho Copilot:", error);
    } finally {
      setLoading(false);
    }
  }, [leadId, clinicId]);

  useEffect(() => {
    load();
  }, [load]);

  const urgencyTone = useMemo(() => {
    const urgency = String(latestAssessment?.urgency || "ROUTINE");
    if (urgency === "URGENT") return "destructive" as const;
    if (urgency === "SOON") return "secondary" as const;
    return "outline" as const;
  }, [latestAssessment?.urgency]);

  const runAssessment = async () => {
    if (!leadId || !clinicId) {
      toast.error("Select a clinic and patient first");
      return;
    }

    setRunning(true);
    try {
      const createRes = await fetch("/api/dental/ortho-copilot/captures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          clinicId,
          source: "IN_CLINIC",
        }),
      });

      if (!createRes.ok) throw new Error("Failed to create check-in session");
      const createData = await createRes.json();
      const captureId = createData?.capture?.id;
      if (!captureId) throw new Error("No capture id returned");

      const runRes = await fetch(
        `/api/dental/ortho-copilot/captures/${captureId}/submit`,
        { method: "POST" },
      );
      if (!runRes.ok) throw new Error("Failed to run analysis");

      toast.success("Ortho Copilot analysis updated");
      await load();
    } catch (error: any) {
      toast.error(error?.message || "Failed to run analysis");
    } finally {
      setRunning(false);
    }
  };

  const logCompliance = async () => {
    if (!leadId || !clinicId) return;
    setSubmitting(true);
    try {
      const response = await fetch(
        "/api/dental/ortho-copilot/compliance-signals",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leadId,
            clinicId,
            source: "STAFF_ENTRY",
            wearHours: Number(wearHours),
            elasticsAdherence: Number(elastics),
          }),
        },
      );

      if (!response.ok) throw new Error("Failed to save compliance");
      toast.success("Compliance signal logged");
      await runAssessment();
    } catch (error: any) {
      toast.error(error?.message || "Failed to log compliance");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecommendation = async (
    id: string,
    action: "accept" | "dismiss",
  ) => {
    try {
      const res = await fetch(
        `/api/dental/ortho-copilot/recommendations/${id}/${action}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            createTask: action === "accept",
          }),
        },
      );
      if (!res.ok) throw new Error("Recommendation update failed");
      toast.success(
        action === "accept"
          ? "Recommendation accepted"
          : "Recommendation dismissed",
      );
      await load();
    } catch (error: any) {
      toast.error(error?.message || "Failed to update recommendation");
    }
  };

  return (
    <Card className="bg-gradient-to-br from-emerald-50 via-white to-teal-50 border border-emerald-200 shadow-lg">
      <CardHeader className="pb-2 px-4 pt-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Brain className="h-4 w-4 text-emerald-700" />
            Ortho Drift Copilot
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={runAssessment}
            disabled={running || loading}
          >
            <RefreshCw
              className={`h-3 w-3 mr-1 ${running ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
        <p className="text-[10px] text-gray-600">
          AI-assisted progression risk and intervention prioritization. Decision
          support only.
        </p>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {!leadId ? (
          <div className="text-xs text-gray-500">
            Select a patient to start Ortho Copilot.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-2 text-[11px]">
              <div className="rounded border border-emerald-200 bg-white p-2">
                <div className="text-gray-500">Risk</div>
                <div className="font-semibold text-gray-900">
                  {pct(latestAssessment?.overallRiskScore)}
                </div>
              </div>
              <div className="rounded border border-emerald-200 bg-white p-2">
                <div className="text-gray-500">Drift</div>
                <div className="font-semibold text-gray-900">
                  {pct(latestAssessment?.driftScore)}
                </div>
              </div>
              <div className="rounded border border-emerald-200 bg-white p-2">
                <div className="text-gray-500">Confidence</div>
                <div className="font-semibold text-gray-900">
                  {pct(latestAssessment?.confidenceScore)}
                </div>
              </div>
              <div className="rounded border border-emerald-200 bg-white p-2">
                <div className="text-gray-500">Urgency</div>
                <div className="font-semibold text-gray-900">
                  <Badge variant={urgencyTone}>
                    {latestAssessment?.urgency || "N/A"}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11px]">
              <Clock3 className="h-3 w-3 text-gray-500" />
              <span className="text-gray-600">
                Tracked patients this month: {summary?.patientsTracked ?? 0}
              </span>
              {latestAssessment?.predictedDelayDays ? (
                <span className="text-amber-700">
                  Delay risk: ~{latestAssessment.predictedDelayDays} days
                </span>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Input
                value={wearHours}
                onChange={(e) => setWearHours(e.target.value)}
                placeholder="Wear hours"
                className="h-8 text-xs"
              />
              <Input
                value={elastics}
                onChange={(e) => setElastics(e.target.value)}
                placeholder="Elastics adherence (0-1)"
                className="h-8 text-xs"
              />
            </div>

            <Button
              size="sm"
              className="w-full bg-emerald-700 hover:bg-emerald-800"
              onClick={logCompliance}
              disabled={submitting || running || loading}
            >
              Log Compliance + Recompute
            </Button>

            <div className="space-y-2">
              {(latestAssessment?.recommendations || [])
                .slice(0, 3)
                .map((r: any) => (
                  <div
                    key={r.id}
                    className="rounded border border-emerald-100 bg-white p-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-semibold text-gray-900">
                          {r.title}
                        </div>
                        <div className="text-[11px] text-gray-600">
                          {r.rationale}
                        </div>
                      </div>
                      <Badge variant="outline">{r.status}</Badge>
                    </div>
                    {r.status === "PROPOSED" ? (
                      <div className="mt-2 flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px]"
                          onClick={() => handleRecommendation(r.id, "dismiss")}
                        >
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Dismiss
                        </Button>
                        <Button
                          size="sm"
                          className="h-7 text-[11px]"
                          onClick={() => handleRecommendation(r.id, "accept")}
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Accept + Task
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
