"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Pause,
  Play,
  Square,
  CheckCircle2,
  XCircle,
  Hand,
  RefreshCw,
  Radio,
  KeyRound,
  Copy,
} from "lucide-react";
import { toast } from "sonner";

export default function LiveConsolePage() {
  const params = useParams<{ sessionId: string }>();
  const router = useRouter();
  const sessionId = String(params?.sessionId || "");
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [streamConnected, setStreamConnected] = useState(false);
  const [workerToken, setWorkerToken] = useState<string | null>(null);
  const [workerTokenExpiresAt, setWorkerTokenExpiresAt] = useState<
    string | null
  >(null);
  const [mintingToken, setMintingToken] = useState(false);
  const streamRef = useRef<EventSource | null>(null);

  const load = async () => {
    if (!sessionId) return;
    const response = await fetch(`/api/ai-employees/live-run/${sessionId}`);
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      setSession(data.session);
    }
    setLoading(false);
  };

  const tick = async () => {
    if (!sessionId) return;
    await fetch(`/api/ai-employees/live-run/${sessionId}/tick`, {
      method: "POST",
    });
  };

  useEffect(() => {
    load();
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    const source = new EventSource(
      `/api/ai-employees/live-run/${sessionId}/events`,
    );
    streamRef.current = source;

    source.onopen = () => setStreamConnected(true);
    source.onerror = () => setStreamConnected(false);

    source.addEventListener("state", (event) => {
      const payload = JSON.parse((event as MessageEvent).data || "{}");
      setSession((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          progress:
            typeof payload.progress === "number"
              ? payload.progress
              : prev.progress,
          output: {
            ...(prev.output || {}),
            sessionState: payload.sessionState || prev.output?.sessionState,
            framePreview: payload.framePreview || prev.output?.framePreview,
            steps: Array.isArray(payload.steps)
              ? payload.steps
              : prev.output?.steps || [],
            worker: payload.worker || prev.output?.worker || null,
            events: Array.isArray(payload.events)
              ? payload.events
              : prev.output?.events || [],
          },
        };
      });
    });

    source.addEventListener("error", () => {
      setStreamConnected(false);
    });

    return () => {
      source.close();
      streamRef.current = null;
      setStreamConnected(false);
    };
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    const interval = setInterval(async () => {
      const state = session?.output?.sessionState;
      if (state === "running" || state === "planning") {
        await tick();
      }
      await load();
    }, 2000);
    return () => clearInterval(interval);
  }, [sessionId, session?.output?.sessionState]);

  const control = async (action: string) => {
    setBusy(action);
    try {
      await fetch(`/api/ai-employees/live-run/${sessionId}/control`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      await load();
    } finally {
      setBusy(null);
    }
  };

  const mintToken = async () => {
    setMintingToken(true);
    try {
      const response = await fetch(
        `/api/ai-employees/live-run/${sessionId}/worker-token`,
        {
          method: "POST",
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.token) {
        throw new Error(data?.error || "Failed to mint worker token");
      }
      setWorkerToken(String(data.token));
      setWorkerTokenExpiresAt(String(data.expiresAt || ""));
      toast.success("Worker token generated");
      await navigator.clipboard
        .writeText(String(data.token))
        .then(() => toast.success("Token copied to clipboard"))
        .catch(() => null);
      await load();
    } catch (error: any) {
      toast.error(error?.message || "Failed to mint worker token");
    } finally {
      setMintingToken(false);
    }
  };

  const copyWorkerToken = async () => {
    if (!workerToken) return;
    await navigator.clipboard
      .writeText(workerToken)
      .then(() => toast.success("Token copied"))
      .catch(() => toast.error("Failed to copy token"));
  };

  const events = useMemo(() => {
    const list = Array.isArray(session?.output?.events)
      ? session.output.events
      : [];
    return [...list].reverse();
  }, [session]);

  const steps = Array.isArray(session?.output?.steps)
    ? session.output.steps
    : [];
  const state = String(session?.output?.sessionState || "queued");
  const worker = session?.output?.worker || {};
  const workerRequired = Boolean(worker?.required);
  const workerConnected = Boolean(worker?.connected);
  const pendingCommands = Array.isArray(worker?.commands)
    ? worker.commands.filter((c: any) => c.status === "queued").length
    : 0;
  const executionTarget = String(
    session?.input?.executionTarget || "cloud_browser",
  );

  return (
    <div className="p-6 space-y-4 text-zinc-100">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Live Console</h1>
          <p className="text-sm text-zinc-500">
            Watch Nexrel AI execute step-by-step with owner controls.
          </p>
        </div>
        <div className="flex gap-2">
          <Badge
            variant="outline"
            className={streamConnected ? "text-emerald-700" : "text-zinc-500"}
          >
            <Radio className="w-3 h-3 mr-1" />
            {streamConnected
              ? "Live stream connected"
              : "Live stream reconnecting"}
          </Badge>
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/ai-employees")}
          >
            Back
          </Button>
          <Button variant="outline" onClick={load}>
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              "Refresh"
            )}
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.3fr_1fr] gap-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-zinc-900">Live View</h2>
            <Badge variant="outline" className="text-xs">
              {state}
            </Badge>
          </div>
          <div className="h-80 rounded-lg border border-zinc-200 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.16),_transparent_40%),linear-gradient(180deg,#ffffff,#f4f4f5)] p-5">
            <p className="text-sm text-zinc-700">
              {session?.output?.framePreview || "Preparing session..."}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {steps.map((step: any) => (
                <div
                  key={step.id}
                  className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-600"
                >
                  {step.title}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 space-y-2">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-zinc-900">
                  Worker Link
                </h3>
                <Badge variant="outline" className="text-xs">
                  {executionTarget === "owner_desktop"
                    ? "Owner Desktop"
                    : "Cloud Browser"}
                </Badge>
                {workerRequired ? (
                  <Badge
                    variant="outline"
                    className={
                      workerConnected ? "text-emerald-700" : "text-amber-700"
                    }
                  >
                    {workerConnected ? "Connected" : "Waiting"}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-zinc-600">
                    Optional
                  </Badge>
                )}
              </div>
              <div className="text-xs text-zinc-500">
                Pending commands: {pendingCommands}
              </div>
            </div>

            {workerRequired ? (
              <div className="space-y-2">
                <div className="text-xs text-zinc-600">
                  Last heartbeat:{" "}
                  {worker?.lastHeartbeatAt
                    ? new Date(worker.lastHeartbeatAt).toLocaleString()
                    : "none"}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={mintingToken}
                    onClick={mintToken}
                  >
                    <KeyRound className="w-3.5 h-3.5 mr-1" />
                    {mintingToken ? "Generating..." : "Generate Worker Token"}
                  </Button>
                  {workerToken ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={copyWorkerToken}
                    >
                      <Copy className="w-3.5 h-3.5 mr-1" />
                      Copy Token
                    </Button>
                  ) : null}
                </div>
                {workerToken ? (
                  <div className="rounded border border-zinc-200 bg-white p-2">
                    <p className="text-[11px] text-zinc-500 mb-1">
                      One-time worker token (expires{" "}
                      {workerTokenExpiresAt
                        ? new Date(workerTokenExpiresAt).toLocaleTimeString()
                        : "soon"}
                      )
                    </p>
                    <p className="text-xs font-mono break-all text-zinc-800">
                      {workerToken}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-xs text-zinc-600">
                Session can run in simulated mode. Switch to Owner Desktop to
                attach a local worker.
              </p>
            )}
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={() => control("pause")}
              className="bg-amber-500 hover:bg-amber-400 text-zinc-900"
              disabled={busy !== null}
            >
              <Pause className="w-4 h-4 mr-1" />
              Pause
            </Button>
            <Button
              onClick={() => control("resume")}
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
              disabled={busy !== null}
            >
              <Play className="w-4 h-4 mr-1" />
              Resume
            </Button>
            <Button
              onClick={() => control("approve")}
              variant="outline"
              disabled={busy !== null}
            >
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Approve Step
            </Button>
            <Button
              onClick={() => control("reject")}
              variant="outline"
              disabled={busy !== null}
            >
              <XCircle className="w-4 h-4 mr-1" />
              Reject Step
            </Button>
            <Button
              onClick={() => control("takeover")}
              variant="outline"
              disabled={busy !== null}
            >
              <Hand className="w-4 h-4 mr-1" />
              Takeover
            </Button>
            <Button
              onClick={() => control("stop")}
              className="bg-red-600 hover:bg-red-500 text-white"
              disabled={busy !== null}
            >
              <Square className="w-4 h-4 mr-1" />
              Stop
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 space-y-4">
          <h2 className="font-semibold text-zinc-900">Telemetry</h2>
          <div className="space-y-2 max-h-[28rem] overflow-auto pr-1">
            {events.map((event: any) => (
              <div
                key={event.id}
                className="rounded-lg border border-zinc-200 p-3 bg-zinc-50"
              >
                <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                  {event.type}
                </p>
                <p className="text-sm text-zinc-800 mt-1">{event.message}</p>
                <p className="text-[11px] text-zinc-500 mt-1">
                  {new Date(event.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
            {events.length === 0 ? (
              <p className="text-sm text-zinc-500">No events yet.</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
