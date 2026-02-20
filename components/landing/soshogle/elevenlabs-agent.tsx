"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { GeometricShapes } from "./geometric-shapes";
import { Conversation } from "@elevenlabs/client";
import {
  getEasternTimeContext,
  getEasternDateTime,
  getEasternDay,
} from "@/lib/voice-time-context";

const APP_LOGO = "/soshogle-logo.png";

interface ConversationMessage {
  role: "agent" | "user";
  content: string;
  timestamp: number;
}

interface ElevenLabsAgentProps {
  agentId: string;
  onAudioLevel?: (level: number) => void;
  onConversationEnd?: (transcript: ConversationMessage[], audioBlob?: Blob) => void;
  onAgentSpeakingChange?: (isSpeaking: boolean) => void;
  onMessage?: (message: ConversationMessage) => void;
  dynamicVariables?: Record<string, string>;
  autoStart?: boolean;
  compactMode?: boolean;
  hideWhenIdle?: boolean;
  /** Theodora-style: frameless, GeometricShapes with bare, minimal overlay */
  variant?: 'default' | 'frameless';
  /** When true, suppress console.log for user-initiated disconnects (site agents, website preview). Landing + CRM assistant keep full logging. */
  suppressUserDisconnectLog?: boolean;
}

type AgentStatus = "idle" | "connecting" | "listening" | "speaking" | "processing";

