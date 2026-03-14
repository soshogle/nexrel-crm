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
import { buildAiTarget } from "@/lib/ai-employees/ai-targets";

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
  const [remoteUrl, setRemoteUrl] = useState("");
  const [remoteSelector, setRemoteSelector] = useState("");
  const [remoteText, setRemoteText] = useState("");
  const [sendingRemote, setSendingRemote] = useState(false);
  const [agentFlags, setAgentFlags] = useState<{
    visionFallback: boolean;
    voiceDuplex: boolean;
  }>({ visionFallback: false, voiceDuplex: false });
  const [visionHint, setVisionHint] = useState("");
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
    fetch("/api/nexrel-ai/health")
      .then((res) => (res.ok ? res.json() : {}))
      .then((data: any) => {
        const flags = data?.readiness?.agentSystem?.flags || {};
        setAgentFlags({
          visionFallback: flags.visionFallback === true,
          voiceDuplex: flags.voiceDuplex === true,
        });
      })
      .catch(() => {
        setAgentFlags({ visionFallback: false, voiceDuplex: false });
      });
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    const savedToken =
      sessionStorage.getItem(`live-run-token:${sessionId}`) || "";
    const savedExp =
      sessionStorage.getItem(`live-run-token-exp:${sessionId}`) || "";
    if (savedToken) setWorkerToken(savedToken);
    if (savedExp) setWorkerTokenExpiresAt(savedExp);
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
    }, 1200);
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
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            baseUrl:
              typeof window === "undefined"
                ? "https://www.soshogle.com"
                : window.location.origin,
          }),
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
  const isTerminalState = ["completed", "failed", "stopped"].includes(state);
  const worker = session?.output?.worker || {};
  const workerRequired = Boolean(worker?.required);
  const workerConnected = Boolean(worker?.connected);
  const liveBoost = Boolean(worker?.liveBoost);
  const pendingCommands = Array.isArray(worker?.commands)
    ? worker.commands.filter((c: any) => c.status === "queued").length
    : 0;
  const executionTarget = String(
    session?.input?.executionTarget || "cloud_browser",
  );
  const workerFrameImage = String(worker?.frameImageDataUrl || "");
  const connectionCode = useMemo(() => {
    if (!workerToken || !sessionId) return "";
    const ownerId = String(session?.userId || "").trim();
    if (!ownerId) return "";
    const origin =
      typeof window === "undefined"
        ? "https://www.soshogle.com"
        : window.location.origin;
    const payload = {
      baseUrl: origin,
      sessionId,
      userId: ownerId,
      token: workerToken,
    };
    return btoa(JSON.stringify(payload))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
  }, [session?.userId, sessionId, workerToken]);

  const copyConnectionCode = async () => {
    if (!connectionCode) return;
    await navigator.clipboard
      .writeText(connectionCode)
      .then(() => toast.success("Connection code copied"))
      .catch(() => toast.error("Failed to copy connection code"));
  };

  const openDesktopWorkerBridge = () => {
    if (workerToken) {
      sessionStorage.setItem(`live-run-token:${sessionId}`, workerToken);
    }
    router.push(
      `/dashboard/agent-command-center/desktop-worker?sessionId=${encodeURIComponent(sessionId)}`,
    );
  };

  useEffect(() => {
    if (!sessionId) return;
    if (!workerRequired) return;

    fetch(`/api/ai-employees/live-run/${sessionId}/live-boost`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: true }),
    }).catch(() => undefined);

    return () => {
      fetch(`/api/ai-employees/live-run/${sessionId}/live-boost`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: false }),
        keepalive: true,
      }).catch(() => undefined);
    };
  }, [sessionId, workerRequired]);

  const queueWorkerCommand = async (payload: {
    actionType: string;
    target?: string;
    value?: string;
    meta?: Record<string, any>;
  }) => {
    setSendingRemote(true);
    try {
      const idempotencyKey =
        [
          sessionId,
          payload.actionType,
          payload.target || "",
          payload.value || "",
        ].join(":") || crypto.randomUUID();
      const correlationId = crypto.randomUUID();
      const response = await fetch(
        `/api/ai-employees/live-run/${sessionId}/worker-command`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-idempotency-key": idempotencyKey,
            "x-correlation-id": correlationId,
          },
          body: JSON.stringify(payload),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Failed to queue command");
      }
      toast.success(
        data?.deduped ? "Duplicate command ignored" : "Remote command queued",
      );
      await load();
    } catch (error: any) {
      toast.error(error?.message || "Failed to queue command");
    } finally {
      setSendingRemote(false);
    }
  };

  const queueVisionFallbackCommand = async (payload: {
    actionType: "click" | "type";
    x: number;
    y: number;
    text?: string;
  }) => {
    setSendingRemote(true);
    try {
      const idempotencyKey = [
        sessionId,
        "vision",
        payload.actionType,
        String(payload.x),
        String(payload.y),
        payload.text || "",
      ].join(":");
      const correlationId = crypto.randomUUID();
      const response = await fetch(
        `/api/ai-employees/live-run/${sessionId}/vision-fallback`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-idempotency-key": idempotencyKey,
            "x-correlation-id": correlationId,
          },
          body: JSON.stringify({
            actionType: payload.actionType,
            x: payload.x,
            y: payload.y,
            text: payload.text,
            targetHint: visionHint || undefined,
          }),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.success) {
        throw new Error(
          data?.error || "Failed to queue vision fallback command",
        );
      }
      toast.success(
        data?.deduped
          ? "Vision command already queued"
          : "Vision command queued",
      );
      await load();
    } catch (error: any) {
      toast.error(error?.message || "Failed to queue vision command");
    } finally {
      setSendingRemote(false);
    }
  };

  return (
    <div className="min-h-full p-6 space-y-4 text-zinc-100">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Live Console</h1>
          <p className="text-sm text-zinc-400">
            Watch Nexrel AI execute step-by-step with owner controls.
          </p>
        </div>
        <div className="flex gap-2">
          <Badge
            variant="outline"
            className={
              isTerminalState
                ? "text-zinc-500"
                : streamConnected
                  ? "text-emerald-700"
                  : "text-zinc-500"
            }
          >
            <Radio className="w-3 h-3 mr-1" />
            {isTerminalState
              ? "Session ended"
              : streamConnected
                ? "Live stream connected"
                : "Live stream reconnecting"}
          </Badge>
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/ai-employees")}
            {...buildAiTarget("live_console.back")}
          >
            Back
          </Button>
          <Button
            variant="outline"
            onClick={load}
            {...buildAiTarget("live_console.refresh")}
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              "Refresh"
            )}
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.3fr_1fr] gap-4">
        <div className="rounded-xl border border-zinc-700 bg-zinc-900/70 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-zinc-100">Live View</h2>
            <Badge variant="outline" className="text-xs">
              {state}
            </Badge>
          </div>
          <div className="h-80 rounded-lg border border-zinc-700 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.12),_transparent_35%),linear-gradient(180deg,#111827,#0a0a0a)] p-5">
            <p className="text-sm text-zinc-200">
              {session?.output?.framePreview || "Preparing session..."}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {steps.map((step: any) => (
                <div
                  key={step.id}
                  className="rounded-md border border-zinc-700 bg-zinc-900/70 px-2 py-1.5 text-xs text-zinc-300"
                >
                  {step.title}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-700 bg-zinc-900/50 p-3 space-y-2">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-zinc-100">
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
                {workerRequired ? (
                  <Badge
                    variant="outline"
                    className={liveBoost ? "text-cyan-600" : "text-zinc-600"}
                  >
                    {liveBoost ? "Live Boost On" : "Live Boost Off"}
                  </Badge>
                ) : null}
                {agentFlags.visionFallback ? (
                  <Badge variant="outline" className="text-indigo-600">
                    Vision Fallback Enabled
                  </Badge>
                ) : null}
                {agentFlags.voiceDuplex ? (
                  <Badge variant="outline" className="text-sky-600">
                    Duplex Interrupt Enabled
                  </Badge>
                ) : null}
              </div>
              <div className="text-xs text-zinc-400">
                Pending commands: {pendingCommands}
              </div>
            </div>

            {workerRequired ? (
              <div className="space-y-2">
                <div className="text-xs text-zinc-300">
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
                    {...buildAiTarget("live_console.worker.generate_token")}
                  >
                    <KeyRound className="w-3.5 h-3.5 mr-1" />
                    {mintingToken ? "Generating..." : "Generate Worker Token"}
                  </Button>
                  {workerToken ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={copyWorkerToken}
                      {...buildAiTarget("live_console.worker.copy_token")}
                    >
                      <Copy className="w-3.5 h-3.5 mr-1" />
                      Copy Token
                    </Button>
                  ) : null}
                  {connectionCode ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={copyConnectionCode}
                      {...buildAiTarget(
                        "live_console.worker.copy_connection_code",
                      )}
                    >
                      <Copy className="w-3.5 h-3.5 mr-1" />
                      Copy Connection Code
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={openDesktopWorkerBridge}
                    {...buildAiTarget(
                      "live_console.worker.open_desktop_bridge",
                    )}
                  >
                    Open Desktop Worker
                  </Button>
                </div>
                {workerToken ? (
                  <div className="rounded border border-zinc-700 bg-zinc-950/80 p-2">
                    <p className="text-[11px] text-zinc-400 mb-1">
                      One-time worker token (expires{" "}
                      {workerTokenExpiresAt
                        ? new Date(workerTokenExpiresAt).toLocaleTimeString()
                        : "soon"}
                      )
                    </p>
                    <p className="text-xs font-mono break-all text-zinc-100">
                      {workerToken}
                    </p>
                    {connectionCode ? (
                      <p className="text-[11px] text-zinc-500 mt-2">
                        Tip: use "Copy Connection Code" and paste once in the
                        desktop app.
                      </p>
                    ) : null}
                  </div>
                ) : null}
                <div className="rounded border border-zinc-700 bg-zinc-950/80 p-3 space-y-2">
                  <p className="text-xs font-semibold text-zinc-200">
                    Interactive Remote Control
                  </p>
                  <div className="rounded border border-zinc-800 bg-black/40 overflow-hidden">
                    {workerFrameImage ? (
                      <img
                        src={workerFrameImage}
                        alt="Remote desktop frame"
                        className="w-full max-h-72 object-contain cursor-crosshair"
                        onClick={(event) => {
                          const rect = (
                            event.currentTarget as HTMLImageElement
                          ).getBoundingClientRect();
                          const scaleX = 1600 / Math.max(rect.width, 1);
                          const scaleY = 940 / Math.max(rect.height, 1);
                          const x = Math.round(
                            (event.clientX - rect.left) * scaleX,
                          );
                          const y = Math.round(
                            (event.clientY - rect.top) * scaleY,
                          );
                          if (agentFlags.visionFallback) {
                            queueVisionFallbackCommand({
                              actionType: "click",
                              x,
                              y,
                            });
                            return;
                          }
                          queueWorkerCommand({
                            actionType: "click",
                            meta: { x, y },
                          });
                        }}
                      />
                    ) : (
                      <div className="h-56 flex items-center justify-center text-xs text-zinc-500">
                        Waiting for worker frame...
                      </div>
                    )}
                  </div>
                  <div className="grid md:grid-cols-[1fr_auto] gap-2">
                    {agentFlags.visionFallback ? (
                      <input
                        value={visionHint}
                        onChange={(e) => setVisionHint(e.target.value)}
                        placeholder="Vision hint (optional)"
                        className="h-9 rounded border border-zinc-700 bg-zinc-900/60 px-2 text-xs"
                        {...buildAiTarget("live_console.vision.hint_input")}
                      />
                    ) : null}
                  </div>
                  {agentFlags.visionFallback ? (
                    <div className="text-[11px] text-zinc-500">
                      Vision mode is on. Clicking the frame queues a
                      coordinate-based command with fallback metadata.
                    </div>
                  ) : null}
                  <div className="grid md:grid-cols-[1fr_auto] gap-2">
                    <input
                      value={remoteUrl}
                      onChange={(e) => setRemoteUrl(e.target.value)}
                      placeholder="https://example.com"
                      className="h-9 rounded border border-zinc-700 bg-zinc-900/60 px-2 text-xs"
                      {...buildAiTarget("live_console.remote.url_input")}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={sendingRemote || !remoteUrl.trim()}
                      onClick={() =>
                        queueWorkerCommand({
                          actionType: "navigate",
                          target: remoteUrl.trim(),
                        })
                      }
                      {...buildAiTarget("live_console.remote.navigate")}
                    >
                      Navigate
                    </Button>
                  </div>
                  <div className="grid md:grid-cols-[1fr_1fr_auto_auto] gap-2">
                    <input
                      value={remoteSelector}
                      onChange={(e) => setRemoteSelector(e.target.value)}
                      placeholder="CSS selector"
                      className="h-9 rounded border border-zinc-700 bg-zinc-900/60 px-2 text-xs"
                      {...buildAiTarget("live_console.remote.selector_input")}
                    />
                    <input
                      value={remoteText}
                      onChange={(e) => setRemoteText(e.target.value)}
                      placeholder="Text for type"
                      className="h-9 rounded border border-zinc-700 bg-zinc-900/60 px-2 text-xs"
                      {...buildAiTarget("live_console.remote.text_input")}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={sendingRemote || !remoteSelector.trim()}
                      onClick={() =>
                        queueWorkerCommand({
                          actionType: "click",
                          target: remoteSelector.trim(),
                        })
                      }
                      {...buildAiTarget("live_console.remote.click")}
                    >
                      Click
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={sendingRemote || !remoteText.trim()}
                      onClick={() =>
                        queueWorkerCommand({
                          actionType: "type",
                          target: remoteSelector.trim() || undefined,
                          value: remoteText,
                        })
                      }
                      {...buildAiTarget("live_console.remote.type")}
                    >
                      Type
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-400">
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
              {...buildAiTarget("live_console.control.pause")}
            >
              <Pause className="w-4 h-4 mr-1" />
              Pause
            </Button>
            <Button
              onClick={() => control("resume")}
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
              disabled={busy !== null}
              {...buildAiTarget("live_console.control.resume")}
            >
              <Play className="w-4 h-4 mr-1" />
              Resume
            </Button>
            <Button
              onClick={() => control("approve")}
              variant="outline"
              disabled={busy !== null}
              {...buildAiTarget("live_console.control.approve")}
            >
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Approve Step
            </Button>
            <Button
              onClick={() => control("reject")}
              variant="outline"
              disabled={busy !== null}
              {...buildAiTarget("live_console.control.reject")}
            >
              <XCircle className="w-4 h-4 mr-1" />
              Reject Step
            </Button>
            <Button
              onClick={() => control("takeover")}
              variant="outline"
              disabled={busy !== null}
              {...buildAiTarget("live_console.control.takeover")}
            >
              <Hand className="w-4 h-4 mr-1" />
              Takeover
            </Button>
            {agentFlags.voiceDuplex ? (
              <Button
                onClick={() => control("interrupt")}
                variant="outline"
                disabled={busy !== null}
                {...buildAiTarget("live_console.control.interrupt")}
              >
                Interrupt
              </Button>
            ) : null}
            <Button
              onClick={() => control("stop")}
              className="bg-red-600 hover:bg-red-500 text-white"
              disabled={busy !== null}
              {...buildAiTarget("live_console.control.stop")}
            >
              <Square className="w-4 h-4 mr-1" />
              Stop
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-700 bg-zinc-900/70 p-4 space-y-4">
          <h2 className="font-semibold text-zinc-100">Telemetry</h2>
          <div className="space-y-2 max-h-[28rem] overflow-auto pr-1">
            {events.map((event: any) => (
              <div
                key={event.id}
                className="rounded-lg border border-zinc-700 p-3 bg-zinc-900/60"
              >
                <p className="text-[11px] uppercase tracking-wide text-zinc-400">
                  {event.type}
                </p>
                <p className="text-sm text-zinc-100 mt-1">{event.message}</p>
                <p className="text-[11px] text-zinc-400 mt-1">
                  {new Date(event.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
            {events.length === 0 ? (
              <p className="text-sm text-zinc-400">No events yet.</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
