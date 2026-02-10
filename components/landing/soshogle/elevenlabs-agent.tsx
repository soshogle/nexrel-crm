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
  autoStart?: boolean; // Auto-start conversation when component mounts
}

type AgentStatus = "idle" | "connecting" | "listening" | "speaking" | "processing";

export function ElevenLabsAgent({
  agentId,
  onAudioLevel,
  onConversationEnd,
  onAgentSpeakingChange,
  dynamicVariables,
  autoStart = false,
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
      const resolvedToken = conversationToken;

      const cleanupMedia = () => {
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
      };

      const sessionOptions = {
        conversationToken: resolvedToken,
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
      };

      const startWebrtcSession = async () => {
        return Conversation.startSession({
          ...sessionOptions,
          connectionType: "webrtc",
        });
      };

      const startWebsocketSession = async () => {
        return (Conversation as any).startSession({
          ...sessionOptions,
          connectionType: "websocket",
        });
      };

      try {
        conversationRef.current = await startWebrtcSession();
      } catch (sessionError: any) {
        const message = sessionError?.message || "";
        if (message.includes("Failed to fetch") || message.includes("signal")) {
          try {
            conversationRef.current = await startWebsocketSession();
          } catch (fallbackError: any) {
            console.error("ElevenLabs fallback error:", fallbackError);
            cleanupMedia();
            throw fallbackError;
          }
        } else {
          cleanupMedia();
          throw sessionError;
        }
      }

      // Set up audio context for analysis
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;

      // Connect audio element for analysis and ensure playback works
      // The ElevenLabs SDK creates audio elements automatically for WebRTC
      const connectAudioElement = () => {
        try {
          // Look for audio element created by SDK or our fallback element
          const audioElement = document.querySelector("#elevenlabs-audio-output") as HTMLAudioElement || 
                              document.querySelector("audio") as HTMLAudioElement;
          
          if (audioElement && audioContextRef.current && analyserRef.current) {
            try {
              // Ensure audio is enabled and will play
              audioElement.volume = 1.0;
              audioElement.muted = false;
              
              // Connect to audio context for analysis
              const source = audioContextRef.current.createMediaElementSource(audioElement);
              source.connect(analyserRef.current);
              analyserRef.current.connect(audioContextRef.current.destination);
              console.log("✅ Audio element connected for analysis and playback");
            } catch (e: any) {
              // Audio element may already be connected - this is OK
              if (e.message && !e.message.includes("already been connected")) {
                console.log("Could not connect to audio element:", e);
              }
            }
          } else {
            // Retry after a short delay if element not found yet
            setTimeout(connectAudioElement, 200);
          }
        } catch (e) {
          console.log("Error connecting audio element:", e);
        }
      };

      // Start connecting audio element (SDK may create it asynchronously)
      connectAudioElement();

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
    console.log('Stopping conversation, current status:', status);
    
    // Stop animation frame immediately
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Stop media recorder - handle all states
    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state === "recording") {
          mediaRecorderRef.current.stop();
        } else if (mediaRecorderRef.current.state === "paused") {
          mediaRecorderRef.current.stop();
        }
        // Wait a bit for stop to complete, then nullify
        setTimeout(() => {
          mediaRecorderRef.current = null;
        }, 100);
      } catch (e) {
        console.error("Error stopping media recorder:", e);
        mediaRecorderRef.current = null;
      }
    }

    // Stop all audio stream tracks immediately
    if (audioStreamRef.current) {
      try {
        audioStreamRef.current.getTracks().forEach((track) => {
          track.stop();
          track.enabled = false;
        });
      } catch (e) {
        console.error("Error stopping audio tracks:", e);
      }
      audioStreamRef.current = null;
    }

    // End conversation session
    if (conversationRef.current) {
      try {
        conversationRef.current.endSession();
      } catch (e) {
        console.error("Error ending session:", e);
      }
      conversationRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      try {
        if (audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close();
        }
      } catch (e) {
        console.error("Error closing audio context:", e);
      }
      audioContextRef.current = null;
    }

    // Reset analyser ref
    analyserRef.current = null;

    // Reset state immediately
    setIsConnected(false);
    setIsAgentSpeaking(false);
    setIsLoading(false);
    setStatus("idle");
    setAudioLevel(0);
    setError(null);
    
    if (onAudioLevel) {
      onAudioLevel(0);
    }
    if (onAgentSpeakingChange) {
      onAgentSpeakingChange(false);
    }
    
    console.log('Conversation stopped successfully');
  };

  // Auto-start conversation if autoStart prop is true
  // But only after user interaction (browsers require user gesture for getUserMedia)
  useEffect(() => {
    if (autoStart && agentId && !isConnected && !isLoading && status === 'idle') {
      // Create a one-time click handler to start conversation
      // This ensures getUserMedia is called after user interaction
      const handleAutoStart = () => {
        startConversation();
        // Remove listener after first use
        document.removeEventListener('click', handleAutoStart);
        document.removeEventListener('touchstart', handleAutoStart);
      };
      
      // Listen for any user interaction
      document.addEventListener('click', handleAutoStart, { once: true });
      document.addEventListener('touchstart', handleAutoStart, { once: true });
      
      return () => {
        document.removeEventListener('click', handleAutoStart);
        document.removeEventListener('touchstart', handleAutoStart);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, agentId, isConnected, isLoading, status]);

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
              {autoStart 
                ? "Click anywhere to start a live conversation with our AI-powered assistant. Microphone access will be requested."
                : "Click the button below to start a live conversation with our AI-powered assistant. Ask anything about Soshogle's services!"}
            </p>
          </div>

          <Button size="lg" onClick={startConversation} className="bg-primary hover:bg-primary/90 gap-2">
            <Mic className="w-5 h-5" />
            {autoStart ? "Start Conversation" : "Start Conversation"}
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
            
            {/* Hidden audio element for ElevenLabs SDK */}
            <audio 
              id="elevenlabs-audio-output" 
              autoPlay 
              playsInline
              style={{ display: 'none' }}
            />
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
