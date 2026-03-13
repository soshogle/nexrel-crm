"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  Copy,
} from "lucide-react";
import { toast } from "sonner";

type WorkerCommand = {
  commandId: string;
  stepId: string;
  actionType:
    | "navigate"
    | "click"
    | "type"
    | "extract"
    | "verify"
    | "open_app"
    | "run_command";
  target?: string;
  value?: string;
  status: "queued" | "running" | "completed" | "failed";
  detail?: string;
  createdAt: string;
  updatedAt: string;
};

export default function DesktopWorkerPage() {
  const params = useSearchParams();
  const initialSessionId = params.get("sessionId") || "";
  const [sessionId, setSessionId] = useState(initialSessionId);
  const [workerToken, setWorkerToken] = useState(
    params.get("workerToken") || "",
  );
  const [running, setRunning] = useState(false);
  const [autoExecute, setAutoExecute] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("idle");
  const [framePreview, setFramePreview] = useState(
    "Desktop worker bridge ready.",
  );
  const [commands, setCommands] = useState<WorkerCommand[]>([]);
  const [sessionOwnerId, setSessionOwnerId] = useState("");
  const heartbeatRef = useRef<number | null>(null);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const saved = sessionStorage.getItem(`live-run-token:${sessionId}`) || "";
    if (saved && !workerToken) {
      setWorkerToken(saved);
    }

    fetch(`/api/ai-employees/live-run/${sessionId}`)
      .then((response) => response.json().catch(() => ({})))
      .then((data) => {
        const ownerId = String(data?.session?.userId || "");
        if (ownerId) setSessionOwnerId(ownerId);
      })
      .catch(() => undefined);
  }, [sessionId, workerToken]);

  const bridge = async (payload: Record<string, any>) => {
    const response = await fetch("/api/ai-employees/live-run/desktop-bridge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        workerToken,
        ...payload,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.success) {
      throw new Error(data?.error || "Desktop bridge request failed");
    }
    return data;
  };

  const sendHeartbeat = async () => {
    const data = await bridge({
      action: "heartbeat",
      status: running ? "online" : "idle",
      capabilities: ["owner_desktop_bridge", "manual_ack", "auto_execute"],
      framePreview,
    });
    const state = String(data?.session?.output?.sessionState || "running");
    setStatus(state);
  };

  const ackCommand = async (
    commandId: string,
    result: "completed" | "failed",
    detail: string,
  ) => {
    await bridge({
      action: "ack_command",
      commandId,
      status: result,
      detail,
    });
    setCommands((prev) =>
      prev.map((cmd) =>
        cmd.commandId === commandId
          ? {
              ...cmd,
              status: result,
              detail,
              updatedAt: new Date().toISOString(),
            }
          : cmd,
      ),
    );
  };

  const pollCommands = async () => {
    const data = await bridge({ action: "pull_commands" });
    const pulled: WorkerCommand[] = Array.isArray(data?.commands)
      ? data.commands
      : [];
    if (pulled.length === 0) return;

    setCommands((prev) => {
      const map = new Map(prev.map((cmd) => [cmd.commandId, cmd]));
      for (const cmd of pulled) map.set(cmd.commandId, cmd);
      return Array.from(map.values()).sort(
        (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
      );
    });

    if (autoExecute) {
      for (const cmd of pulled) {
        setFramePreview(
          `Executing ${cmd.actionType.toUpperCase()} ${cmd.target || cmd.value || "step"}`,
        );
        await ackCommand(
          cmd.commandId,
          "completed",
          `Owner desktop bridge executed ${cmd.actionType}`,
        );
      }
      setFramePreview("Idle and waiting for next command.");
    }
  };

  const startWorker = async () => {
    if (!sessionId || !workerToken) {
      toast.error("Session ID and worker token are required");
      return;
    }
    setBusy(true);
    try {
      await sendHeartbeat();
      await pollCommands();
      heartbeatRef.current = window.setInterval(() => {
        sendHeartbeat().catch((error: any) => {
          setStatus("error");
          toast.error(error?.message || "Heartbeat failed");
        });
      }, 4000);
      pollRef.current = window.setInterval(() => {
        pollCommands().catch((error: any) => {
          toast.error(error?.message || "Command polling failed");
        });
      }, 2500);
      setRunning(true);
      toast.success("Desktop worker connected");
    } catch (error: any) {
      toast.error(error?.message || "Failed to start worker");
    } finally {
      setBusy(false);
    }
  };

  const stopWorker = () => {
    if (heartbeatRef.current) {
      window.clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setRunning(false);
    setStatus("idle");
    setFramePreview("Desktop worker paused.");
  };

  useEffect(() => {
    return () => stopWorker();
  }, []);

  const liveCommands = useMemo(
    () =>
      commands.filter(
        (cmd) => cmd.status === "running" || cmd.status === "queued",
      ),
    [commands],
  );

  const localRunnerCommand = useMemo(() => {
    const origin =
      typeof window === "undefined"
        ? "https://www.soshogle.com"
        : window.location.origin;
    if (!sessionId || !workerToken || !sessionOwnerId) return "";
    return `NEXREL_ALLOW_LOCAL_COMMANDS=true npm run desktop-worker -- --baseUrl ${origin} --sessionId ${sessionId} --userId ${sessionOwnerId} --token ${workerToken}`;
  }, [sessionId, workerToken, sessionOwnerId]);

  return (
    <div className="min-h-full px-8 py-6 text-zinc-100 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Owner Desktop Worker</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Connect your desktop bridge to execute live-run commands with
            Command Center governance.
          </p>
        </div>
        <Badge
          variant="outline"
          className={
            running ? "text-emerald-300 border-emerald-700" : "text-zinc-300"
          }
        >
          {running ? "Connected" : "Disconnected"} · {status}
        </Badge>
      </div>

      <div className="glass-panel rounded-xl p-5 space-y-4">
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 space-y-2">
          <p className="text-sm font-semibold text-amber-200">
            Native automation on another computer
          </p>
          <p className="text-xs text-zinc-300">
            On the other machine, pull the latest repo, run npm install, then
            start the worker command below. It launches Playwright and executes
            commands automatically.
          </p>
          <div className="rounded-md border border-zinc-700 bg-zinc-950/70 p-2">
            <p className="text-[11px] text-zinc-400 mb-1">Runner command</p>
            <p className="text-xs text-zinc-100 font-mono break-all">
              {localRunnerCommand ||
                "Fill session ID + worker token to generate command"}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (!localRunnerCommand) {
                toast.error("Missing session details for command");
                return;
              }
              navigator.clipboard
                .writeText(localRunnerCommand)
                .then(() => toast.success("Runner command copied"))
                .catch(() => toast.error("Failed to copy command"));
            }}
          >
            <Copy className="w-3.5 h-3.5 mr-1" />
            Copy Runner Command
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-zinc-400 mb-1">Live Session ID</p>
            <input
              value={sessionId}
              onChange={(event) => setSessionId(event.target.value)}
              placeholder="Paste live session id"
              className="w-full h-10 rounded-md border border-zinc-700 bg-zinc-900/60 px-3 text-sm text-zinc-100"
            />
          </div>
          <div>
            <p className="text-xs text-zinc-400 mb-1">One-time Worker Token</p>
            <input
              value={workerToken}
              onChange={(event) => setWorkerToken(event.target.value)}
              placeholder="Paste token from Live Console"
              className="w-full h-10 rounded-md border border-zinc-700 bg-zinc-900/60 px-3 text-sm text-zinc-100"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-[1fr_auto] gap-3 items-end">
          <div>
            <p className="text-xs text-zinc-400 mb-1">Desktop frame status</p>
            <input
              value={framePreview}
              onChange={(event) => setFramePreview(event.target.value)}
              className="w-full h-10 rounded-md border border-zinc-700 bg-zinc-900/60 px-3 text-sm text-zinc-100"
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-zinc-300 h-10">
            <input
              type="checkbox"
              checked={autoExecute}
              onChange={(event) => setAutoExecute(event.target.checked)}
            />
            Auto execute pulled commands
          </label>
        </div>

        <div className="flex gap-2 flex-wrap">
          {!running ? (
            <Button
              onClick={startWorker}
              className="bg-amber-500 hover:bg-amber-400 text-zinc-900"
              disabled={busy}
            >
              {busy ? (
                <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-1" />
              )}
              Start Bridge
            </Button>
          ) : (
            <Button
              onClick={stopWorker}
              className="bg-red-600 hover:bg-red-500 text-white"
            >
              <Pause className="w-4 h-4 mr-1" />
              Stop Bridge
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => {
              sendHeartbeat()
                .then(() => toast.success("Heartbeat sent"))
                .catch((error: any) =>
                  toast.error(error?.message || "Heartbeat failed"),
                );
            }}
            disabled={busy || !sessionId || !workerToken}
          >
            Send Heartbeat
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              pollCommands()
                .then(() => toast.success("Command poll complete"))
                .catch((error: any) =>
                  toast.error(error?.message || "Polling failed"),
                );
            }}
            disabled={busy || !sessionId || !workerToken}
          >
            Pull Commands
          </Button>
        </div>
      </div>

      <div className="glass-panel rounded-xl p-5 space-y-3">
        <h2 className="text-sm font-semibold">Command Queue</h2>
        <div className="space-y-2 max-h-[24rem] overflow-auto pr-1">
          {liveCommands.map((cmd) => (
            <div
              key={cmd.commandId}
              className="rounded-lg border border-zinc-700 bg-zinc-900/50 p-3 space-y-2"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-xs text-zinc-300">
                  {cmd.actionType.toUpperCase()} ·{" "}
                  {cmd.target || cmd.value || "step"}
                </p>
                <Badge variant="outline" className="text-xs">
                  {cmd.status}
                </Badge>
              </div>
              <p className="text-[11px] text-zinc-500">
                Command ID: {cmd.commandId}
              </p>
              {!autoExecute ? (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      ackCommand(
                        cmd.commandId,
                        "completed",
                        `Manual completion for ${cmd.actionType}`,
                      )
                        .then(() => toast.success("Command completed"))
                        .catch((error: any) =>
                          toast.error(error?.message || "Completion failed"),
                        )
                    }
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    Complete
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      ackCommand(
                        cmd.commandId,
                        "failed",
                        `Manual failure for ${cmd.actionType}`,
                      )
                        .then(() => toast.success("Command failed"))
                        .catch((error: any) =>
                          toast.error(error?.message || "Failure ack failed"),
                        )
                    }
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1" />
                    Fail
                  </Button>
                </div>
              ) : null}
            </div>
          ))}
          {liveCommands.length === 0 ? (
            <p className="text-sm text-zinc-500">No queued/running commands.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
