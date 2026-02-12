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
import { Card } from '@/components/ui/card';
import { Mic, MicOff, X, Minimize2, Maximize2 } from 'lucide-react';
import { toast } from 'sonner';

const STORAGE_KEY = 'crm-voice-assistant-state';

export function GlobalVoiceAssistant() {
  const pathname = usePathname();
  const { handleMessage } = useAIBrainVoice();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
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
          setIsMinimized(state.isMinimized || false);
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
        isMinimized,
        conversationActive,
      }));
    }
  }, [isOpen, isMinimized, conversationActive]);

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
    if (isOpen && !isMinimized) {
      setScreenContext(extractScreenContext());
      const interval = setInterval(() => {
        setScreenContext(extractScreenContext());
      }, 2000);
      return () => clearInterval(interval);
    } else {
      setScreenContext('');
    }
  }, [isOpen, isMinimized]);

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

  // Use createElement to avoid SWC/JSX parsing issues on Vercel
  const showButton = !isOpen || (isOpen && isMinimized && conversationActive);
  return React.createElement(
    React.Fragment,
    null,
    showButton &&
      React.createElement(
        'div',
        { className: 'fixed bottom-6 right-6 z-50' },
        React.createElement(Button, {
          onClick: () => {
            setIsOpen(true);
            setIsMinimized(false);
          },
          size: 'lg',
          className: conversationActive
            ? 'h-16 w-16 rounded-full shadow-lg bg-green-500 hover:bg-green-600 animate-pulse'
            : 'h-16 w-16 rounded-full shadow-lg bg-primary hover:bg-primary/90',
          children: React.createElement(Mic, { className: 'h-6 w-6' }),
        })
      ),
    isOpen &&
      React.createElement(
        'div',
        { className: 'fixed bottom-6 right-6 z-50' },
        React.createElement(
          Card,
          { className: `${isMinimized ? 'w-80' : 'w-96'} shadow-2xl border-2` },
          React.createElement(
            'div',
            { className: 'p-4 border-b flex items-center justify-between bg-primary/5' },
            React.createElement('div', { className: 'flex items-center gap-2' }, React.createElement(Mic, { className: 'h-5 w-5 text-primary' }), React.createElement('h3', { className: 'font-semibold' }, 'CRM Voice Assistant')),
            React.createElement(
              'div',
              { className: 'flex items-center gap-2' },
              React.createElement(Button, {
                variant: 'ghost',
                size: 'sm',
                onClick: () => setIsMinimized(!isMinimized),
                children: isMinimized ? React.createElement(Maximize2, { className: 'h-4 w-4' }) : React.createElement(Minimize2, { className: 'h-4 w-4' }),
              }),
              React.createElement(Button, {
                variant: 'ghost',
                size: 'sm',
                onClick: () => {
                  if (conversationActive) setIsMinimized(true);
                  else {
                    setIsOpen(false);
                    setIsMinimized(false);
                  }
                },
                disabled: conversationActive,
                title: conversationActive ? 'Conversation active - minimize instead' : 'Close',
                children: React.createElement(X, { className: 'h-4 w-4' }),
              })
            )
          ),
          !isMinimized &&
            React.createElement(
              'div',
              { className: 'p-4' },
              React.createElement(ElevenLabsAgent, {
                agentId,
                onMessage: handleMessage,
                onConversationEnd: handleConversationEnd,
                onAgentSpeakingChange: handleAgentSpeakingChange,
                dynamicVariables: {
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
                  ...(screenContext && {
                    visible_screen_content: screenContext,
                  }),
                },
              })
            ),
          isMinimized &&
            React.createElement('div', { className: 'p-4 text-center text-sm text-muted-foreground' }, 'Click to expand voice assistant')
        )
      )
  );
}
