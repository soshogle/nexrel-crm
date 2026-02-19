/**
 * ElevenLabs Voice AI — floating bubble, like nexrel.soshogle.com landing page.
 */
import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, MicOff } from "lucide-react";
import { Conversation } from "@elevenlabs/client";
import { getEasternTimeContext } from "@/lib/voice-time-context";

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX = /(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g;
const NAME_PATTERNS = [
  /(?:my name is|i'm|i am|call me|this is)\s+([A-Za-z\u00C0-\u024F\u1E00-\u1EFF\s-]{2,50})/i,
  /(?:name is|named)\s+([A-Za-z\u00C0-\u024F\u1E00-\u1EFF\s-]{2,50})/i,
];

function extractFromTranscript(messages: { role: string; content: string }[]) {
  const text = messages.map((m) => m.content).join(" ");
  const result: { name?: string; email?: string; phone?: string } = {};
  const emails = text.match(EMAIL_REGEX);
  if (emails?.length) {
    const real = emails.find((e) => !e.includes("example") && !e.includes("test"));
    result.email = (real || emails[0]).trim();
  }
  const phones = text.match(PHONE_REGEX);
  if (phones?.length) result.phone = phones[0].replace(/\s/g, "").trim();
  for (const p of NAME_PATTERNS) {
    const m = text.match(p);
    if (m && m[1].length >= 2 && m[1].length <= 50) {
      result.name = m[1].trim();
      break;
    }
  }
  return result;
}

function transcriptToSummary(messages: { role: string; content: string }[]) {
  return messages
    .slice(0, 20)
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n\n");
}

interface Props {
  agentId: string;
  websiteId: string | null;
}

export default function ElevenLabsVoiceAgent({ agentId, websiteId }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const conversationRef = useRef<any>(null);
  const messagesRef = useRef<{ role: string; content: string }[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startConversation = async () => {
    if (!agentId?.trim()) return;
    setIsLoading(true);
    setError(null);
    messagesRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      try {
        const rec = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
        rec.ondataavailable = () => {};
        rec.start(1000);
        mediaRecorderRef.current = rec;
      } catch {}

      const urlRes = await fetch(`/api/voice/signed-url?agentId=${encodeURIComponent(agentId.trim())}`);
      if (!urlRes.ok) {
        const err = await urlRes.json().catch(() => ({}));
        throw new Error(err.error || "Failed to connect");
      }
      const { signedUrl } = await urlRes.json();
      if (!signedUrl) throw new Error("No connection URL");

      conversationRef.current = await Conversation.startSession({
        signedUrl,
        connectionType: "websocket",
        connectionDelay: { android: 3000, ios: 1000, default: 1000 },
        onConnect: () => {
          setIsConnected(true);
          setIsLoading(false);
          try {
            conversationRef.current?.setVolume?.({ volume: 1 });
          } catch {}
          try {
            conversationRef.current?.sendContextualUpdate?.(getEasternTimeContext());
          } catch {}
        },
        onDisconnect: () => {
          setIsConnected(false);
          const msgs = messagesRef.current;
          if (mediaRecorderRef.current?.state !== "inactive") {
            mediaRecorderRef.current.stop();
          }
          streamRef.current?.getTracks().forEach((t) => t.stop());
          conversationRef.current = null;
          if (websiteId && msgs.length > 0) {
            const extracted = extractFromTranscript(msgs);
            if (extracted.name || extracted.email || extracted.phone) {
              fetch("/api/webhooks/website-voice-lead", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  websiteId,
                  name: extracted.name,
                  email: extracted.email,
                  phone: extracted.phone,
                  transcript: transcriptToSummary(msgs),
                }),
              }).catch((e) => console.warn("[Voice] CRM push failed:", e));
            }
          }
        },
        onError: (e) => {
          setError(e?.message || "Connection error");
          setIsLoading(false);
        },
        onMessage: (msg: any) => {
          if (msg.message) {
            const role = msg.source === "ai" ? "agent" : "user";
            messagesRef.current.push({ role, content: msg.message });
          }
        },
      });
    } catch (err: any) {
      setError(err.message || "Could not start");
      setIsLoading(false);
    }
  };

  const stopConversation = () => {
    if (mediaRecorderRef.current?.state !== "inactive") mediaRecorderRef.current.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (conversationRef.current) {
      try {
        conversationRef.current.endSession();
      } catch {}
      conversationRef.current = null;
    }
    setIsConnected(false);
  };

  useEffect(() => () => stopConversation(), []);

  if (!agentId) return null;

  return (
    <>
      {!expanded && (
        <button
          onClick={() => {
            setExpanded(true);
            if (!isConnected && !isLoading) startConversation();
          }}
          className="fixed bottom-6 right-6 z-[9999] flex h-16 w-16 items-center justify-center rounded-full bg-[#214359] text-white shadow-xl transition-all hover:scale-105 hover:bg-[#1a3648]"
          aria-label="Talk to AI assistant"
        >
          <MessageCircle className="h-7 w-7" />
        </button>
      )}

      {expanded && (
        <div className="fixed bottom-6 right-6 z-[9999] flex w-[320px] flex-col overflow-hidden rounded-xl border-2 border-[#214359]/20 bg-white shadow-2xl">
          <div className="flex items-center justify-between bg-[#214359] px-3 py-2">
            <span className="text-sm font-medium text-white">Voice AI Assistant</span>
            <button
              onClick={() => {
                stopConversation();
                setExpanded(false);
              }}
              className="rounded p-1.5 text-white/80 hover:bg-white/10"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="relative h-[200px] bg-gray-100 p-4">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-[#214359]/70">Connecting...</p>
              </div>
            )}
            {error && (
              <div className="flex flex-col items-center justify-center gap-3">
                <p className="text-center text-sm text-red-600">{error}</p>
                <button
                  onClick={() => {
                    setError(null);
                    startConversation();
                  }}
                  className="rounded bg-[#214359] px-4 py-2 text-sm text-white"
                >
                  Retry
                </button>
              </div>
            )}
            {isConnected && !error && (
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="flex gap-1">
                  <div className="w-2 h-4 bg-[#214359] rounded-full animate-pulse" />
                  <div className="w-2 h-4 bg-[#214359] rounded-full animate-pulse" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-4 bg-[#214359] rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
                </div>
                <p className="text-sm text-[#214359]">Listening...</p>
                <button
                  onClick={stopConversation}
                  className="flex items-center gap-2 rounded bg-red-500/90 px-4 py-2 text-sm text-white hover:bg-red-600"
                >
                  <MicOff className="h-4 w-4" />
                  End
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
