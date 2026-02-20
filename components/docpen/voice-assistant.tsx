'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  Brain,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  PhoneOff,
  Loader2,
  AlertCircle,
  Waves,
  User,
  Bot,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Conversation } from '@elevenlabs/client';
import type { DocpenProfessionType } from '@/lib/docpen/prompts';

interface VoiceMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface VoiceAssistantProps {
  sessionId: string;
  profession: DocpenProfessionType;
  customProfession?: string;
  patientName?: string;
  chiefComplaint?: string;
  consultantName?: string;
  onTranscript?: (transcript: string, speaker: 'user' | 'assistant') => void;
}

export function VoiceAssistant({
  sessionId,
  profession,
  customProfession,
  patientName,
  chiefComplaint,
  consultantName,
  onTranscript,
}: VoiceAssistantProps) {
  const t = useTranslations('toasts.docpen');
  const tGeneral = useTranslations('toasts.general');
  const { data: session, status: sessionStatus } = useSession();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isSpeakerEnabled, setIsSpeakerEnabled] = useState(true);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [pushToTalk, setPushToTalk] = useState(false);
  const [isPushToTalkActive, setIsPushToTalkActive] = useState(false);
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [connectionStartTime, setConnectionStartTime] = useState<Date | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const conversationRef = useRef<any>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  /**
   * Initialize the Docpen voice agent
   */
  const initializeAgent = async (): Promise<string | null> => {
    try {
      console.log('🚀 [Docpen] Initializing agent with:', {
        profession,
        customProfession,
        sessionContext: { patientName, chiefComplaint, sessionId },
      });

      // Use forceCreate if we've had connection issues
      const forceCreate = retryCount > 0;
      const url = forceCreate 
        ? '/api/docpen/voice-agent?forceCreate=true'
        : '/api/docpen/voice-agent';
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profession,
          customProfession,
          practitionerName: consultantName,
          sessionContext: {
            patientName,
            chiefComplaint,
            sessionId,
          },
          forceCreate: forceCreate,
        }),
      });

      console.log('📥 [Docpen] Agent initialization response status:', response.status);

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ [Docpen] Agent initialization failed:', error);
        throw new Error(error.error || 'Failed to initialize agent');
      }

      const data = await response.json();
      console.log('✅ [Docpen] Agent initialization success:', data);
      console.log('📝 [Docpen] Agent ID received:', data.agentId);
      
      if (!data.agentId) {
        console.error('❌ [Docpen] No agentId in response:', data);
        throw new Error('Agent ID not returned from server');
      }

      return data.agentId;
    } catch (err: any) {
      console.error('❌ [Docpen] Failed to initialize agent:', err);
      console.error('   Error details:', {
        message: err.message,
        stack: err.stack,
        name: err.name,
      });
      setError(err.message);
      toast.error(err.message || t('voiceAgentInitFailed'));
      return null;
    }
  };

  /**
   * Get conversation token for ElevenLabs SDK
   */
  const getConversationToken = async (agentIdToUse: string): Promise<string | null> => {
    try {
      const response = await fetch('/api/docpen/conversation-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: agentIdToUse }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get conversation token');
      }

      const data = await response.json();
      return data.token;
    } catch (err: any) {
      console.error('❌ [Docpen] Failed to get conversation token:', err);
      setError(err.message);
      return null;
    }
  };

  /**
   * Fetch transcript from ElevenLabs API
   */
  const fetchTranscriptFromElevenLabs = async (convId: string): Promise<any[] | null> => {
    try {
      const response = await fetch(`/api/elevenlabs/conversations/${convId}`);
      if (!response.ok) {
        console.warn('⚠️ [Docpen] Failed to fetch transcript from ElevenLabs:', response.status);
        return null;
      }
      const data = await response.json();
      return data.conversation?.transcript || null;
    } catch (error) {
      console.error('❌ [Docpen] Error fetching transcript:', error);
      return null;
    }
  };

  /**
   * Save conversation to database
   */
  const saveConversation = async () => {
    if (!agentId) return;

    try {
      const endTime = new Date();
      const durationSec = connectionStartTime
        ? Math.round((endTime.getTime() - connectionStartTime.getTime()) / 1000)
        : 0;

      // Try to fetch full transcript from ElevenLabs if we have the conversation ID
      let transcript = null;
      let audioUrl = null;
      
      if (conversationId) {
        console.log('📥 [Docpen] Fetching transcript from ElevenLabs for:', conversationId);
        const elevenLabsData = await fetchTranscriptFromElevenLabs(conversationId);
        
        if (elevenLabsData && Array.isArray(elevenLabsData)) {
          // Use transcript from ElevenLabs
          transcript = elevenLabsData;
          console.log('✅ [Docpen] Using transcript from ElevenLabs:', transcript.length, 'turns');
        } else {
          // Fallback to local messages
          transcript = messages.map((m) => ({
            role: m.role === 'assistant' ? 'agent' : 'user',
            message: m.content,
            time_in_call_secs: 0,
          }));
          console.log('⚠️ [Docpen] Using local messages as fallback:', transcript.length, 'messages');
        }
        
        // Set audio URL if available
        audioUrl = `/api/calls/audio/${conversationId}`;
      } else {
        // Fallback to local messages if no conversation ID
        transcript = messages.map((m) => ({
          role: m.role === 'assistant' ? 'agent' : 'user',
          message: m.content,
          time_in_call_secs: 0,
        }));
        console.log('⚠️ [Docpen] No conversation ID, using local messages:', transcript.length, 'messages');
      }

      await fetch('/api/docpen/conversations/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          sessionId,
          patientName: patientName || 'Unknown',
          startedAt: connectionStartTime?.toISOString(),
          endedAt: endTime.toISOString(),
          durationSec,
          transcript,
          messageCount: transcript?.length || messages.length,
          turnCount: Math.ceil((transcript?.length || messages.length) / 2),
          elevenLabsConvId: conversationId, // Use real conversation ID
          audioUrl: audioUrl,
        }),
      });

      console.log('✅ [Docpen] Conversation saved with conversation ID:', conversationId);
    } catch (error) {
      console.error('❌ [Docpen] Failed to save conversation:', error);
    }
  };

  /**
   * Connect to voice agent using ElevenLabs SDK
   */
  const connect = async () => {
    if (isConnecting || isConnected) return;

    // Guard: Ensure session is ready before connecting
    if (sessionStatus === 'loading') {
      toast.error(tGeneral('waitForSession'));
      return;
    }

    if (sessionStatus === 'unauthenticated' || !session?.user?.id) {
      toast.error(tGeneral('signInRequired'));
      setError('Session not authenticated');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Step 1: Initialize or get agent
      let currentAgentId = agentId;
      if (!currentAgentId) {
        console.log('🚀 [Docpen] Initializing voice agent...');
        currentAgentId = await initializeAgent();
        if (!currentAgentId) {
          throw new Error('Failed to initialize voice agent');
        }
        setAgentId(currentAgentId);
        console.log('✅ [Docpen] Agent initialized:', currentAgentId);
      }

      // Step 2: Get conversation token
      console.log('🔗 [Docpen] Getting conversation token...');
      const conversationToken = await getConversationToken(currentAgentId);
      if (!conversationToken) {
        throw new Error('Failed to get conversation token');
      }
      console.log('✅ [Docpen] Got conversation token');

      // Step 3: Request microphone access
      console.log('🎤 [Docpen] Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      console.log('✅ [Docpen] Microphone access granted');

      // Step 4: Set up SDK session options
      const sessionOptions = {
        conversationToken,
        onConnect: (event?: any) => {
          console.log('✅ [Docpen] SDK connected', event);
          
          // Try to get conversation ID from event or session object
          if (event?.conversation_id) {
            console.log('📝 [Docpen] Conversation ID from onConnect:', event.conversation_id);
            setConversationId(event.conversation_id);
          } else if (conversationRef.current?.conversation_id) {
            console.log('📝 [Docpen] Conversation ID from session object:', conversationRef.current.conversation_id);
            setConversationId(conversationRef.current.conversation_id);
          }
          
          setIsConnected(true);
          setIsConnecting(false);
          setConnectionStartTime(new Date());
          setMessages([]);
          setRetryCount(0);
          toast.success(t('voiceAssistantConnected'));
        },
        onDisconnect: async (details?: unknown) => {
          // Only log unexpected disconnects (user-initiated reason:"user" is normal)
          const d = details as { reason?: string } | null | undefined;
          if (typeof d !== "object" || d === null || !d.reason || d.reason !== "user") {
            console.log('🔔 [Docpen] SDK disconnected', details ? JSON.stringify(details) : '');
          }
          setIsConnected(false);
          setIsAgentSpeaking(false);
          await saveConversation();
          cleanup();
        },
        onError: (error: any) => {
          console.error('❌ [Docpen] SDK error:', error);
          const message =
            error?.message ||
            error?.error ||
            'Could not establish connection. Please try again.';
          setError(message);
          setIsConnecting(false);
          toast.error(message);
        },
        onMessage: (message: any) => {
          console.log('📨 [Docpen] SDK message:', message);
          
          // Capture conversation ID if provided in message
          if (message.conversation_id && !conversationId) {
            console.log('📝 [Docpen] Captured conversation ID from message:', message.conversation_id);
            setConversationId(message.conversation_id);
          }
          
          if (message.message) {
            const newMsg: VoiceMessage = {
              id: Date.now().toString(),
              role: message.source === 'ai' ? 'assistant' : 'user',
              content: message.message,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, newMsg]);
            onTranscript?.(message.message, message.source === 'ai' ? 'assistant' : 'user');
          }
        },
        onEvent: (event: any) => {
          console.log('📡 [Docpen] SDK event:', event);
          
          // Capture conversation ID from events
          if (event?.conversation_id && !conversationId) {
            console.log('📝 [Docpen] Captured conversation ID from event:', event.conversation_id);
            setConversationId(event.conversation_id);
          }
        },
        onModeChange: (mode: any) => {
          console.log('🔄 [Docpen] Mode changed:', mode.mode);
          if (mode.mode === 'speaking') {
            setIsAgentSpeaking(true);
          } else if (mode.mode === 'listening') {
            setIsAgentSpeaking(false);
          }
        },
      };

      // Step 5: Start SDK session (try WebRTC first, fallback to WebSocket)
      const startWebrtcSession = async () => {
        return Conversation.startSession({
          ...sessionOptions,
          connectionType: 'webrtc',
        });
      };

      const startWebsocketSession = async () => {
        return (Conversation as any).startSession({
          ...sessionOptions,
          connectionType: 'websocket',
        });
      };

      try {
        console.log('🔗 [Docpen] Starting WebRTC session...');
        conversationRef.current = await startWebrtcSession();
        console.log('✅ [Docpen] WebRTC session started');
        
        // Try to get conversation ID from session object after connection
        setTimeout(() => {
          if (conversationRef.current) {
            const sessionConvId = (conversationRef.current as any).conversation_id || 
                                 (conversationRef.current as any).conversationId ||
                                 (conversationRef.current as any).getConversationId?.();
            if (sessionConvId && !conversationId) {
              console.log('📝 [Docpen] Conversation ID from session object:', sessionConvId);
              setConversationId(sessionConvId);
            }
          }
        }, 1000);
      } catch (sessionError: any) {
        const message = sessionError?.message || '';
        if (message.includes('Failed to fetch') || message.includes('signal')) {
          console.log('⚠️ [Docpen] WebRTC failed, trying WebSocket fallback...');
          try {
            conversationRef.current = await startWebsocketSession();
            console.log('✅ [Docpen] WebSocket session started');
          } catch (fallbackError: any) {
            console.error('❌ [Docpen] WebSocket fallback failed:', fallbackError);
            if (audioStreamRef.current) {
              audioStreamRef.current.getTracks().forEach((track) => track.stop());
              audioStreamRef.current = null;
            }
            throw fallbackError;
          }
        } else {
          if (audioStreamRef.current) {
            audioStreamRef.current.getTracks().forEach((track) => track.stop());
            audioStreamRef.current = null;
          }
          throw sessionError;
        }
      }
    } catch (err: any) {
      console.error('❌ [Docpen] Connection failed:', err);
      if (err.name === 'NotAllowedError') {
        setError('Microphone access denied. Please grant permission and try again.');
        toast.error(tGeneral('microphoneDenied'));
      } else {
        setError(err.message || 'Failed to connect');
        toast.error(err.message || t('connectionFailed'));
      }
      setIsConnecting(false);
      cleanup();
    }
  };

  /**
   * Disconnect from voice agent
   */
  const disconnect = async () => {
    await saveConversation();
    if (conversationRef.current) {
      try {
        conversationRef.current.endSession();
      } catch (e) {
        console.error('❌ [Docpen] Error ending session:', e);
      }
      conversationRef.current = null;
    }
    cleanup();
    setIsConnected(false);
    setConnectionStartTime(null);
    toast.info(t('voiceAssistantDisconnected'));
  };

  /**
   * Cleanup resources
   */
  const cleanup = () => {
    console.log('🧹 [Docpen] Starting cleanup...');
    
    // End SDK session
    if (conversationRef.current) {
      try {
        conversationRef.current.endSession();
      } catch (e) {
        console.error('⚠️ [Docpen] Error ending SDK session:', e);
      }
      conversationRef.current = null;
    }
    
    // Stop all media tracks
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => {
        track.stop();
        console.log(`🎤 [Docpen] Stopped ${track.kind} track`);
      });
      audioStreamRef.current = null;
    }
    
    console.log('✅ [Docpen] Cleanup complete');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('🔄 [Docpen] Component unmounting - cleaning up...');
      cleanup();
    };
  }, []);

  const getProfessionDisplayName = () => {
    const names: Record<string, string> = {
      GENERAL_PRACTICE: 'General Practice',
      DENTIST: 'Dental',
      OPTOMETRIST: 'Optometry',
      DERMATOLOGIST: 'Dermatology',
      CARDIOLOGIST: 'Cardiology',
      PSYCHIATRIST: 'Psychiatry',
      PEDIATRICIAN: 'Pediatrics',
      ORTHOPEDIC: 'Orthopedic',
      PHYSIOTHERAPIST: 'Physiotherapy',
      CHIROPRACTOR: 'Chiropractic',
      CUSTOM: customProfession || 'Custom',
    };
    return names[profession] || 'Medical';
  };

  return (
    <Card className={`h-full flex flex-col ${isConnected ? 'border-green-500' : error ? 'border-red-500' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            Voice Assistant
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {getProfessionDisplayName()}
            </Badge>
            {isConnected ? (
              <Badge variant="default" className="bg-green-500">
                Connected
              </Badge>
            ) : (
              <Badge variant="secondary">Disconnected</Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-4">
        {/* Show loading state if session is not ready */}
        {sessionStatus === 'loading' && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading session...</span>
          </div>
        )}
        
        {/* Show error if session is not authenticated */}
        {sessionStatus === 'unauthenticated' && (
          <div className="flex items-center justify-center py-8">
            <AlertCircle className="h-6 w-6 text-red-500" />
            <span className="ml-2 text-sm text-red-500">Please sign in to use voice assistant</span>
          </div>
        )}

        {/* Controls - only show if session is ready */}
        {sessionStatus === 'authenticated' && session && (
          <div className="flex items-center justify-center gap-2">
            {!isConnected ? (
              <Button onClick={connect} disabled={isConnecting} size="lg">
                {isConnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                <>
                  <Mic className="h-4 w-4 mr-2" />
                  Connect
                </>
              )}
            </Button>
          ) : (
            <>
              <Button variant="destructive" onClick={disconnect} size="sm">
                <PhoneOff className="h-4 w-4 mr-2" />
                End
              </Button>
              <Button
                variant={isMicEnabled ? 'default' : 'secondary'}
                size="icon"
                onClick={() => setIsMicEnabled(!isMicEnabled)}
              >
                {isMicEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              </Button>
              <Button
                variant={isSpeakerEnabled ? 'default' : 'secondary'}
                size="icon"
                onClick={() => setIsSpeakerEnabled(!isSpeakerEnabled)}
              >
                {isSpeakerEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>
              <div className="flex items-center gap-2 ml-4">
                <Switch
                  id="push-to-talk"
                  checked={pushToTalk}
                  onCheckedChange={setPushToTalk}
                />
                <Label htmlFor="push-to-talk" className="text-xs">
                  Push to Talk
                </Label>
              </div>
            </>
          )}
          </div>
        )}

        {/* Agent Speaking Indicator */}
        {isAgentSpeaking && (
          <div className="flex items-center justify-center gap-2 text-purple-500">
            <Waves className="h-4 w-4 animate-pulse" />
            <span className="text-sm">Docpen is speaking...</span>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950 rounded-lg text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Messages */}
        <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
          <div className="space-y-3">
            {messages.length === 0 && isConnected && (
              <div className="text-center text-muted-foreground py-8">
                <Waves className="h-8 w-8 mx-auto mb-2 animate-pulse" />
                <p>Listening... Say "Docpen" to ask a question</p>
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 ${msg.role === 'assistant' ? '' : 'justify-end'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-950 h-fit">
                    <Bot className="h-4 w-4 text-purple-600" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    msg.role === 'assistant'
                      ? 'bg-muted'
                      : 'bg-blue-100 dark:bg-blue-950'
                  }`}
                >
                  <p className="text-sm">{msg.content}</p>
                </div>
                {msg.role === 'user' && (
                  <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-950 h-fit">
                    <User className="h-4 w-4 text-blue-600" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Patient Info */}
        {patientName && (
          <div className="text-xs text-muted-foreground border-t pt-2">
            Patient: <span className="font-medium">{patientName}</span>
            {chiefComplaint && (
              <>
                {' '}
                CC: <span className="font-medium">{chiefComplaint}</span>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
