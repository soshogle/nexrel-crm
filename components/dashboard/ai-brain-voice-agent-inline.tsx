/**
 * AI Brain Voice Agent Inline Component
 * Renders the voice agent directly in the AI Brain page content
 * Uses shared context for persistence across pages
 */

'use client';

import { ElevenLabsAgent } from '@/components/landing/soshogle/elevenlabs-agent';
import { useAIBrainVoice } from '@/lib/ai-brain-voice-context';
import { Loader2 } from 'lucide-react';

export function AIBrainVoiceAgentInline() {
  const {
    agentId,
    loading,
    error,
    conversationActive,
    setConversationActive,
    handleMessage,
  } = useAIBrainVoice();

  const handleAgentSpeakingChange = (speaking: boolean) => {
    console.log('🎤 [AI Brain Voice Inline] Agent speaking change:', speaking);
    // When speaking starts, mark as active
    // When speaking stops, don't immediately mark as inactive - connection might just be paused
    if (speaking) {
      setConversationActive(true);
      // Always persist the active state when speaking starts
      if (typeof window !== 'undefined') {
        localStorage.setItem('ai-brain-voice-agent-state', JSON.stringify({
          conversationActive: true,
        }));
      }
    }
    // Don't set to false when speaking stops - connection might still be active
  };

  const handleConversationEnd = (transcript: any[], audioBlob?: Blob) => {
    console.log('🛑 [AI Brain Voice Inline] Conversation ended:', transcript);
    // Don't set to false - keep state active for reconnection
    // The WebRTC connection closes on unmount, but we want to preserve the "intent" to keep talking
    // Only clear state if user explicitly stops via button (which we'll handle separately)
  };

  if (loading) {
    return (
      <div className="relative w-full flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
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
