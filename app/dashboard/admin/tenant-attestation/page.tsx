"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, FileText, RefreshCw, ShieldAlert } from "lucide-react";

type AttestationRow = {
  tenantId: string;
  ownerEmail: string;
  dbId: string;
  dbRegion: string;
  dedicated: boolean;
  configured: boolean;
  routingMode: string;
};

type AttestationData = {
  weekKey: string;
  preparedDate: string;
  totalActiveOwners: number;
  dedicatedOwners: number;
  nonDedicatedOwners: number;
  coveragePct: string;
  exceptions: number;
  rows: AttestationRow[];
};

type ProvisioningHealth = {
  env: {
    NEON_API_KEY: boolean;
    VERCEL_TOKEN: boolean;
    VERCEL_PROJECT_ID: boolean;
    VERCEL_TEAM_ID: boolean;
    TENANCY_REQUIRE_OWNER_OVERRIDE: boolean;
  };
  routingCoverage: {
    totalUsers: number;
    withConfiguredDbUrl: number;
    byMode: {
      TENANT_OVERRIDE: number;
      INDUSTRY_FALLBACK: number;
      DEFAULT_DATABASE: number;
    };
  };
};

export default function TenantAttestationPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [data, setData] = useState<AttestationData | null>(null);
  const [latestFile, setLatestFile] = useState<string | null>(null);
  const [health, setHealth] = useState<ProvisioningHealth | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user?.role !== "SUPER_ADMIN") {
      toast.error("Unauthorized - Super Admin access required");
      router.push("/dashboard");
      return;
    }
    void fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session?.user?.role]);

  async function fetchReport() {
    setLoading(true);
    try {
      const res = await fetch("/api/platform-admin/tenancy-attestation", {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to load report");
      const payload = await res.json();
      setData(payload.current ?? null);
      setLatestFile(payload.latestFile ?? null);
      setHealth(payload.provisioningHealth ?? null);
    } catch (error: any) {
      toast.error(error?.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  }

  async function generateNow() {
    setGenerating(true);
    try {
      const res = await fetch("/api/platform-admin/tenancy-attestation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 5000 }),
      });
      if (!res.ok) throw new Error("Failed to generate attestation");
      const payload = await res.json();
      toast.success(`Generated ${payload.weekKey}`);
      await fetchReport();
    } catch (error: any) {
      toast.error(error?.message || "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  function exportReport(format: "md" | "csv" | "json") {
    const url = `/api/platform-admin/tenancy-attestation?download=1&format=${format}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  const topExceptions = useMemo(
    () =>
      (data?.rows || [])
        .filter((r) => !r.dedicated || !r.configured)
        .slice(0, 25),
    [data],
  );

  if (status === "loading" || loading) {
    return <div className="p-6">Loading tenant attestation...</div>;
  }

  if (!session || session.user?.role !== "SUPER_ADMIN") {
    return (
      <Alert variant="destructive" className="m-8">
        <ShieldAlert className="h-4 w-4" />
        <AlertDescription>
          Unauthorized - You must be a Super Admin to access this page.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Tenant DB Attestation</h1>
          <p className="text-muted-foreground mt-1">
            Weekly tenant-to-database evidence report with export options.
          </p>
          {latestFile && (
            <p className="text-xs text-muted-foreground mt-1">
              Latest saved file: <code>{latestFile}</code>
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void fetchReport()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => void generateNow()} disabled={generating}>
            {generating ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileText className="h-4 w-4 mr-2" />
            )}
            Generate Weekly Report
          </Button>
        </div>
      </div>

      {data && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Week</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">
              {data.weekKey}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Active Owners</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">
              {data.totalActiveOwners}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Dedicated Coverage</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">
              {data.coveragePct}%
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Open Exceptions</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">
              {data.exceptions}
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Export Report</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => exportReport("md")}>
            <Download className="h-4 w-4 mr-2" />
            Export Markdown
          </Button>
          <Button variant="outline" onClick={() => exportReport("csv")}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => exportReport("json")}>
            <Download className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
        </CardContent>
      </Card>

      {health && (
        <Card>
          <CardHeader>
            <CardTitle>Provisioning Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 md:grid-cols-3">
              <Badge
                variant={health.env.NEON_API_KEY ? "default" : "destructive"}
              >
                NEON_API_KEY: {health.env.NEON_API_KEY ? "set" : "missing"}
              </Badge>
              <Badge
                variant={health.env.VERCEL_TOKEN ? "default" : "destructive"}
              >
                VERCEL_TOKEN: {health.env.VERCEL_TOKEN ? "set" : "missing"}
              </Badge>
              <Badge
                variant={
                  health.env.VERCEL_PROJECT_ID ? "default" : "destructive"
                }
              >
                VERCEL_PROJECT_ID:{" "}
                {health.env.VERCEL_PROJECT_ID ? "set" : "missing"}
              </Badge>
              <Badge
                variant={health.env.VERCEL_TEAM_ID ? "outline" : "secondary"}
              >
                VERCEL_TEAM_ID: {health.env.VERCEL_TEAM_ID ? "set" : "optional"}
              </Badge>
              <Badge
                variant={
                  health.env.TENANCY_REQUIRE_OWNER_OVERRIDE
                    ? "default"
                    : "destructive"
                }
              >
                TENANCY_REQUIRE_OWNER_OVERRIDE:{" "}
                {health.env.TENANCY_REQUIRE_OWNER_OVERRIDE ? "true" : "false"}
              </Badge>
            </div>

            <div className="text-sm text-muted-foreground">
              Routing modes - overrides:{" "}
              {health.routingCoverage.byMode.TENANT_OVERRIDE}, industry
              fallback: {health.routingCoverage.byMode.INDUSTRY_FALLBACK},
              default: {health.routingCoverage.byMode.DEFAULT_DATABASE}.
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Top Exceptions</CardTitle>
        </CardHeader>
        <CardContent>
          {topExceptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No exceptions detected.
            </p>
          ) : (
            <div className="space-y-2">
              {topExceptions.map((row) => (
                <div
                  key={row.tenantId}
                  className="flex flex-col gap-2 rounded border p-3 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-medium">{row.ownerEmail}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.tenantId}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{row.dbId}</Badge>
                    <Badge variant="outline">{row.dbRegion}</Badge>
                    <Badge variant={row.dedicated ? "default" : "destructive"}>
                      {row.dedicated ? "Dedicated" : "Shared/Legacy"}
                    </Badge>
                    {!row.configured && (
                      <Badge variant="destructive">Unconfigured</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
