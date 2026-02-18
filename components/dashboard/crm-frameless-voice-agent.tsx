/**
 * CRM Voice Agent — frameless, same look as Theodora's website.
 * Cyan/purple waves (GeometricShapes with filter), no frame, tap-to-start.
 */

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { Conversation } from '@elevenlabs/client';
import { GeometricShapes } from '@/components/landing/soshogle/geometric-shapes';
import { usePathname } from 'next/navigation';
import { getWebsiteBuilderContext, getWebsiteBuilderContextSummary } from '@/lib/website-builder-context';
import { extractScreenContext, getPageContext } from '@/lib/screen-context-extractor';
import { useAIBrainVoice } from '@/lib/ai-brain-voice-context';
import { toast } from 'sonner';

function getActiveWorkflowDraftId(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('activeWorkflowDraftId');
}

const VOICE_COLORS = { cyan: '#22d3ee', purple: '#8b5cf6' };
const STORAGE_KEY = 'crm-voice-assistant-state';

interface CrmFramelessVoiceAgentProps {
  agentId: string | null;
  loading: boolean;
  error: string | null;
}

export function CrmFramelessVoiceAgent({ agentId, loading, error }: CrmFramelessVoiceAgentProps) {
  const pathname = usePathname();
  const { handleMessage } = useAIBrainVoice();
  const [expanded, setExpanded] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (s) {
        const parsed = JSON.parse(s);
        return !!parsed?.expanded;
      }
    } catch {}
    return false;
  });
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [err, setErr] = useState<string | null>(error);
  const conversationRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioPulseRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const [activeWorkflowDraftId, setActiveWorkflowDraftId] = useState<string | null>(null);
  const [websiteBuilderContext, setWebsiteBuilderContextState] = useState<ReturnType<typeof getWebsiteBuilderContext>>(null);
  const [screenContext, setScreenContext] = useState('');

  useEffect(() => {
    setActiveWorkflowDraftId(getActiveWorkflowDraftId());
    const interval = setInterval(() => setActiveWorkflowDraftId(getActiveWorkflowDraftId()), 1000);
    return () => clearInterval(interval);
  }, []);

  const isOnWebsitesPage = pathname?.startsWith('/dashboard/websites');
  useEffect(() => {
    if (isOnWebsitesPage) {
      setWebsiteBuilderContextState(getWebsiteBuilderContext());
      const interval = setInterval(() => setWebsiteBuilderContextState(getWebsiteBuilderContext()), 500);
      return () => clearInterval(interval);
    } else {
      setWebsiteBuilderContextState(null);
    }
  }, [isOnWebsitesPage, pathname]);

  useEffect(() => {
    if (!expanded) return;
    setScreenContext(extractScreenContext());
    const interval = setInterval(() => setScreenContext(extractScreenContext()), 2000);
    return () => clearInterval(interval);
  }, [expanded]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      expanded,
      conversationActive: isConnected,
    }));
  }, [expanded, isConnected]);

  const buildDynamicVariables = useCallback((): Record<string, string> => {
    const pc = typeof window !== 'undefined' ? getPageContext() : null;
    const vars: Record<string, string> = {
      company_name: 'Your CRM',
      user_name: 'User',
      ...(pc?.path ? { current_path: pc.path } : {}),
      ...(activeWorkflowDraftId && {
        active_workflow_draft_id: activeWorkflowDraftId,
        in_workflow_builder: 'true',
      }),
      ...(isOnWebsitesPage && websiteBuilderContext && {
        in_website_builder: 'true',
        active_website_id: websiteBuilderContext.activeWebsiteId || '',
        website_builder_step: websiteBuilderContext.step || '',
        website_builder_context: getWebsiteBuilderContextSummary(),
      }),
      ...(pc && {
        ...(pc.activeWebsiteId && !websiteBuilderContext?.activeWebsiteId && { active_website_id: pc.activeWebsiteId }),
        ...(pc.activeLeadId && { active_lead_id: pc.activeLeadId }),
        ...(pc.activeDealId && { active_deal_id: pc.activeDealId }),
      }),
      ...(screenContext && { visible_screen_content: screenContext }),
    };
    return vars;
  }, [activeWorkflowDraftId, isOnWebsitesPage, websiteBuilderContext, screenContext]);

  const startConversation = useCallback(async () => {
    if (!agentId?.trim()) return;
    setIsLoading(true);
    setErr(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      try {
        const rec = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
        rec.ondataavailable = () => {};
        rec.start(1000);
        mediaRecorderRef.current = rec;
      } catch {}

      const vars = buildDynamicVariables();
      const params = new URLSearchParams({ agentId: agentId.trim() });
      Object.entries(vars).forEach(([k, v]) => {
        if (v) params.set(k, v);
      });

      const urlRes = await fetch(`/api/elevenlabs/signed-url?${params.toString()}`);
      if (!urlRes.ok) {
        const data = await urlRes.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to connect');
      }
      const { signedUrl } = await urlRes.json();
      if (!signedUrl) throw new Error('No connection URL');

      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      audioContextRef.current.resume?.().catch(() => {});

      conversationRef.current = await Conversation.startSession({
        signedUrl,
        connectionType: 'websocket',
        connectionDelay: { android: 3000, ios: 1000, default: 1000 },
        ...(Object.keys(vars).length > 0 && { dynamicVariables: vars } as any),
        onConnect: () => {
          setIsConnected(true);
          setIsLoading(false);
          try {
            conversationRef.current?.setVolume?.({ volume: 1 });
          } catch {}
          const tryConnectAudio = () => {
            try {
              const audioElement = document.querySelector('audio');
              if (audioElement && audioContextRef.current && analyserRef.current) {
                const source = audioContextRef.current.createMediaElementSource(audioElement);
                source.connect(analyserRef.current);
                analyserRef.current.connect(audioContextRef.current.destination);
                return true;
              }
            } catch (e) {
              console.warn('[CRM Voice] Audio connect:', e);
            }
            return false;
          };
          const attempt = (delay: number) => {
            setTimeout(() => {
              if (tryConnectAudio()) return;
              if (delay < 2000) attempt(delay + 500);
            }, delay);
          };
          attempt(0);
          attempt(600);
          attempt(1200);
        },
        onDisconnect: () => {
          setIsConnected(false);
          setIsAgentSpeaking(false);
          setAudioLevel(0);
          if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current.stop();
          streamRef.current?.getTracks().forEach((t) => t.stop());
          if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
          }
          analyserRef.current = null;
          conversationRef.current = null;
        },
        onError: (e: unknown) => {
          setErr((e as Error)?.message || 'Connection error');
          setIsLoading(false);
        },
        onMessage: (msg: any) => {
          if (msg.message && handleMessage) {
            handleMessage({
              role: msg.source === 'ai' ? 'agent' : 'user',
              content: msg.message,
              timestamp: Date.now(),
            });
          }
        },
        onModeChange: (mode: { mode?: string }) => {
          const speaking = mode?.mode === 'speaking';
          setIsAgentSpeaking(speaking);
          if (!speaking) setAudioLevel(0);
        },
      });
    } catch (e: any) {
      setErr(e.message || 'Could not start');
      setIsLoading(false);
    }
  }, [agentId, buildDynamicVariables, handleMessage]);

  useEffect(() => {
    if (!isAgentSpeaking) return;
    let raf: number;
    const tick = () => {
      audioPulseRef.current += 0.08;
      const v = Math.sin(audioPulseRef.current) * 0.35 + 0.5;
      setAudioLevel((prev) => Math.max(0, Math.min(1, v)));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isAgentSpeaking]);

  const stopConversation = () => {
    if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    if (conversationRef.current) {
      try {
        conversationRef.current.endSession();
      } catch {}
      conversationRef.current = null;
    }
    setIsConnected(false);
    setIsAgentSpeaking(false);
    setAudioLevel(0);
  };

  useEffect(() => () => stopConversation(), []);

  if (loading || !agentId) return null;
  if (err && !isLoading) {
    return (
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end">
        <div className="flex flex-col overflow-hidden rounded-2xl shadow-2xl bg-black/10 w-[320px] h-[320px] relative">
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/40 rounded-2xl z-10 p-4">
            <p className="text-center text-sm text-white">{err}</p>
            <button
              onClick={() => {
                setErr(null);
                startConversation();
              }}
              className="rounded-lg px-4 py-2 text-sm font-medium text-white"
              style={{ background: VOICE_COLORS.purple }}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!expanded) {
    return (
      <button
        onClick={() => {
          setExpanded(true);
          if (isConnected) {
            // Already connected — just expand to show widget
          } else if (!isLoading) {
            startConversation();
          }
        }}
        className="fixed bottom-6 right-6 z-[9999] flex h-16 w-16 items-center justify-center rounded-full shadow-xl transition-all hover:scale-110"
        style={{
          background: isConnected ? 'rgba(34, 197, 94, 0.2)' : 'rgba(139, 92, 246, 0.1)',
          border: isConnected ? '2px solid rgba(34, 197, 94, 0.5)' : '2px solid rgba(34, 211, 238, 0.3)',
        }}
        onMouseEnter={(e) => {
          if (isConnected) {
            e.currentTarget.style.background = 'rgba(34, 197, 94, 0.3)';
            e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.7)';
          } else {
            e.currentTarget.style.background = 'rgba(139, 92, 246, 0.2)';
            e.currentTarget.style.borderColor = 'rgba(34, 211, 238, 0.5)';
          }
        }}
        onMouseLeave={(e) => {
          if (isConnected) {
            e.currentTarget.style.background = 'rgba(34, 197, 94, 0.2)';
            e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.5)';
          } else {
            e.currentTarget.style.background = 'rgba(139, 92, 246, 0.1)';
            e.currentTarget.style.borderColor = 'rgba(34, 211, 238, 0.3)';
          }
        }}
        aria-label="Talk to AI assistant"
      >
        <svg className={`w-8 h-8 ${isConnected ? 'animate-pulse' : ''}`} style={{ color: isConnected ? '#22c55e' : VOICE_COLORS.cyan }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end">
      <div
        className="flex flex-col overflow-hidden rounded-2xl shadow-2xl bg-black/10 relative"
        style={{ width: 320, height: 320 }}
      >
        <div className="absolute inset-0 rounded-2xl overflow-hidden">
          <GeometricShapes audioLevel={audioLevel} isAgentSpeaking={isAgentSpeaking} bare />
        </div>

        {!isConnected && !isLoading && !err && (
          <button
            onClick={() => startConversation()}
            className="absolute inset-0 flex items-center justify-center z-10 cursor-pointer group"
            aria-label="Start conversation"
          >
            <div
              className="flex h-20 w-20 items-center justify-center rounded-full transition-transform group-hover:scale-110"
              style={{
                background: 'rgba(139, 92, 246, 0.2)',
                border: '2px solid rgba(34, 211, 238, 0.4)',
              }}
            >
              <svg className="w-10 h-10 animate-pulse" style={{ color: VOICE_COLORS.cyan }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
          </button>
        )}

        <button
          onClick={() => {
            if (isConnected) {
              setExpanded(false);
            } else {
              stopConversation();
              setExpanded(false);
            }
          }}
          className="absolute top-3 right-3 p-2 rounded-full bg-black/20 backdrop-blur-sm hover:bg-black/40 transition-colors z-20"
          aria-label={isConnected ? 'Minimize' : 'Close'}
          title={isConnected ? 'Minimize (conversation continues)' : 'Close'}
        >
          <X className="h-5 w-5 text-white" />
        </button>

        {isLoading && !err && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-2xl z-10">
            <p className="text-sm font-medium text-white/90">Connecting...</p>
          </div>
        )}
      </div>
      <p className="text-white/40 text-xs tracking-widest uppercase mt-1.5 mr-1 font-light">Let&apos;s talk</p>
    </div>
  );
}