export function ElevenLabsAgent({
  agentId,
  onAudioLevel,
  onConversationEnd,
  onAgentSpeakingChange,
  onMessage,
  dynamicVariables,
  compactMode = false,
  hideWhenIdle = false,
  variant = 'default',
  suppressUserDisconnectLog = false,
}: ElevenLabsAgentProps) {
  const isFrameless = variant === 'frameless';
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [status, setStatus] = useState<AgentStatus>("idle");
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const conversationRef = useRef<any>(null);
  const conversationMessagesRef = useRef<ConversationMessage[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioConnectedRef = useRef<boolean>(false);

  const startConversation = async () => {
    // If you see this in console, the new signed-URL flow is deployed (WebSocket, not LiveKit)
    console.log("✅ [Landing Voice] Using signed URL + WebSocket (bypasses LiveKit error_type crash)");
    setIsLoading(true);
    setError(null);
    setStatus("connecting");

    try {
      conversationMessagesRef.current = [];

      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = micStream;

      audioChunksRef.current = [];
      try {
        mediaRecorderRef.current = new MediaRecorder(micStream, {
          mimeType: "audio/webm;codecs=opus",
        });
        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };
        mediaRecorderRef.current.start(1000);
      } catch (recorderError) {
        console.error("MediaRecorder setup failed:", recorderError);
      }

      if (!agentId || agentId.trim() === "") {
        throw new Error("Agent ID is required");
      }

      // Signed URL + WebSocket connects to api.elevenlabs.io - bypasses LiveKit (error_type crash)
      const urlRes = await fetch(`/api/elevenlabs/signed-url?agentId=${encodeURIComponent(agentId.trim())}`);
      if (!urlRes.ok) {
        const err = await urlRes.json().catch(() => ({ error: "Failed to get connection" }));
        throw new Error(err.error || "Failed to connect");
      }
      const { signedUrl } = await urlRes.json();
      if (!signedUrl) throw new Error("No connection URL");

      // Create AudioContext before connection — onConnect will use it to route SDK audio
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      if (audioContextRef.current.state === "suspended") {
        try {
          await audioContextRef.current.resume();
        } catch (e) {
          console.warn("[Voice] AudioContext resume:", e);
        }
      }

      conversationRef.current = await Conversation.startSession({
        signedUrl,
        connectionType: "websocket",
        connectionDelay: { android: 3000, ios: 2000, default: 2000 },
        dynamicVariables: {
          ...(dynamicVariables || {}),
          current_datetime: getEasternDateTime(),
          current_day: getEasternDay(),
          timezone: "America/New_York",
          current_date_time_eastern: getEasternTimeContext(),
        },
        onConnect: () => {
          setIsConnected(true);
          setIsLoading(false);
          try {
            conversationRef.current?.setVolume?.({ volume: 1 });
          } catch {}
          try {
            conversationRef.current?.sendContextualUpdate?.(getEasternTimeContext());
          } catch {}
          setStatus("listening");
          // Route SDK audio element to speakers (SDK may create it after first chunk)
          // Only connect once - createMediaElementSource fails if element already connected
          const tryConnectAudio = () => {
            if (audioConnectedRef.current) return true;
            try {
              const audioElement = document.querySelector("audio");
              if (audioElement && audioContextRef.current && analyserRef.current) {
                const source = audioContextRef.current.createMediaElementSource(audioElement);
                source.connect(analyserRef.current);
                analyserRef.current.connect(audioContextRef.current.destination);
                audioConnectedRef.current = true;
                console.log("[Voice] Audio routed to speakers");
                return true;
              }
            } catch (e) {
              // InvalidStateError = element already connected (SDK or another instance) - stop retrying
              if (e instanceof Error && e.name === "InvalidStateError") {
                audioConnectedRef.current = true;
              } else {
                console.warn("[Voice] Audio connect:", e);
              }
            }
            return false;
          };
          const attempt = (delay: number) => {
            setTimeout(() => {
              if (tryConnectAudio()) return;
              if (delay < 4000) attempt(delay + 400);
            }, delay);
          };
          attempt(0);
          attempt(400);
          attempt(800);
          attempt(1200);
          attempt(2000);
          attempt(3000);
        },
        onDisconnect: (details?: any) => {
          // When suppressUserDisconnectLog: skip logging user-initiated disconnects (reason:"user")
          const isUserInitiated = details?.reason === "user";
          if (!(suppressUserDisconnectLog && isUserInitiated)) {
            console.log("[Voice] Disconnected", details ? JSON.stringify(details) : "");
          }
          audioConnectedRef.current = false;
          setIsConnected(false);
          setIsAgentSpeaking(false);
          setStatus("idle");

          let audioBlob: Blob | undefined;
          if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
            if (audioChunksRef.current.length > 0) {
              audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
            }
          }

          if (audioStreamRef.current) {
            audioStreamRef.current.getTracks().forEach((track) => track.stop());
            audioStreamRef.current = null;
          }

          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
          }
          if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
          }

          conversationRef.current = null;

          if (onConversationEnd) {
            onConversationEnd(conversationMessagesRef.current, audioBlob);
          }
        },
        onError: (error: any) => {
          console.error("[Voice] ElevenLabs error:", error);
          setError("Connection error. Please try again.");
          setIsLoading(false);
          setStatus("idle");
        },
        onStatusChange: (status: string) => {
          console.log("[Voice] Status:", status);
        },
        onMessage: (message: any) => {
          if (message.message) {
            const msg: ConversationMessage = {
              role: message.source === "ai" ? "agent" : "user",
              content: message.message,
              timestamp: Date.now(),
            };
            conversationMessagesRef.current.push(msg);
            if (onMessage) onMessage(msg);
          }
        },
        onModeChange: (mode: any) => {
          if (mode.mode === "speaking") {
            setIsAgentSpeaking(true);
            setStatus("speaking");
            if (onAgentSpeakingChange) onAgentSpeakingChange(true);
          } else if (mode.mode === "listening") {
            setIsAgentSpeaking(false);
            setStatus("listening");
            if (onAgentSpeakingChange) onAgentSpeakingChange(false);
            setAudioLevel(0);
            if (onAudioLevel) onAudioLevel(0);
          }
        },
      });

      const dataArray = new Uint8Array(analyserRef.current!.frequencyBinCount);

      const updateAudioLevel = () => {
        if (analyserRef.current && isAgentSpeaking) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          const normalized = Math.min(average / 128, 1);
          setAudioLevel(normalized);
          if (onAudioLevel) onAudioLevel(normalized);
        } else if (!isAgentSpeaking) {
          setAudioLevel(0);
          if (onAudioLevel) onAudioLevel(0);
        }
        animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
      };

      updateAudioLevel();
    } catch (err: any) {
      console.error("Error starting conversation:", err);
      if (err.name === "NotAllowedError") {
        setError("Microphone access denied. Please grant permission and try again.");
      } else {
        setError(err.message || "Could not start conversation. Please try again.");
      }
      setIsLoading(false);
    }
  };

  const stopConversation = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.error("Error stopping media recorder:", e);
      }
    }
    mediaRecorderRef.current = null;
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }
    if (conversationRef.current) {
      try {
        conversationRef.current.endSession();
      } catch (e) {
        console.error("Error ending session:", e);
      }
      conversationRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsConnected(false);
    setIsAgentSpeaking(false);
    setAudioLevel(0);
    if (onAudioLevel) onAudioLevel(0);
    if (onAgentSpeakingChange) onAgentSpeakingChange(false);
  };

  useEffect(() => {
    return () => stopConversation();
  }, []);

  if (hideWhenIdle && !isConnected && !isLoading) {
    return <div className="hidden" aria-hidden="true" />;
  }

  if (isFrameless) {
    return (
      <div className="relative w-full h-full min-h-[320px] flex flex-col items-center justify-center rounded-2xl overflow-hidden bg-black/10">
        <div className="absolute inset-0">
          <GeometricShapes audioLevel={audioLevel} isAgentSpeaking={isAgentSpeaking} bare={false} />
        </div>
        {!isConnected && !isLoading && !error && (
          <button
            onClick={() => agentId && startConversation()}
            className="absolute inset-0 flex items-center justify-center z-10 cursor-pointer group"
            aria-label="Start conversation"
          >
            <div
              className="flex h-20 w-20 items-center justify-center rounded-full transition-transform group-hover:scale-110"
              style={{
                background: "rgba(139, 92, 246, 0.2)",
                border: "2px solid rgba(34, 211, 238, 0.4)",
              }}
            >
              <Mic className="w-10 h-10 animate-pulse" style={{ color: "#22d3ee" }} />
            </div>
          </button>
        )}
        {isLoading && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-2xl z-10">
            <p className="text-sm font-medium text-white/90">Connecting...</p>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 rounded-2xl z-10 p-4">
            <p className="text-sm text-red-300 mb-2">{error}</p>
            <Button size="sm" onClick={startConversation} className="bg-primary hover:bg-primary/90">
              Retry
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full flex flex-col items-center justify-center">
      {!isConnected && !isLoading && (
        <div className="text-center space-y-4 z-10">
          {!compactMode && (
            <div className="space-y-2">
              <h3 className="text-2xl font-semibold">Talk to Your AI Brain Assistant</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Click the button below to start a live conversation. Your browser will ask for microphone permission.
              </p>
            </div>
          )}
          <Button
            size={compactMode ? "default" : "lg"}
            onClick={startConversation}
            className="bg-primary hover:bg-primary/90 gap-2"
            disabled={!agentId}
          >
            <Mic className="w-5 h-5" />
            Start Conversation
          </Button>
          {!agentId && <p className="text-sm text-muted-foreground">Loading agent...</p>}
          {error && (
            <div className="space-y-2">
              <p className="text-destructive text-sm font-semibold">Error:</p>
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}
        </div>
      )}

      {isLoading && (
        <div className="text-center space-y-4 z-10">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Connecting to AI assistant...</p>
        </div>
      )}

      {isConnected && (
        <div className="w-full space-y-6">
          <div className="relative w-full h-[400px] md:h-[500px] rounded-2xl overflow-hidden bg-gradient-to-br from-gray-900 to-black border border-gray-800">
            <GeometricShapes audioLevel={audioLevel} isAgentSpeaking={isAgentSpeaking} />
            <div className="absolute top-6 left-6 flex items-center gap-2 bg-gray-900/80 backdrop-blur-sm px-4 py-2 rounded-full border border-gray-700">
              <img src={APP_LOGO} alt="Soshogle" className="h-6 w-6" />
              <span className="text-sm font-semibold text-white">Soshogle AI</span>
            </div>
          </div>
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3">
              {status === "connecting" && (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                  <span className="text-sm font-medium text-blue-500">Connecting...</span>
                </>
              )}
              {status === "listening" && (
                <>
                  <div className="relative">
                    <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                    <div className="absolute inset-0 w-3 h-3 rounded-full bg-green-500/30 animate-ping" />
                  </div>
                  <span className="text-sm font-medium text-green-500">Listening...</span>
                </>
              )}
              {status === "speaking" && (
                <>
                  <div className="flex gap-1">
                    <div className="w-1 h-4 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: "0ms" }} />
                    <div className="w-1 h-4 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: "150ms" }} />
                    <div className="w-1 h-4 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span className="text-sm font-medium text-purple-500">Speaking...</span>
                </>
              )}
              {status === "processing" && (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-500" />
                  <span className="text-sm font-medium text-cyan-500">Processing...</span>
                </>
              )}
            </div>
            <Button size="lg" variant="outline" onClick={stopConversation} className="gap-2">
              <MicOff className="w-5 h-5" />
              End Conversation
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
