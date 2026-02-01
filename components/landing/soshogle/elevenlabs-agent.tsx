"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { GeometricShapes } from "./geometric-shapes";
import { Conversation } from "@elevenlabs/client";

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
  dynamicVariables?: Record<string, string>;
}

type AgentStatus = "idle" | "connecting" | "listening" | "speaking" | "processing";

export function ElevenLabsAgent({
  agentId,
  onAudioLevel,
  onConversationEnd,
  onAgentSpeakingChange,
  dynamicVariables,
}: ElevenLabsAgentProps) {
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

  const startConversation = async () => {
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
        throw new Error("Agent ID is required for WebRTC connection");
      }

      let conversationToken: string | null = null;
      try {
        const tokenResponse = await fetch("/api/elevenlabs/conversation-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId: agentId.trim() }),
        });
        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text();
          throw new Error(errorText || "Failed to get conversation token");
        }
        const tokenBody = await tokenResponse.json();
        conversationToken = tokenBody?.token || null;
      } catch (tokenError: any) {
        const message = tokenError?.message || "Voice AI token unavailable";
        setError(message);
        setIsLoading(false);
        setStatus("idle");
        return;
      }

      if (!conversationToken) {
        setError("Voice AI token unavailable");
        setIsLoading(false);
        setStatus("idle");
        return;
      }

      conversationRef.current = await Conversation.startSession({
        conversationToken,
        connectionType: "webrtc",
        ...(dynamicVariables && { config: { dynamic_variables: dynamicVariables } }),
        onConnect: () => {
          setIsConnected(true);
          setIsLoading(false);
          setStatus("listening");
        },
        onDisconnect: () => {
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
          console.error("ElevenLabs error:", error);
          const message =
            error?.message ||
            error?.error ||
            "Could not establish signal connection. Please try again.";
          setError(message);
          setIsLoading(false);
          setStatus("idle");
        },
        onMessage: (message: any) => {
          if (message.message) {
            conversationMessagesRef.current.push({
              role: message.source === "ai" ? "agent" : "user",
              content: message.message,
              timestamp: Date.now(),
            });
          }
        },
        onModeChange: (mode: any) => {
          if (mode.mode === "speaking") {
            setIsAgentSpeaking(true);
            setStatus("speaking");
            if (onAgentSpeakingChange) {
              onAgentSpeakingChange(true);
            }
          } else if (mode.mode === "listening") {
            setIsAgentSpeaking(false);
            setStatus("listening");
            if (onAgentSpeakingChange) {
              onAgentSpeakingChange(false);
            }
            setAudioLevel(0);
            if (onAudioLevel) {
              onAudioLevel(0);
            }
          }
        },
      });

      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;

      try {
        const audioElement = document.querySelector("audio");
        if (audioElement) {
          const source = audioContextRef.current.createMediaElementSource(audioElement);
          source.connect(analyserRef.current);
          analyserRef.current.connect(audioContextRef.current.destination);
        }
      } catch (e) {
        console.log("Could not connect to audio element:", e);
      }

      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

      const updateAudioLevel = () => {
        if (analyserRef.current && isAgentSpeaking) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          const normalized = Math.min(average / 128, 1);
          setAudioLevel(normalized);
          if (onAudioLevel) {
            onAudioLevel(normalized);
          }
        } else if (!isAgentSpeaking) {
          setAudioLevel(0);
          if (onAudioLevel) {
            onAudioLevel(0);
          }
        }
        animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
      };

      updateAudioLevel();
    } catch (err: any) {
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
    if (onAudioLevel) {
      onAudioLevel(0);
    }
  };

  useEffect(() => {
    return () => {
      stopConversation();
    };
  }, []);

  return (
    <div className="relative w-full flex flex-col items-center justify-center">
      {!isConnected && !isLoading && (
        <div className="text-center space-y-6 z-10">
          <div className="space-y-2">
            <h3 className="text-2xl font-semibold">Talk to Our AI Assistant</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Click the button below to start a live conversation with our AI-powered assistant.
              Ask anything about Soshogle&apos;s services!
            </p>
          </div>

          <Button size="lg" onClick={startConversation} className="bg-primary hover:bg-primary/90 gap-2">
            <Mic className="w-5 h-5" />
            Start Conversation
          </Button>

          {error && (
            <p className="text-destructive text-sm">{error}</p>
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
          <div className="relative w-full h-[400px] md:h-[500px] rounded-2xl overflow-hidden bg-gradient-to-br from-background to-card border border-white/10">
            <GeometricShapes audioLevel={audioLevel} isAgentSpeaking={isAgentSpeaking} />

            <div className="absolute top-6 left-6 flex items-center gap-2 bg-background/80 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10">
              <img src={APP_LOGO} alt="Soshogle" className="h-6 w-6" />
              <span className="text-sm font-semibold">Soshogle AI</span>
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
