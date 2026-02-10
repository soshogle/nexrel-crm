"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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
  onMessage?: (message: ConversationMessage) => void; // Real-time message callback
  dynamicVariables?: Record<string, string>;
  autoStart?: boolean; // Auto-start conversation when component mounts
  compactMode?: boolean; // Hide intro text - show only Start button (for pages that already have chat)
  hideWhenIdle?: boolean; // Hide entire pre-connection UI when not connected (e.g. when voice is in chat widget)
}

type AgentStatus = "idle" | "connecting" | "listening" | "speaking" | "processing";

export function ElevenLabsAgent({
  agentId,
  onAudioLevel,
  onConversationEnd,
  onAgentSpeakingChange,
  onMessage,
  dynamicVariables,
  autoStart = false,
  compactMode = false,
  hideWhenIdle = false,
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
    console.log('🚀 startConversation called', { agentId, isConnected, isLoading, status });
    
    if (!agentId) {
      console.error('❌ No agentId provided');
      setError('Agent ID is missing. Please wait for the agent to load.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setStatus("connecting");

    try {
      conversationMessagesRef.current = [];
      
      // Request microphone access first (like Docpen does)
      console.log('🎤 Requesting microphone access...');
      let micStream: MediaStream;
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('getUserMedia is not supported in this browser');
        }
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStreamRef.current = micStream;
        console.log('✅ Microphone access granted', { 
          tracks: micStream.getTracks().length,
          trackStates: micStream.getTracks().map(t => ({ id: t.id, enabled: t.enabled, readyState: t.readyState }))
        });
      } catch (micError: any) {
        console.error('❌ Microphone access denied:', micError);
        console.error('Error details:', {
          name: micError.name,
          message: micError.message,
          stack: micError.stack
        });
        setIsLoading(false);
        setStatus("idle");
        
        if (micError.name === 'NotAllowedError' || micError.name === 'PermissionDeniedError') {
          setError('Microphone access denied. Please allow microphone permissions in your browser settings and try again.');
        } else if (micError.name === 'NotFoundError') {
          setError('No microphone found. Please connect a microphone and try again.');
        } else {
          setError(`Microphone error: ${micError.message || 'Unknown error'}`);
        }
        return;
      }

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
        console.error('❌ Agent ID is missing or empty');
        throw new Error("Agent ID is required for WebRTC connection");
      }

      console.log('🔑 Getting conversation token for agent:', agentId.trim());
      let conversationToken: string | null = null;
      try {
        const tokenResponse = await fetch("/api/elevenlabs/conversation-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId: agentId.trim() }),
        });
        console.log('📥 Token response status:', tokenResponse.status);
        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text();
          console.error('❌ Token request failed:', errorText);
          throw new Error(errorText || "Failed to get conversation token");
        }
        const tokenBody = await tokenResponse.json();
        conversationToken = tokenBody?.token || null;
        console.log('✅ Got conversation token:', conversationToken ? 'Token received' : 'No token');
      } catch (tokenError: any) {
        console.error('❌ Token error:', tokenError);
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
            const conversationMessage: ConversationMessage = {
              role: message.source === "ai" ? "agent" : "user",
              content: message.message,
              timestamp: Date.now(),
            };
            conversationMessagesRef.current.push(conversationMessage);
            
            // Call onMessage callback for real-time message handling
            if (onMessage) {
              onMessage(conversationMessage);
            }
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

      console.log('🔌 Starting WebRTC session...');
      try {
        conversationRef.current = await startWebrtcSession();
        console.log('✅ WebRTC session started successfully');
      } catch (sessionError: any) {
        console.error('❌ WebRTC session failed:', sessionError);
        const message = sessionError?.message || "";
        if (message.includes("Failed to fetch") || message.includes("signal")) {
          console.log('🔄 Falling back to WebSocket...');
          try {
            conversationRef.current = await startWebsocketSession();
            console.log('✅ WebSocket session started successfully');
          } catch (fallbackError: any) {
            console.error("❌ ElevenLabs fallback error:", fallbackError);
            cleanupMedia();
            setError(`Connection failed: ${fallbackError.message || 'Unknown error'}`);
            setIsLoading(false);
            setStatus("idle");
            return;
          }
        } else {
          console.error('❌ Session error:', sessionError);
          cleanupMedia();
          setError(`Connection failed: ${sessionError.message || 'Unknown error'}`);
          setIsLoading(false);
          setStatus("idle");
          return;
        }
      }

      // Set up audio context for analysis
      audioContextRef.current = new AudioContext();
      
      // Resume audio context if suspended (browser requirement)
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
        console.log('🔊 Audio context resumed');
      }
      
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;

      // Connect audio element for analysis and ensure playback works
      // The ElevenLabs SDK creates audio elements automatically for WebRTC
      // IMPORTANT: Use only elements not yet connected - createMediaElementSource can only be called once per element
      const connectAudioElement = () => {
        try {
          const candidates = document.querySelectorAll('audio');
          let audioElement: HTMLAudioElement | null = null;
          for (const el of candidates) {
            if ((el as HTMLAudioElement).dataset.audioSourceConnected !== 'true') {
              audioElement = el as HTMLAudioElement;
              break;
            }
          }
          audioElement = audioElement || (document.querySelector("#elevenlabs-audio-output") as HTMLAudioElement);

          if (audioElement && audioContextRef.current && analyserRef.current) {
            try {
              // Skip if already connected (prevents InvalidStateError on reconnect)
              if (audioElement.dataset.audioSourceConnected === 'true') return;

              audioElement.volume = 1.0;
              audioElement.muted = false;
              audioElement.play().catch((e) => {
                console.log("Audio play() called (may fail if no audio yet):", e);
              });

              const source = audioContextRef.current.createMediaElementSource(audioElement);
              source.connect(analyserRef.current);
              analyserRef.current.connect(audioContextRef.current.destination);
              audioElement.dataset.audioSourceConnected = 'true';
              console.log("✅ Audio element connected for analysis and playback");
            } catch (e: any) {
              if (e?.name !== 'InvalidStateError' && e?.message && !e.message.includes('already')) {
                console.log("Could not connect to audio element:", e);
              }
            }
          } else {
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

  const stopConversation = useCallback(() => {
    console.log('🛑 stopConversation called, current status:', status);
    
    // Stop animation frame immediately
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Stop media recorder - handle all states
    if (mediaRecorderRef.current) {
      try {
        console.log('🛑 Stopping media recorder, state:', mediaRecorderRef.current.state);
        if (mediaRecorderRef.current.state === "recording" || mediaRecorderRef.current.state === "paused") {
          mediaRecorderRef.current.stop();
        }
        mediaRecorderRef.current = null;
      } catch (e) {
        console.error("❌ Error stopping media recorder:", e);
        mediaRecorderRef.current = null;
      }
    }

    // Stop all audio stream tracks immediately
    if (audioStreamRef.current) {
      try {
        console.log('🛑 Stopping audio stream tracks');
        audioStreamRef.current.getTracks().forEach((track) => {
          track.stop();
          track.enabled = false;
        });
      } catch (e) {
        console.error("❌ Error stopping audio tracks:", e);
      }
      audioStreamRef.current = null;
    }

    // End conversation session
    if (conversationRef.current) {
      try {
        console.log('🛑 Ending conversation session');
        conversationRef.current.endSession();
      } catch (e) {
        console.error("❌ Error ending session:", e);
      }
      conversationRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      try {
        if (audioContextRef.current.state !== 'closed') {
          console.log('🛑 Closing audio context');
          audioContextRef.current.close();
        }
      } catch (e) {
        console.error("❌ Error closing audio context:", e);
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
    
    console.log('✅ Conversation stopped successfully');
  }, [status, onAudioLevel, onAgentSpeakingChange]);

  // Note: autoStart prop is ignored - user must always click button to start
  // This ensures getUserMedia is called with proper user interaction (browser requirement)

  useEffect(() => {
    return () => {
      stopConversation();
    };
  }, []);

  // When hideWhenIdle and idle, render nothing to avoid empty space
  if (hideWhenIdle && !isConnected && !isLoading) {
    return <div className="hidden" aria-hidden="true" />;
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

          {!agentId && (
            <p className="text-sm text-muted-foreground">Loading agent...</p>
          )}

          {error && (
            <div className="space-y-2">
              <p className="text-destructive text-sm font-semibold">Error:</p>
              <p className="text-destructive text-sm">{error}</p>
              {error.includes('Microphone') && (
                <p className="text-xs text-muted-foreground mt-2">
                  Please allow microphone access in your browser settings and try again.
                </p>
              )}
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
