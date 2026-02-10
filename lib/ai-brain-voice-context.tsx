/**
 * AI Brain Voice Agent Context
 * Shared state management for persistent voice agent across pages
 */

'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const STORAGE_KEY = 'ai-brain-voice-agent-state';
const VISUALIZATION_EVENT = 'ai-brain-visualization-update';
const CONVERSATION_STATE_EVENT = 'ai-brain-conversation-state';
const NAVIGATION_EVENT = 'ai-brain-voice-navigate';

interface AIBrainVoiceContextType {
  agentId: string | null;
  loading: boolean;
  error: string | null;
  conversationActive: boolean;
  setConversationActive: (active: boolean) => void;
  fetchCrmStatistics: () => Promise<void>;
  handleMessage: (message: any) => void;
  navigateTo: (path: string) => void;
}

const AIBrainVoiceContext = createContext<AIBrainVoiceContextType | undefined>(undefined);

export function AIBrainVoiceProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [agentId, setAgentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conversationActive, setConversationActiveState] = useState(false);
  const lastStatsCheckRef = useRef<number>(0);
  const lastNavigateRef = useRef<number>(0);

  // Load persisted state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedState = localStorage.getItem(STORAGE_KEY);
      if (savedState) {
        try {
          const state = JSON.parse(savedState);
          setConversationActiveState(state.conversationActive || false);
        } catch (e) {
          console.error('Failed to load AI Brain voice agent state:', e);
        }
      }

      // Listen for conversation state changes from other components
      const handleStateChange = (event: CustomEvent) => {
        if (event.detail?.conversationActive !== undefined) {
          setConversationActiveState(event.detail.conversationActive);
        }
      };

      window.addEventListener(CONVERSATION_STATE_EVENT, handleStateChange as EventListener);
      return () => {
        window.removeEventListener(CONVERSATION_STATE_EVENT, handleStateChange as EventListener);
      };
    }
  }, []);

  // Save state to localStorage
  const setConversationActive = useCallback((active: boolean) => {
    setConversationActiveState(active);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        conversationActive: active,
      }));
      // Broadcast state change
      window.dispatchEvent(new CustomEvent(CONVERSATION_STATE_EVENT, {
        detail: { conversationActive: active },
      }));
    }
  }, []);

  useEffect(() => {
    const fetchAgent = async () => {
      try {
        setLoading(true);
        console.log('🔄 [AI Brain Voice Context] Loading CRM voice agent...');
        const response = await fetch('/api/crm-voice-agent');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.agentId) {
            setAgentId(data.agentId);
            console.log('✅ [AI Brain Voice Context] CRM voice agent loaded:', data.agentId);
          } else {
            throw new Error(data.error || 'Failed to get voice agent');
          }
        } else {
          throw new Error('Failed to get voice agent');
        }
      } catch (err: any) {
        console.error('❌ [AI Brain Voice Context] Error fetching CRM voice agent:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAgent();
  }, []);

  const fetchCrmStatistics = useCallback(async () => {
    try {
      console.log('📊 [AI Brain Voice Context] Fetching CRM statistics...');
      const response = await fetch('/api/crm-voice-agent/functions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          function_name: 'get_statistics',
          parameters: {},
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [AI Brain Voice Context] Failed to fetch statistics:', response.status, errorText);
        // Try to parse as JSON for better error details
        try {
          const errorData = JSON.parse(errorText);
          console.error('❌ [AI Brain Voice Context] Error details:', errorData);
        } catch {
          // Not JSON, use text
        }
        return;
      }
      
      const data = await response.json();
      console.log('📥 [AI Brain Voice Context] Statistics response:', data);
      
      if (data.success && data.statistics) {
        // Dispatch custom event to notify AI Brain page to show visualizations
        if (typeof window !== 'undefined') {
          console.log('📊 [AI Brain Voice Context] Dispatching visualization event with statistics:', JSON.stringify(data.statistics, null, 2));
          const event = new CustomEvent(VISUALIZATION_EVENT, {
            detail: {
              statistics: data.statistics,
              show: true,
            },
          });
          window.dispatchEvent(event);
          console.log('✅ [AI Brain Voice Context] Event dispatched:', event.type, event.detail);
        }
      } else if (data.error) {
        console.error('❌ [AI Brain Voice Context] Statistics API returned error:', data.error);
        if (data.details) {
          console.error('❌ [AI Brain Voice Context] Error details:', data.details);
        }
      } else {
        console.warn('⚠️ [AI Brain Voice Context] Unexpected response format:', data);
      }
    } catch (error: any) {
      console.error('❌ [AI Brain Voice Context] Failed to fetch CRM statistics:', error);
      console.error('❌ [AI Brain Voice Context] Error stack:', error.stack);
    }
  }, []);

  const navigateTo = useCallback((path: string) => {
    const now = Date.now();
    if (now - lastNavigateRef.current < 2000) return; // Throttle
    lastNavigateRef.current = now;
    if (typeof window !== 'undefined' && path) {
      window.dispatchEvent(new CustomEvent(NAVIGATION_EVENT, { detail: { path } }));
      router.push(path);
    }
  }, [router]);

  const handleMessage = useCallback((message: any) => {
    const now = Date.now();
    const timeSinceLastCheck = now - lastStatsCheckRef.current;
    if (timeSinceLastCheck < 3000) return;

    if (message.role === 'agent' && message.content) {
      const content = message.content.toLowerCase();
      const visualizationKeywords = ['chart', 'graph', 'visualization', 'visualize', 'trend', 'over time', 'monthly', 'revenue comparison', 'sales over'];
      const wantsVisualization = visualizationKeywords.some(k => content.includes(k));

      if (wantsVisualization) {
        console.log('📊 [AI Brain Voice Context] Detected visualization request, navigating to AI Brain and fetching stats');
        lastStatsCheckRef.current = now;
        navigateTo('/dashboard/business-ai?mode=voice');
        fetchCrmStatistics();
        return;
      }

      if (content.includes('lead') || content.includes('contact')) {
        console.log('📋 [AI Brain Voice Context] Detected leads/contacts query, navigating to contacts');
        lastStatsCheckRef.current = now;
        navigateTo('/dashboard/contacts');
        return;
      }

      if (content.includes('deal') || content.includes('pipeline')) {
        console.log('💼 [AI Brain Voice Context] Detected deals query, navigating to pipeline');
        lastStatsCheckRef.current = now;
        navigateTo('/dashboard/pipeline');
        return;
      }

      if (content.includes('campaign')) {
        console.log('📧 [AI Brain Voice Context] Detected campaigns query, navigating to campaigns');
        lastStatsCheckRef.current = now;
        navigateTo('/dashboard/campaigns');
        return;
      }

      const statsKeywords = ['statistic', 'statistics', 'stats', 'revenue', 'total', 'overview', 'summary', 'business performance', 'sales', 'leads', 'deals', 'pipeline'];
      const hasStatsKeyword = statsKeywords.some(k => content.includes(k));
      if (hasStatsKeyword && !wantsVisualization) {
        console.log('📊 [AI Brain Voice Context] General stats query, navigating to AI Brain for overview');
        lastStatsCheckRef.current = now;
        navigateTo('/dashboard/business-ai?mode=voice');
        fetchCrmStatistics();
      }
    }
  }, [fetchCrmStatistics, navigateTo]);

  return (
    <AIBrainVoiceContext.Provider
      value={{
        agentId,
        loading,
        error,
        conversationActive,
        setConversationActive,
        fetchCrmStatistics,
        handleMessage,
        navigateTo,
      }}
    >
      {children}
    </AIBrainVoiceContext.Provider>
  );
}

export function useAIBrainVoice() {
  const context = useContext(AIBrainVoiceContext);
  if (context === undefined) {
    throw new Error('useAIBrainVoice must be used within AIBrainVoiceProvider');
  }
  return context;
}

export const AI_BRAIN_VISUALIZATION_EVENT = VISUALIZATION_EVENT;
