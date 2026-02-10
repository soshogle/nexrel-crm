/**
 * AI Brain Voice Agent Inline Component
 * Renders the voice agent directly in the AI Brain page content
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { ElevenLabsAgent } from '@/components/landing/soshogle/elevenlabs-agent';

const STORAGE_KEY = 'ai-brain-voice-agent-state';
const VISUALIZATION_EVENT = 'ai-brain-visualization-update';

export function AIBrainVoiceAgentInline() {
  const [agentId, setAgentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conversationActive, setConversationActive] = useState(false);
  const lastStatsCheckRef = useRef<number>(0);

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

  useEffect(() => {
    const fetchAgent = async () => {
      try {
        setLoading(true);
        console.log('🔄 [AI Brain Voice Inline] Loading CRM voice agent...');
        const response = await fetch('/api/crm-voice-agent');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.agentId) {
            setAgentId(data.agentId);
            console.log('✅ [AI Brain Voice Inline] CRM voice agent loaded:', data.agentId);
          } else {
            throw new Error(data.error || 'Failed to get voice agent');
          }
        } else {
          throw new Error('Failed to get voice agent');
        }
      } catch (err: any) {
        console.error('❌ [AI Brain Voice Inline] Error fetching CRM voice agent:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAgent();
  }, []);

  const fetchCrmStatistics = async () => {
    try {
      console.log('📊 [AI Brain Voice Inline] Fetching CRM statistics...');
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
        console.error('❌ [AI Brain Voice Inline] Failed to fetch statistics:', response.status, errorText);
        return;
      }
      
      const data = await response.json();
      console.log('📥 [AI Brain Voice Inline] Statistics response:', data);
      
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
      console.error('❌ [AI Brain Voice Inline] Failed to fetch CRM statistics:', error);
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
        console.log('📊 [AI Brain Voice Inline] Detected statistics query in agent message, fetching data...');
        lastStatsCheckRef.current = now;
        fetchCrmStatistics();
      }
    }
  };

  const handleAgentSpeakingChange = (speaking: boolean) => {
    setConversationActive(speaking);
    // Save to localStorage for persistence across pages
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        conversationActive: speaking,
      }));
    }
  };

  const handleConversationEnd = (transcript: any[], audioBlob?: Blob) => {
    console.log('🛑 [AI Brain Voice Inline] Conversation ended:', transcript);
    setConversationActive(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        conversationActive: false,
      }));
    }
  };

  if (loading) {
    return (
      <div className="relative w-full flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error || !agentId) {
    return (
      <div className="relative w-full p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600 text-sm">Failed to load voice agent: {error || 'Unknown error'}</p>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <ElevenLabsAgent 
        agentId={agentId}
        autoStart={false}
        onAudioLevel={() => {}}
        onAgentSpeakingChange={handleAgentSpeakingChange}
        onMessage={handleMessage}
        onConversationEnd={handleConversationEnd}
      />
    </div>
  );
}
