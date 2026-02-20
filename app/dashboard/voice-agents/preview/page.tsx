'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mic, Phone, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { ActiveConversationPanel } from '@/components/voice-agents/active-conversation-panel';
import { PostConversationPanel } from '@/components/voice-agents/post-conversation-panel';

const MAX_DURATION_MS = 10 * 60 * 1000; // 10 minutes
const INACTIVITY_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

interface VoiceAgent {
  id: string;
  name: string;
  elevenLabsAgentId: string;
}

interface TranscriptMessage {
  role: 'agent' | 'user';
  message: string;
  timestamp: number;
}

interface KnowledgeBaseReference {
  documentName: string;
  relevance: number;
}

export default function VoiceAgentPreviewPage() {
  const router = useRouter();
  
  // Agent selection
  const [agents, setAgents] = useState<VoiceAgent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [loadingAgents, setLoadingAgents] = useState(true);

  // Get agentId from URL if provided
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const agentId = params.get('agentId');
    if (agentId) {
      setSelectedAgentId(agentId);
    }
  }, []);

  // WebSocket and audio
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  // Conversation state
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [duration, setDuration] = useState(0);
  const [elevenLabsConversationId, setElevenLabsConversationId] = useState<string>('');
  const [recordingUrl, setRecordingUrl] = useState<string>('');
  const [knowledgeBaseRefs, setKnowledgeBaseRefs] = useState<KnowledgeBaseReference[]>([]);
  
  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Fetch available agents
  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/voice-agents');
      if (!response.ok) throw new Error('Failed to fetch agents');
      
      const data = await response.json();
      // API returns array directly, not { agents: [...] }
      const agentsList = Array.isArray(data) ? data : [];
      
      // Filter to only agents with ElevenLabs agent IDs (required for preview)
      const validAgents = agentsList.filter(agent => agent?.elevenLabsAgentId);
      
      setAgents(validAgents);
      
      // Auto-select if only one agent
      if (validAgents.length === 1) {
        setSelectedAgentId(validAgents[0].id);
      }
      
      // Show helpful message if no valid agents for testing
      if (agentsList.length > 0 && validAgents.length === 0) {
        toast.info('Agents need configuration', {
          description: 'Your agents need to be auto-configured before testing. Visit the Voice Agents page to configure them.',
          duration: 6000,
        });
      }
    } catch (error: any) {
      console.error('Error fetching agents:', error);
      toast.error('Failed to load voice agents');
    } finally {
      setLoadingAgents(false);
    }
  };

  // Start conversation
  const startConversation = async () => {
    if (!selectedAgentId) {
      toast.error('Please select a voice agent');
      return;
    }

    setIsConnecting(true);

    try {
      // Get signed WebSocket URL
      const response = await fetch(`/api/voice-agents/${selectedAgentId}/preview-url`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get preview URL');
      }

      const { signedUrl, agentName } = await response.json();
      
      // Request microphone access
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        console.log('✅ Microphone access granted');
      } catch (micError: any) {
        console.error('❌ Microphone access denied:', micError);
        
        if (micError.name === 'NotAllowedError' || micError.name === 'PermissionDeniedError') {
          throw new Error('Microphone access denied. Please allow microphone permissions in your browser.');
        } else if (micError.name === 'NotFoundError') {
          throw new Error('No microphone found. Please connect a microphone and try again.');
        } else {
          throw new Error(`Microphone error: ${micError.message}`);
        }
      }

      // Set up audio context
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      
      // Resume audio context (required by browsers for user interaction)
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
        console.log('🔊 Audio context resumed on start');
      }
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);

      // Connect WebSocket
      const ws = new WebSocket(signedUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ WebSocket connected to ElevenLabs');
        setIsConnected(true);
        setIsConnecting(false);
        setIsListening(true);
        startTimeRef.current = Date.now();
        
        // Start duration counter
        durationIntervalRef.current = setInterval(() => {
          const elapsed = Date.now() - startTimeRef.current;
          setDuration(Math.floor(elapsed / 1000));
          
          // Auto-end after max duration
          if (elapsed >= MAX_DURATION_MS) {
            toast.info('Maximum duration reached (10 minutes)');
            endConversation();
          }
        }, 1000);

        toast.success(`Connected to ${agentName} - Listen for the greeting!`);
        console.log('🎤 Agent should start speaking now...');

        // Start sending audio after a brief delay to let agent initialize
        setTimeout(() => {
          processor.onaudioprocess = (e) => {
            try {
              if (ws.readyState === WebSocket.OPEN) {
                const inputData = e.inputBuffer.getChannelData(0);
                const pcm16 = convertFloat32ToInt16(inputData);
                
                // Convert PCM16 to base64 and send as JSON (required by ElevenLabs)
                const base64Audio = btoa(
                  String.fromCharCode(...new Uint8Array(pcm16.buffer))
                );
                
                const message = {
                  user_audio_chunk: base64Audio
                };
                
                ws.send(JSON.stringify(message));
                
                // Only start inactivity timer after first transcript message
                if (transcript.length > 0) {
                  resetInactivityTimer();
                }
              }
            } catch (error) {
              console.error('Error processing audio:', error);
            }
          };

          source.connect(processor);
          processor.connect(audioContextRef.current!.destination);
          console.log('🎤 Audio processing started');
        }, 500);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('📨 Received message type:', message.type || 'unknown', message);
          
          // Handle conversation ID
          if (message.conversation_id) {
            console.log('📝 Conversation ID:', message.conversation_id);
            setElevenLabsConversationId(message.conversation_id);
          }

          // Handle transcription
          if (message.type === 'transcript' || message.user_transcript || message.agent_transcript) {
            const userText = message.user_transcript || message.text;
            const agentText = message.agent_transcript;
            
            if (userText) {
              console.log('👤 User said:', userText);
              setTranscript(prev => [...prev, {
                role: 'user',
                message: userText,
                timestamp: Date.now(),
              }]);
            }
            
            if (agentText) {
              console.log('🤖 Agent said:', agentText);
              setTranscript(prev => [...prev, {
                role: 'agent',
                message: agentText,
                timestamp: Date.now(),
              }]);
              setIsSpeaking(true);
              setTimeout(() => setIsSpeaking(false), 2000);
            }
          }

          // Handle audio response from ElevenLabs
          if (message.audio) {
            console.log('🔊 Received audio chunk, size:', message.audio.length);
            setIsSpeaking(true);
            playAudioChunk(message.audio);
            setTimeout(() => setIsSpeaking(false), 1000);
          }

          // Handle knowledge base references (if ElevenLabs provides this)
          if (message.knowledge_base_references) {
            setKnowledgeBaseRefs(prev => [
              ...prev,
              ...message.knowledge_base_references,
            ]);
          }

          // Handle interruption
          if (message.type === 'interruption') {
            console.log('⏸️ Agent was interrupted');
            setIsSpeaking(false);
          }

          // Handle any errors from ElevenLabs
          if (message.type === 'error') {
            console.error('❌ ElevenLabs error:', message.message || message.error);
            toast.error(`Agent error: ${message.message || message.error}`);
          }

          resetInactivityTimer();
        } catch (error) {
          console.error('Error parsing WebSocket message:', error, event.data);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        toast.error('Connection error - Check console for details');
        endConversation();
      };

      ws.onclose = (event) => {
        console.log('🔌 WebSocket closed', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
        });
        
        // Show informative message if closed unexpectedly
        if (!event.wasClean && event.code !== 1000) {
          toast.error(`Connection closed unexpectedly (Code: ${event.code})`);
        }
        
        setIsConnected(false);
        cleanup();
      };

    } catch (error: any) {
      console.error('Error starting conversation:', error);
      toast.error(error.message || 'Failed to start conversation');
      setIsConnecting(false);
      cleanup();
    }
  };

  // End conversation
  const endConversation = async () => {
    console.log('🛑 Ending conversation...');
    
    if (wsRef.current) {
      wsRef.current.close();
    }
    
    cleanup();

    // Save the conversation
    if (elevenLabsConversationId && selectedAgentId) {
      try {
        const response = await fetch('/api/voice-agents/preview-conversation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            voiceAgentId: selectedAgentId,
            elevenLabsConversationId,
            transcript: JSON.stringify(transcript),
            duration: duration,
            conversationData: {
              knowledgeBaseReferences: knowledgeBaseRefs,
              previewMode: true,
            },
          }),
        });

        if (response.ok) {
          toast.success('Preview conversation saved');
        }
      } catch (error) {
        console.error('Error saving preview:', error);
      }
    }

    // Fetch recording URL after a short delay
    setTimeout(() => {
      fetchRecording();
    }, 3000);
  };

  // Fetch recording
  const fetchRecording = async () => {
    if (!elevenLabsConversationId) return;

    try {
      const response = await fetch(
        `/api/elevenlabs/conversations/${elevenLabsConversationId}`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.audio_url) {
          setRecordingUrl(data.audio_url);
        }
      }
    } catch (error) {
      console.error('Error fetching recording:', error);
    }
  };

  // Cleanup resources
  const cleanup = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
      inactivityTimeoutRef.current = null;
    }
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setIsListening(false);
    setIsSpeaking(false);
  };

  // Reset inactivity timer
  const resetInactivityTimer = () => {
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
    }
    
    inactivityTimeoutRef.current = setTimeout(() => {
      toast.info('Ending conversation due to inactivity');
      endConversation();
    }, INACTIVITY_TIMEOUT_MS);
  };

  // Convert Float32 to Int16
  const convertFloat32ToInt16 = (buffer: Float32Array): Int16Array => {
    const l = buffer.length;
    const int16Array = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      const s = Math.max(-1, Math.min(1, buffer[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return int16Array;
  };

  // Play audio chunk
  const playAudioChunk = async (base64Audio: string) => {
    try {
      // Resume audio context if suspended (required by browsers)
      if (audioContextRef.current?.state === 'suspended') {
        await audioContextRef.current.resume();
        console.log('🔊 Audio context resumed');
      }
      
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          // Create a copy of the buffer to avoid detaching issues
          const audioData = bytes.buffer.slice(0);
          const audioBuffer = await audioContextRef.current.decodeAudioData(audioData);
          const source = audioContextRef.current.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(audioContextRef.current.destination);
          source.start();
          console.log('✅ Audio chunk played successfully');
        } catch (decodeError) {
          console.warn('⚠️  Failed to decode audio chunk:', decodeError);
          // Don't throw - continue with conversation even if one chunk fails
        }
      }
    } catch (error) {
      console.error('❌ Error playing audio:', error);
      // Don't throw - continue with conversation
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage
  const progressPercentage = (duration / (MAX_DURATION_MS / 1000)) * 100;

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold gradient-text">
              Voice Agent Preview
            </h1>
            <p className="text-gray-600 mt-2">
              Test your AI voice agent with browser microphone
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/voice-agents')}
            className="border-gray-300"
          >
            Back to Agents
          </Button>
        </div>

        {/* Agent Selection */}
        {!isConnected && (
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <Phone className="h-5 w-5 text-purple-600" />
                Select Voice Agent
              </CardTitle>
              <CardDescription className="text-gray-600">
                Choose which agent to test
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingAgents ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                </div>
              ) : agents.length === 0 ? (
                <Alert className="border-amber-200 bg-amber-50">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    No voice agents found. Please create one first.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                    <SelectTrigger className="bg-white border-gray-300">
                      <SelectValue placeholder="Select an agent..." />
                    </SelectTrigger>
                    <SelectContent>
                      {agents.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Alert className="bg-purple-50 border-purple-200">
                    <AlertDescription className="text-purple-900">
                      <strong>How it works:</strong> Click "Start Conversation" to begin testing.
                      The agent will answer immediately through your browser speakers.
                      Speak into your microphone as if you're on a real call.
                    </AlertDescription>
                  </Alert>

                  <Button
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                    size="lg"
                    onClick={startConversation}
                    disabled={!selectedAgentId || isConnecting}
                  >
                    {isConnecting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Mic className="mr-2 h-5 w-5" />
                        Start Conversation
                      </>
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Active Conversation */}
        {isConnected && (
          <ActiveConversationPanel
            isSpeaking={isSpeaking}
            isListening={isListening}
            duration={duration}
            progressPercentage={progressPercentage}
            transcript={transcript}
            knowledgeBaseRefs={knowledgeBaseRefs}
            onEndConversation={endConversation}
            formatTime={formatTime}
          />
        )}

        {/* Post-Conversation */}
        {!isConnected && transcript.length > 0 && (
          <PostConversationPanel
            recordingUrl={recordingUrl}
            onTestAgain={() => {
              setTranscript([]);
              setDuration(0);
              setElevenLabsConversationId('');
              setRecordingUrl('');
              setKnowledgeBaseRefs([]);
            }}
            onBackToAgents={() => router.push('/dashboard/voice-agents')}
          />
        )}
      </div>
    </div>
  );
}
