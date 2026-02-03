'use client';

import { useState, useRef, useEffect } from 'react';
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
  onTranscript?: (transcript: string, speaker: 'user' | 'assistant') => void;
}

export function VoiceAssistant({
  sessionId,
  profession,
  customProfession,
  patientName,
  chiefComplaint,
  onTranscript,
}: VoiceAssistantProps) {
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

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
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
      const response = await fetch('/api/docpen/voice-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profession,
          customProfession,
          sessionContext: {
            patientName,
            chiefComplaint,
            sessionId,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to initialize agent');
      }

      const data = await response.json();
      return data.agentId;
    } catch (err: any) {
      console.error('[Docpen] Failed to initialize agent:', err);
      setError(err.message);
      toast.error(err.message || 'Failed to initialize voice agent');
      return null;
    }
  };

  /**
   * Get signed WebSocket URL for conversation
   */
  const getSignedWebSocketUrl = async (agentIdToUse: string): Promise<string | null> => {
    try {
      const response = await fetch('/api/docpen/voice-agent/websocket-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: agentIdToUse,
          sessionContext: {
            patientName,
            chiefComplaint,
            sessionId,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get WebSocket URL');
      }

      const data = await response.json();
      return data.signedUrl;
    } catch (err: any) {
      console.error('[Docpen] Failed to get WebSocket URL:', err);
      setError(err.message);
      return null;
    }
  };

  /**
   * Convert Float32 audio to Int16 PCM
   */
  const convertFloat32ToInt16 = (buffer: Float32Array): Int16Array => {
    const l = buffer.length;
    const int16Array = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      const s = Math.max(-1, Math.min(1, buffer[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return int16Array;
  };

  /**
   * Play audio chunk from ElevenLabs
   */
  const playAudioChunk = async (base64Audio: string) => {
    try {
      if (audioContextRef.current?.state === 'suspended') {
        await audioContextRef.current.resume();
        console.log('🔊 [Docpen] Audio context resumed');
      }

      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          const audioData = bytes.buffer.slice(0);
          const audioBuffer = await audioContextRef.current.decodeAudioData(audioData);
          const source = audioContextRef.current.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(audioContextRef.current.destination);
          source.start();
          console.log('✅ [Docpen] Audio chunk played');
        } catch (decodeError) {
          console.warn('⚠️ [Docpen] Failed to decode audio:', decodeError);
        }
      }
    } catch (error) {
      console.error('❌ [Docpen] Error playing audio:', error);
    }
  };

  /**
   * Save conversation to database
   */
  const saveConversation = async () => {
    if (!agentId || messages.length === 0) return;

    try {
      const endTime = new Date();
      const durationSec = connectionStartTime
        ? Math.round((endTime.getTime() - connectionStartTime.getTime()) / 1000)
        : 0;

      const transcript = messages.map((m) => ({
        role: m.role === 'assistant' ? 'agent' : 'user',
        message: m.content,
        time_in_call_secs: 0,
      }));

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
          messageCount: messages.length,
          turnCount: Math.ceil(messages.length / 2),
        }),
      });

      console.log('✅ [Docpen] Conversation saved');
    } catch (error) {
      console.error('❌ [Docpen] Failed to save conversation:', error);
    }
  };

  /**
   * Connect to voice agent
   */
  const connect = async () => {
    if (isConnecting || isConnected) return;

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

      // Step 2: Get signed WebSocket URL
      console.log('🔗 [Docpen] Getting signed WebSocket URL...');
      const wsUrl = await getSignedWebSocketUrl(currentAgentId);
      if (!wsUrl) {
        throw new Error('Failed to get WebSocket URL');
      }
      console.log('✅ [Docpen] Got signed URL');

      // Step 3: Request microphone access
      console.log('🎤 [Docpen] Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      console.log('✅ [Docpen] Microphone access granted');

      // Step 4: Set up audio context
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
        console.log('🔊 [Docpen] Audio context resumed');
      }

      const source = audioContextRef.current.createMediaStreamSource(stream);
      const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);

      // Step 5: Connect WebSocket
      console.log('🔗 [Docpen] Connecting WebSocket...');
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ [Docpen] WebSocket connected');
        setIsConnected(true);
        setIsConnecting(false);
        setConnectionStartTime(new Date());
        setMessages([]);
        toast.success('Voice assistant connected - Listen for the greeting!');
        console.log('🎧 [Docpen] Waiting for agent greeting message...');

        // Start sending audio after brief delay to allow agent to speak first
        setTimeout(() => {
          processor.onaudioprocess = (e) => {
            try {
              if (ws.readyState === WebSocket.OPEN) {
                if (!isMicEnabled) return;
                if (pushToTalk && !isPushToTalkActive) return;

                const inputData = e.inputBuffer.getChannelData(0);
                const pcm16 = convertFloat32ToInt16(inputData);
                const base64Audio = btoa(
                  String.fromCharCode(...new Uint8Array(pcm16.buffer))
                );
                ws.send(JSON.stringify({ user_audio_chunk: base64Audio }));
              }
            } catch (err) {
              console.error('Error processing audio:', err);
            }
          };

          source.connect(processor);
          processor.connect(audioContextRef.current!.destination);
          console.log('🎤 [Docpen] Audio processing started - microphone is active');
        }, 1000); // Increased delay to give agent time to speak first message
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          const messageType = message.type || (message.agent_transcript ? 'agent_transcript' : (message.user_transcript ? 'user_transcript' : (message.audio ? 'audio' : 'unknown')));
          console.log('📨 [Docpen] Received:', messageType, message);

          // Handle conversation ID
          if (message.conversation_id) {
            setConversationId(message.conversation_id);
            console.log('📝 [Docpen] Conversation ID:', message.conversation_id);
          }

          // Handle user transcript
          if (message.user_transcript) {
            console.log('👤 [Docpen] User said:', message.user_transcript);
            const newMsg: VoiceMessage = {
              id: Date.now().toString(),
              role: 'user',
              content: message.user_transcript,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, newMsg]);
            onTranscript?.(message.user_transcript, 'user');
          }

          // Handle agent transcript (including first message)
          if (message.agent_transcript) {
            console.log('🤖 [Docpen] Agent said:', message.agent_transcript);
            const newMsg: VoiceMessage = {
              id: Date.now().toString(),
              role: 'assistant',
              content: message.agent_transcript,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, newMsg]);
            onTranscript?.(message.agent_transcript, 'assistant');
            setIsAgentSpeaking(true);
            setTimeout(() => setIsAgentSpeaking(false), 2000);
          }

          // Handle audio response (this is how ElevenLabs sends speech)
          if (message.audio) {
            console.log('🔊 [Docpen] Received audio chunk from agent');
            setIsAgentSpeaking(true);
            if (isSpeakerEnabled) {
              playAudioChunk(message.audio);
            } else {
              console.warn('⚠️ [Docpen] Speaker disabled - audio chunk received but not played');
            }
            setTimeout(() => setIsAgentSpeaking(false), 1000);
          }

          // Handle agent response (alternative format)
          if (message.agent_response) {
            console.log('🤖 [Docpen] Agent response:', message.agent_response);
            if (message.agent_response.text) {
              const newMsg: VoiceMessage = {
                id: Date.now().toString(),
                role: 'assistant',
                content: message.agent_response.text,
                timestamp: new Date(),
              };
              setMessages((prev) => [...prev, newMsg]);
              onTranscript?.(message.agent_response.text, 'assistant');
            }
          }

          // Handle interruption
          if (message.type === 'interruption') {
            console.log('⏸️ [Docpen] Agent interrupted');
            setIsAgentSpeaking(false);
          }

          // Handle errors
          if (message.type === 'error') {
            console.error('❌ [Docpen] Agent error:', message.message || message.error);
            toast.error(message.message || message.error || 'Agent error');
          }
        } catch (err) {
          console.error('❌ [Docpen] Failed to parse message:', err, event.data);
        }
      };

      ws.onerror = (err) => {
        console.error('❌ [Docpen] WebSocket error:', err);
        setError('Connection error');
        toast.error('Connection error');
      };

      ws.onclose = async (event) => {
        console.log('🔔 [Docpen] WebSocket closed:', event.code, event.reason);
        setIsConnected(false);
        await saveConversation();
        cleanup();
        if (!event.wasClean && event.code !== 1000) {
          toast.error(`Connection closed (Code: ${event.code})`);
        }
      };
    } catch (err: any) {
      console.error('❌ [Docpen] Connection failed:', err);
      setError(err.message);
      toast.error(err.message || 'Failed to connect');
      setIsConnecting(false);
      cleanup();
    }
  };

  /**
   * Disconnect from voice agent
   */
  const disconnect = async () => {
    await saveConversation();
    if (wsRef.current) {
      wsRef.current.close();
    }
    cleanup();
    setIsConnected(false);
    setConnectionStartTime(null);
    toast.info('Voice assistant disconnected');
  };

  /**
   * Cleanup resources
   */
  const cleanup = () => {
    console.log('🧹 [Docpen] Starting cleanup...');
    
    // Stop all media tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        track.stop();
        console.log(`🎤 [Docpen] Stopped ${track.kind} track`);
      });
      mediaStreamRef.current = null;
    }
    
    // Close audio context
    if (audioContextRef.current) {
      if (audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(err => {
          console.warn('⚠️ [Docpen] Error closing audio context:', err);
        });
      }
      audioContextRef.current = null;
    }
    
    // Close WebSocket if still open
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
        wsRef.current.close();
      }
      wsRef.current = null;
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
        {/* Controls */}
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
