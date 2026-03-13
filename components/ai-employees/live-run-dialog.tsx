"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, PlayCircle } from "lucide-react";
import { toast } from "sonner";

type Device = {
  deviceId: string;
  label: string;
  os: string;
  status: string;
};

export function LiveRunDialog({
  open,
  onOpenChange,
  employeeRef,
  employeeType,
  employeeName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeRef: string;
  employeeType?: string;
  employeeName: string;
}) {
  const router = useRouter();
  const [goal, setGoal] = useState(
    `Improve ${employeeName} performance and execute high-impact actions`,
  );
  const [targetApps, setTargetApps] = useState("LinkedIn, Meta Ads");
  const [trustMode, setTrustMode] = useState<"crawl" | "walk" | "run">("crawl");
  const [executionTarget, setExecutionTarget] = useState<
    "cloud_browser" | "owner_desktop"
  >("cloud_browser");
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceId, setDeviceId] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch("/api/ai-employees/devices")
      .then((res) => (res.ok ? res.json() : { devices: [] }))
      .then((data) => {
        const list = Array.isArray(data?.devices) ? data.devices : [];
        setDevices(list);
        if (!deviceId && list[0]?.deviceId) {
          setDeviceId(String(list[0].deviceId));
        }
      })
      .catch(() => setDevices([]));
  }, [open]);

  const parsedApps = useMemo(
    () =>
      targetApps
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean),
    [targetApps],
  );

  const startRun = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/ai-employees/${employeeRef}/live-run`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            goal,
            targetApps: parsedApps,
            trustMode,
            executionTarget,
            deviceId: executionTarget === "owner_desktop" ? deviceId : null,
            employeeType,
            employeeName,
          }),
        },
      );

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.session?.id) {
        throw new Error(data?.error || "Failed to start live run");
      }

      const token = String(data?.session?.workerToken || "");
      const tokenExpiresAt = String(data?.session?.workerTokenExpiresAt || "");
      if (executionTarget === "owner_desktop" && token) {
        sessionStorage.setItem(`live-run-token:${data.session.id}`, token);
        sessionStorage.setItem(
          `live-run-token-exp:${data.session.id}`,
          tokenExpiresAt,
        );
        await navigator.clipboard
          .writeText(token)
          .then(() => toast.success("Desktop key copied to clipboard"))
          .catch(() => toast.success("Desktop key generated"));
      } else {
        toast.success("Live run session started");
      }
      onOpenChange(false);
      router.push(`/dashboard/ai-employees/live-console/${data.session.id}`);
    } catch (error: any) {
      toast.error(error?.message || "Failed to start live run");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-zinc-950 border border-zinc-700 text-zinc-100">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">
            Start Live Run - {employeeName}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            OpenClaw will plan and execute a live mission while you watch and
            control approvals.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-zinc-200">Owner Goal</Label>
            <Input value={goal} onChange={(e) => setGoal(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-200">Target Apps</Label>
            <Input
              value={targetApps}
              onChange={(e) => setTargetApps(e.target.value)}
              placeholder="LinkedIn, Meta Ads, CRM"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Label className="w-full text-zinc-200">Trust Mode</Label>
            {(["crawl", "walk", "run"] as const).map((m) => (
              <Button
                key={m}
                variant="ghost"
                className={
                  trustMode === m
                    ? "px-4 py-2 rounded-lg bg-amber-500 text-zinc-900 text-sm font-semibold hover:bg-amber-400"
                    : "px-4 py-2 rounded-lg border border-zinc-600 text-zinc-100 text-sm font-semibold hover:bg-zinc-800"
                }
                onClick={() => setTrustMode(m)}
              >
                {m.toUpperCase()}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Label className="w-full text-zinc-200">Execution Target</Label>
            <Button
              variant="ghost"
              className={
                executionTarget === "cloud_browser"
                  ? "px-4 py-2 rounded-lg bg-amber-500 text-zinc-900 text-sm font-semibold hover:bg-amber-400"
                  : "px-4 py-2 rounded-lg border border-zinc-600 text-zinc-100 text-sm font-semibold hover:bg-zinc-800"
              }
              onClick={() => setExecutionTarget("cloud_browser")}
            >
              Cloud Browser
            </Button>
            <Button
              variant="ghost"
              className={
                executionTarget === "owner_desktop"
                  ? "px-4 py-2 rounded-lg bg-amber-500 text-zinc-900 text-sm font-semibold hover:bg-amber-400"
                  : "px-4 py-2 rounded-lg border border-zinc-600 text-zinc-100 text-sm font-semibold hover:bg-zinc-800"
              }
              onClick={() => setExecutionTarget("owner_desktop")}
            >
              Owner Desktop
            </Button>
          </div>

          {executionTarget === "owner_desktop" && (
            <div className="space-y-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
              <Label className="text-amber-200">Desktop Key Flow</Label>
              <p className="text-xs text-zinc-300">
                When you click start, Nexrel auto-generates the desktop key,
                copies it, and opens the live console. Then paste that key on
                the other computer to connect the local worker app.
              </p>
              {devices.length === 0 ? (
                <div className="rounded-lg border border-zinc-700 bg-zinc-900/60 p-3 text-xs text-zinc-300">
                  No registered desktop devices yet. This is optional now: you
                  can still connect using the generated key.
                </div>
              ) : (
                <div className="grid gap-2">
                  {devices.map((d) => (
                    <button
                      key={d.deviceId}
                      type="button"
                      onClick={() => setDeviceId(d.deviceId)}
                      className={`text-left rounded-lg border p-3 ${
                        deviceId === d.deviceId
                          ? "border-amber-400 bg-amber-50"
                          : "border-zinc-700 bg-zinc-900/60"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm text-zinc-100">
                          {d.label}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {d.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1">
                        {d.deviceId} · {d.os}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-amber-500 hover:bg-amber-400 text-zinc-900"
            onClick={startRun}
            disabled={isLoading || !goal}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <PlayCircle className="w-4 h-4 mr-2" />
            )}
            Start Live Run
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
