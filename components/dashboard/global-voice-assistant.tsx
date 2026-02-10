/**
 * Global Voice Assistant Component
 * Floating voice assistant widget available throughout the CRM
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { ElevenLabsAgent } from '@/components/landing/soshogle/elevenlabs-agent';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, MicOff, X, Minimize2, Maximize2 } from 'lucide-react';
import { toast } from 'sonner';

const STORAGE_KEY = 'crm-voice-assistant-state';

export function GlobalVoiceAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
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
    // Get or create CRM voice agent
    fetchAgent();
  }, []);

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

  return (
    <>
      {/* Floating Button - Show if closed OR if conversation is active but minimized */}
      {(!isOpen || (isOpen && isMinimized && conversationActive)) && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            onClick={() => {
              setIsOpen(true);
              setIsMinimized(false);
            }}
            size="lg"
            className={`h-16 w-16 rounded-full shadow-lg ${
              conversationActive 
                ? 'bg-green-500 hover:bg-green-600 animate-pulse' 
                : 'bg-primary hover:bg-primary/90'
            }`}
          >
            <Mic className="h-6 w-6" />
          </Button>
        </div>
      )}

      {/* Voice Assistant Widget */}
      {isOpen && (
        <div className={`fixed ${isMinimized ? 'bottom-6 right-6' : 'bottom-6 right-6'} z-50`}>
          <Card className={`${isMinimized ? 'w-80' : 'w-96'} shadow-2xl border-2`}>
            <div className="p-4 border-b flex items-center justify-between bg-primary/5">
              <div className="flex items-center gap-2">
                <Mic className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">CRM Voice Assistant</h3>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMinimized(!isMinimized)}
                >
                  {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (conversationActive) {
                      // If conversation is active, just minimize instead of closing
                      setIsMinimized(true);
                    } else {
                      setIsOpen(false);
                      setIsMinimized(false);
                    }
                  }}
                  disabled={conversationActive}
                  title={conversationActive ? 'Conversation active - minimize instead' : 'Close'}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {!isMinimized && (
              <div className="p-4">
                <ElevenLabsAgent
                  agentId={agentId}
                  onConversationEnd={handleConversationEnd}
                  onAgentSpeakingChange={handleAgentSpeakingChange}
                  dynamicVariables={{
                    company_name: 'Your CRM',
                    user_name: 'User',
                  }}
                />
              </div>
            )}

            {isMinimized && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Click to expand voice assistant
              </div>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
