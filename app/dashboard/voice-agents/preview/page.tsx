'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mic, Phone, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { ElevenLabsAgent } from '@/components/landing/soshogle/elevenlabs-agent';
import { ActiveConversationPanel } from '@/components/voice-agents/active-conversation-panel';
import { PostConversationPanel } from '@/components/voice-agents/post-conversation-panel';

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

export default function VoiceAgentPreviewPage() {
  const router = useRouter();

  const [agents, setAgents] = useState<VoiceAgent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [loadingAgents, setLoadingAgents] = useState(true);

  // SDK-based conversation (matches Voice AI Assistant flow)
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [duration, setDuration] = useState(0);
  const [recordingUrl, setRecordingUrl] = useState<string>('');
  const durationRef = useRef<NodeJS.Timeout | null>(null);

  // Get agentId from URL if provided
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const agentId = params.get('agentId');
    if (agentId) {
      setSelectedAgentId(agentId);
    }
  }, []);

  // Fetch available agents
  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/voice-agents');
      if (!response.ok) throw new Error('Failed to fetch agents');

      const data = await response.json();
      const agentsList = Array.isArray(data) ? data : (data.data ?? data.voiceAgents ?? []);

      const validAgents = agentsList.filter((agent: VoiceAgent) => agent?.elevenLabsAgentId);

      setAgents(validAgents);

      if (validAgents.length === 1) {
        setSelectedAgentId(validAgents[0].id);
      }

      if (agentsList.length > 0 && validAgents.length === 0) {
        toast.info('Agents need configuration', {
          description: 'Your agents need to be auto-configured before testing. Visit the Voice Agents page to configure them.',
          duration: 6000,
        });
      }
    } catch (error: unknown) {
      console.error('Error fetching agents:', error);
      toast.error('Failed to load voice agents');
    } finally {
      setLoadingAgents(false);
    }
  };

  const startConversation = useCallback(async () => {
    if (!selectedAgentId) {
      toast.error('Please select a voice agent');
      return;
    }

    setIsConnecting(true);
    setTranscript([]);
    setDuration(0);
    setRecordingUrl('');

    try {
      const response = await fetch(`/api/voice-agents/${selectedAgentId}/preview-url`);
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to get preview URL');
      }

      const data = await response.json();
      const url = data.signedUrl ?? data.signed_url;
      if (!url) throw new Error('No connection URL');

      setSignedUrl(url);
      toast.success(`Connecting to ${data.agentName || 'agent'} - Listen for the greeting!`);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to start conversation');
      setIsConnecting(false);
    }
  }, [selectedAgentId]);

  const handleConnect = useCallback(() => setIsConnected(true), []);
  const handleAgentSpeakingChange = useCallback((speaking: boolean) => setIsSpeaking(speaking), []);

  const handleMessage = useCallback((msg: { role: 'agent' | 'user'; content: string; timestamp: number }) => {
    setTranscript((prev) => [
      ...prev,
      { role: msg.role, message: msg.content, timestamp: msg.timestamp },
    ]);
  }, []);

  const handleConversationEnd = useCallback(
    async (_transcript: { role: 'agent' | 'user'; content: string; timestamp: number }[], _audioBlob?: Blob) => {
      setSignedUrl(null);
      setIsConnected(false);
      setIsConnecting(false);
      if (durationRef.current) {
        clearInterval(durationRef.current);
        durationRef.current = null;
      }
    },
    []
  );

  // Duration counter when connected
  useEffect(() => {
    if (isConnected && !durationRef.current) {
      const start = Date.now();
      durationRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - start) / 1000));
      }, 1000);
    }
    return () => {
      if (durationRef.current) {
        clearInterval(durationRef.current);
        durationRef.current = null;
      }
    };
  }, [isConnected]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = (duration / 600) * 100; // 10 min max

  const resetAndTestAgain = () => {
    setTranscript([]);
    setDuration(0);
    setRecordingUrl('');
    setSignedUrl(null);
    setIsConnected(false);
  };

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold gradient-text">Voice Agent Preview</h1>
            <p className="text-gray-600 mt-2">
              Test your AI voice agent with browser microphone. Uses the same flow as the Voice AI Assistant.
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

        {/* Agent Selection - when not in active conversation */}
        {!signedUrl && (
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
                      <strong>How it works:</strong> Click &quot;Start Conversation&quot; to begin testing.
                      The agent will greet you through your browser speakers. Speak into your microphone as if
                      you&apos;re on a real call.
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

        {/* Active Conversation - ElevenLabs SDK (same as Voice AI Assistant) */}
        {signedUrl && (
          <>
            <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-lg" style={{ minHeight: 400 }}>
              <ElevenLabsAgent
                signedUrl={signedUrl}
                autoStart
                variant="frameless"
                onConnect={handleConnect}
                onMessage={handleMessage}
                onAgentSpeakingChange={handleAgentSpeakingChange}
                onConversationEnd={handleConversationEnd}
                suppressUserDisconnectLog
              />
            </div>
            <ActiveConversationPanel
              isSpeaking={isSpeaking}
              isListening={isConnected && !isSpeaking}
              duration={duration}
              progressPercentage={progressPercentage}
              transcript={transcript}
              knowledgeBaseRefs={[]}
              onEndConversation={() => setSignedUrl(null)}
              formatTime={formatTime}
            />
          </>
        )}

        {/* Post-Conversation */}
        {!signedUrl && transcript.length > 0 && (
          <PostConversationPanel
            recordingUrl={recordingUrl}
            onTestAgain={resetAndTestAgain}
            onBackToAgents={() => router.push('/dashboard/voice-agents')}
          />
        )}
      </div>
    </div>
  );
}
