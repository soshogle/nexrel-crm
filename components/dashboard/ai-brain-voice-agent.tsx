/**
 * AI Brain Voice Agent Component
 * Persistent voice agent for AI Brain that stays active across page navigation
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { ElevenLabsAgent } from '@/components/landing/soshogle/elevenlabs-agent';
import { usePathname } from 'next/navigation';

const STORAGE_KEY = 'ai-brain-voice-agent-state';
const VISUALIZATION_EVENT = 'ai-brain-visualization-update';

export function AIBrainVoiceAgent() {
  const pathname = usePathname();
  const [agentId, setAgentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [conversationActive, setConversationActive] = useState(false);
  const lastStatsCheckRef = useRef<number>(0);

  // Only show on AI Brain page or when conversation is active
  const isAIBrainPage = pathname?.includes('/dashboard/business-ai') || pathname?.includes('/dashboard/ai-brain');
  // Don't render globally when on AI Brain page - it will be rendered directly in the page
  const shouldShow = !isAIBrainPage && conversationActive;


  // Load persisted state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedState = localStorage.getItem(STORAGE_KEY);
      if (savedState) {
        try {
          const state = JSON.parse(savedState);
          setConversationActive(state.conversationActive || false);
        } catch (e) {
          console.error('Failed to load AI Brain voice agent state:', e);
        }
      }
    }
  }, []);

  // Save state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        conversationActive,
      }));
    }
  }, [conversationActive]);

  useEffect(() => {
    // Get or create CRM voice agent
    fetchAgent();
  }, []);

  const fetchAgent = async () => {
    try {
      setLoading(true);
      console.log('🔄 [AI Brain Voice] Loading CRM voice agent...');
      const response = await fetch('/api/crm-voice-agent');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.agentId) {
          setAgentId(data.agentId);
          console.log('✅ [AI Brain Voice] CRM voice agent loaded:', data.agentId);
        } else {
          throw new Error(data.error || 'Failed to get voice agent');
        }
      } else {
        throw new Error('Failed to get voice agent');
      }
    } catch (err: any) {
      console.error('❌ [AI Brain Voice] Error fetching CRM voice agent:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCrmStatistics = async () => {
    try {
      console.log('📊 [AI Brain Voice] Fetching CRM statistics...');
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
        console.error('❌ [AI Brain Voice] Failed to fetch statistics:', response.status, errorText);
        return;
      }
      
      const data = await response.json();
      console.log('📥 [AI Brain Voice] Statistics response:', data);
      
      if (data.success && data.statistics) {
        // Dispatch custom event to notify AI Brain page to show visualizations
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent(VISUALIZATION_EVENT, {
            detail: {
              statistics: data.statistics,
              show: true,
            },
          }));
        }
      }
    } catch (error: any) {
      console.error('❌ [AI Brain Voice] Failed to fetch CRM statistics:', error);
    }
  };

  const handleMessage = (message: any) => {
    // Real-time message monitoring for automatic visualization
    const now = Date.now();
    const timeSinceLastCheck = now - lastStatsCheckRef.current;
    
    // Throttle checks to avoid too many API calls (max once per 3 seconds)
    if (timeSinceLastCheck < 3000) {
      return;
    }
    
    // Check if agent message contains statistics-related keywords
    if (message.role === 'agent' && message.content) {
      const content = message.content.toLowerCase();
      const statsKeywords = [
        'statistic', 'statistics', 'stats', 'data', 'revenue', 'leads', 'deals',
        'campaigns', 'contacts', 'total', 'overview', 'summary', 'report',
        'show', 'display', 'here are', 'you have', 'your crm', 'business performance'
      ];
      
      const hasStatsKeyword = statsKeywords.some(keyword => content.includes(keyword));
      
      // Also check for numbers that might indicate statistics
      const hasNumbers = /\d+/.test(message.content);
      
      if (hasStatsKeyword || (hasNumbers && (content.includes('lead') || content.includes('deal') || content.includes('revenue')))) {
        console.log('📊 [AI Brain Voice] Detected statistics query in agent message, fetching data...');
        lastStatsCheckRef.current = now;
        fetchCrmStatistics();
      }
    }
  };

  const handleAgentSpeakingChange = (speaking: boolean) => {
    setIsConnected(speaking);
    setConversationActive(speaking);
  };

  const handleConversationEnd = (transcript: any[], audioBlob?: Blob) => {
    console.log('🛑 [AI Brain Voice] Conversation ended:', transcript);
    setConversationActive(false);
  };

  // Don't render if loading or error
  if (loading || error || !agentId) {
    return null;
  }

  // Only render globally when NOT on AI Brain page and conversation is active
  // When on AI Brain page, the agent will be rendered directly in the page component
  if (!shouldShow) {
    return null;
  }

  // Render as floating widget when conversation is active but not on AI Brain page
  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 shadow-2xl rounded-lg overflow-hidden border-2 border-purple-200 bg-white">
      <div className="p-4 bg-gradient-to-br from-purple-50 to-white border-b">
        <div className="flex items-center gap-2">
          <Mic className="h-5 w-5 text-purple-600" />
          <h3 className="font-semibold text-sm">AI Brain Voice Assistant</h3>
        </div>
      </div>
      <div className="p-4">
        <ElevenLabsAgent 
          agentId={agentId}
          autoStart={false}
          onAudioLevel={() => {}}
          onAgentSpeakingChange={handleAgentSpeakingChange}
          onMessage={handleMessage}
          onConversationEnd={handleConversationEnd}
        />
      </div>
    </div>
  );
}

// Hook to get the agent component for inline rendering on AI Brain page
export function useAIBrainVoiceAgent() {
  const pathname = usePathname();
  const [agentId, setAgentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conversationActive, setConversationActive] = useState(false);
  const lastStatsCheckRef = useRef<number>(0);

  const isAIBrainPage = pathname?.includes('/dashboard/business-ai') || pathname?.includes('/dashboard/ai-brain');

  useEffect(() => {
    if (!isAIBrainPage) return;
    
    const fetchAgent = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/crm-voice-agent');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.agentId) {
            setAgentId(data.agentId);
          }
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAgent();
  }, [isAIBrainPage]);

  const fetchCrmStatistics = async () => {
    try {
      const response = await fetch('/api/crm-voice-agent/functions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          function_name: 'get_statistics',
          parameters: {},
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.statistics) {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(VISUALIZATION_EVENT, {
              detail: {
                statistics: data.statistics,
                show: true,
              },
            }));
          }
        }
      }
    } catch (error: any) {
      console.error('❌ Failed to fetch CRM statistics:', error);
    }
  };

  const handleMessage = (message: any) => {
    const now = Date.now();
    const timeSinceLastCheck = now - lastStatsCheckRef.current;
    
    if (timeSinceLastCheck < 3000) {
      return;
    }
    
    if (message.role === 'agent' && message.content) {
      const content = message.content.toLowerCase();
      const statsKeywords = [
        'statistic', 'statistics', 'stats', 'data', 'revenue', 'leads', 'deals',
        'campaigns', 'contacts', 'total', 'overview', 'summary', 'report',
        'show', 'display', 'here are', 'you have', 'your crm', 'business performance'
      ];
      
      const hasStatsKeyword = statsKeywords.some(keyword => content.includes(keyword));
      const hasNumbers = /\d+/.test(message.content);
      
      if (hasStatsKeyword || (hasNumbers && (content.includes('lead') || content.includes('deal') || content.includes('revenue')))) {
        lastStatsCheckRef.current = now;
        fetchCrmStatistics();
      }
    }
  };

  const handleAgentSpeakingChange = (speaking: boolean) => {
    setConversationActive(speaking);
    // Save to localStorage for persistence
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        conversationActive: speaking,
      }));
    }
  };

  const handleConversationEnd = () => {
    setConversationActive(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        conversationActive: false,
      }));
    }
  };

  return {
    agentId,
    loading,
    error,
    conversationActive,
    handleMessage,
    handleAgentSpeakingChange,
    handleConversationEnd,
  };
}

// Export event name for use in AI Brain page
export const AI_BRAIN_VISUALIZATION_EVENT = VISUALIZATION_EVENT;
