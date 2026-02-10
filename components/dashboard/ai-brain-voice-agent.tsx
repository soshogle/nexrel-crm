/**
 * AI Brain Voice Agent Component
 * Persistent voice agent for AI Brain that stays active across page navigation
 * Uses shared context for state management
 * Always renders when conversationActive is true, positioning changes based on page
 */

'use client';

import React, { useState, useEffect } from 'react';
import { ElevenLabsAgent } from '@/components/landing/soshogle/elevenlabs-agent';
import { usePathname } from 'next/navigation';
import { useAIBrainVoice } from '@/lib/ai-brain-voice-context';
import { Mic } from 'lucide-react';

export function AIBrainVoiceAgent() {
  const pathname = usePathname();
  const {
    agentId,
    loading,
    error,
    conversationActive,
    setConversationActive,
    handleMessage,
  } = useAIBrainVoice();

  const isAIBrainPage = pathname?.includes('/dashboard/business-ai') || pathname?.includes('/dashboard/ai-brain');
  
  // Check localStorage for persisted conversation state
  const [persistedActive, setPersistedActive] = useState(false);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedState = localStorage.getItem('ai-brain-voice-agent-state');
      if (savedState) {
        try {
          const state = JSON.parse(savedState);
          setPersistedActive(state.conversationActive || false);
        } catch (e) {
          console.error('Failed to load persisted state:', e);
        }
      }
    }
  }, []);

  // Always render when conversation is active OR persisted as active (for persistence)
  // On AI Brain page, this will be hidden and inline component takes over
  // On other pages, this shows as floating widget
  const shouldShow = conversationActive || persistedActive;

  const handleAgentSpeakingChange = (speaking: boolean) => {
    console.log('🎤 [AI Brain Voice Global] Agent speaking change:', speaking);
    // When speaking starts, mark as active
    // When speaking stops, don't immediately mark as inactive - connection might just be paused
    if (speaking) {
      setConversationActive(true);
      // Update persisted state
      if (typeof window !== 'undefined') {
        localStorage.setItem('ai-brain-voice-agent-state', JSON.stringify({
          conversationActive: true,
        }));
        setPersistedActive(true);
      }
    }
    // Don't set to false when speaking stops - connection might still be active
  };

  const handleConversationEnd = (transcript: any[], audioBlob?: Blob) => {
    console.log('🛑 [AI Brain Voice] Conversation ended:', transcript);
    // Don't set to false immediately - keep state active for reconnection
    // Only clear if user explicitly stops via button
  };

  // Don't render if loading or error
  if (loading || error || !agentId) {
    return null;
  }

  // Don't render globally when on AI Brain page (inline component handles it)
  if (isAIBrainPage) {
    return null;
  }

  // Only render globally when conversation is active (or persisted) and NOT on AI Brain page
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
