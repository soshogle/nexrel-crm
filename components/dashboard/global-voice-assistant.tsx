/**
 * Global Voice Assistant Component
 * Floating voice assistant widget available throughout the CRM
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { ElevenLabsAgent } from '@/components/landing/soshogle/elevenlabs-agent';
import { useAIBrainVoice } from '@/lib/ai-brain-voice-context';
import { Button } from '@/components/ui/button';
import { getWebsiteBuilderContext, getWebsiteBuilderContextSummary } from '@/lib/website-builder-context';
import { extractScreenContext, getPageContext } from '@/lib/screen-context-extractor';

function getActiveWorkflowDraftId(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('activeWorkflowDraftId');
}
import { Mic, X } from 'lucide-react';
import { toast } from 'sonner';

const STORAGE_KEY = 'crm-voice-assistant-state';

export function GlobalVoiceAssistant() {
  const pathname = usePathname();
  const { handleMessage } = useAIBrainVoice();
  const [isOpen, setIsOpen] = useState(false);
  const [activeWorkflowDraftId, setActiveWorkflowDraftId] = useState<string | null>(null);
  const [websiteBuilderContext, setWebsiteBuilderContextState] = useState<ReturnType<typeof getWebsiteBuilderContext>>(null);
  const [screenContext, setScreenContext] = useState('');
  const [agentId, setAgentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const conversationRef = useRef<any>(null);
  const [conversationActive, setConversationActive] = useState(false);

  // Load persisted state from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedState = localStorage.getItem(STORAGE_KEY);
      if (savedState) {
        try {
          const state = JSON.parse(savedState);
          setIsOpen(state.isOpen || false);
          setConversationActive(state.conversationActive || false);
        } catch (e) {
          console.error('Failed to load voice assistant state:', e);
        }
      }
    }
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        isOpen,
        conversationActive,
      }));
    }
  }, [isOpen, conversationActive]);

  useEffect(() => {
    fetchAgent();
  }, []);

  // Pass active workflow draft to voice agent so it prefers add_workflow_task over list_leads/list_deals
  useEffect(() => {
    setActiveWorkflowDraftId(getActiveWorkflowDraftId());
    const interval = setInterval(() => {
      setActiveWorkflowDraftId(getActiveWorkflowDraftId());
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Pass website builder context so voice agent sees what user sees and can help with build
  const isOnWebsitesPage = pathname?.startsWith('/dashboard/websites');
  useEffect(() => {
    if (isOnWebsitesPage) {
      setWebsiteBuilderContextState(getWebsiteBuilderContext());
      const interval = setInterval(() => {
        setWebsiteBuilderContextState(getWebsiteBuilderContext());
      }, 500);
      return () => clearInterval(interval);
    } else {
      setWebsiteBuilderContextState(null);
    }
  }, [isOnWebsitesPage, pathname]);

  // Extract visible screen content so voice agent can "see" what user sees (when widget is open)
  useEffect(() => {
    if (isOpen) {
      setScreenContext(extractScreenContext());
      const interval = setInterval(() => setScreenContext(extractScreenContext()), 2000);
      return () => clearInterval(interval);
    } else {
      setScreenContext('');
    }
  }, [isOpen]);

  const fetchAgent = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/crm-voice-agent');
      if (response.ok) {
        const data = await response.json();
        setAgentId(data.agentId);
      } else {
        throw new Error('Failed to get voice agent');
      }
    } catch (err: any) {
      console.error('Error fetching CRM voice agent:', err);
      setError(err.message);
      toast.error('Failed to initialize voice assistant');
    } finally {
      setLoading(false);
    }
  };

  const handleConversationEnd = (transcript: any[], audioBlob?: Blob) => {
    console.log('Conversation ended:', transcript);
    setConversationActive(false);
    conversationRef.current = null;
    // Optionally save conversation history or transcript
  };

  const handleAgentSpeakingChange = (speaking: boolean) => {
    setIsConnected(speaking);
    setConversationActive(speaking);
  };

  const handleStartConversation = () => {
    setConversationActive(true);
    setIsOpen(true);
  };

  if (loading) {
    return null; // Don't show anything while loading
  }

  if (error || !agentId) {
    return null; // Don't show widget if there's an error
  }

  const dynamicVars = {
    company_name: 'Your CRM',
    user_name: 'User',
    ...(typeof window !== 'undefined' && (() => {
      const pc = getPageContext();
      return pc.path ? { current_path: pc.path } : {};
    })()),
    ...(activeWorkflowDraftId && {
      active_workflow_draft_id: activeWorkflowDraftId,
      in_workflow_builder: 'true',
    }),
    ...(isOnWebsitesPage && {
      in_website_builder: 'true',
      active_website_id: websiteBuilderContext?.activeWebsiteId || '',
      website_builder_step: websiteBuilderContext?.step || '',
      website_builder_context: getWebsiteBuilderContextSummary(),
    }),
    ...(typeof window !== 'undefined' && (() => {
      const pc = getPageContext();
      const extra: Record<string, string> = {};
      if (pc.activeWebsiteId && !websiteBuilderContext?.activeWebsiteId) extra.active_website_id = pc.activeWebsiteId;
      if (pc.activeLeadId) extra.active_lead_id = pc.activeLeadId;
      if (pc.activeDealId) extra.active_deal_id = pc.activeDealId;
      return extra;
    })()),
    ...(screenContext && { visible_screen_content: screenContext }),
  };

  const showButton = !isOpen;
  return React.createElement(
    React.Fragment,
    null,
    showButton &&
      React.createElement(
        'div',
        { className: 'fixed bottom-6 right-6 z-[9999]' },
        React.createElement('button', {
          onClick: () => {
            setIsOpen(true);
          },
          className: 'h-16 w-16 rounded-full shadow-xl flex items-center justify-center transition-all hover:scale-110',
          style: {
            background: conversationActive ? 'rgba(34, 197, 94, 0.2)' : 'rgba(139, 92, 246, 0.1)',
            border: conversationActive ? '2px solid rgba(34, 197, 94, 0.5)' : '2px solid rgba(34, 211, 238, 0.3)',
          },
          onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.background = conversationActive ? 'rgba(34, 197, 94, 0.3)' : 'rgba(139, 92, 246, 0.2)';
            e.currentTarget.style.borderColor = conversationActive ? 'rgba(34, 197, 94, 0.7)' : 'rgba(34, 211, 238, 0.5)';
          },
          onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.background = conversationActive ? 'rgba(34, 197, 94, 0.2)' : 'rgba(139, 92, 246, 0.1)';
            e.currentTarget.style.borderColor = conversationActive ? 'rgba(34, 197, 94, 0.5)' : 'rgba(34, 211, 238, 0.3)';
          },
          'aria-label': 'Talk to AI assistant',
          children: React.createElement(Mic, {
            className: `h-8 w-8 ${conversationActive ? 'animate-pulse' : ''}`,
            style: { color: conversationActive ? '#22c55e' : '#22d3ee' },
          }),
        })
      ),
    isOpen &&
      React.createElement(
        'div',
        { className: 'fixed bottom-6 right-6 z-[9999] flex flex-col items-end' },
        React.createElement(
          'div',
          {
            className: 'overflow-hidden rounded-2xl shadow-2xl bg-black/10 relative',
            style: { width: 320, height: 320 },
          },
          React.createElement('div', { className: 'absolute inset-0' },
            React.createElement(ElevenLabsAgent, {
              agentId,
              onMessage: handleMessage,
              onConversationEnd: handleConversationEnd,
              onAgentSpeakingChange: handleAgentSpeakingChange,
              dynamicVariables: dynamicVars,
              variant: 'frameless',
            })
          ),
          React.createElement('button', {
            onClick: () => {
              setConversationActive(false);
              setIsOpen(false);
            },
            className: 'absolute top-3 right-3 p-2 rounded-full bg-black/30 backdrop-blur-sm hover:bg-black/50 transition-colors z-30',
            'aria-label': 'Close',
            children: React.createElement(X, { className: 'h-5 w-5 text-white' }),
          })
        ),
        React.createElement('p', { className: 'text-white/40 text-xs tracking-widest uppercase mt-1.5 mr-1 font-light' }, "Let's talk")
      )
  );
}
