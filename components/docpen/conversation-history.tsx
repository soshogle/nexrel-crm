'use client';

import { useState, useEffect } from 'react';
import {
  MessageSquare,
  Clock,
  Play,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Download,
  Calendar,
  Loader2,
  Bot,
  User,
  Volume2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslations } from 'next-intl';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

interface Agent {
  id: string;
  profession: string;
  customProfession?: string;
  elevenLabsAgentId: string;
}

interface Conversation {
  id: string;
  agentId: string;
  elevenLabsConvId: string;
  sessionId?: string;
  patientName?: string;
  status: string;
  startedAt: string;
  endedAt?: string;
  durationSec?: number;
  audioUrl?: string;
  transcript?: string | any[];
  summary?: string;
  messageCount: number;
  turnCount: number;
}

interface TranscriptMessage {
  role: string;
  message: string;
  time_in_call_secs?: number;
}

const PROFESSION_LABELS: Record<string, string> = {
  GENERAL_PRACTICE: 'General Practice',
  DENTAL: 'Dental',
  OPTOMETRY: 'Optometry',
  DERMATOLOGY: 'Dermatology',
  CARDIOLOGY: 'Cardiology',
  PSYCHIATRY: 'Psychiatry',
  PEDIATRICS: 'Pediatrics',
  ORTHOPEDIC: 'Orthopedic',
  PHYSIOTHERAPY: 'Physiotherapy',
  CHIROPRACTIC: 'Chiropractic',
  CUSTOM: 'Custom',
};

export function DocpenConversationHistory() {
  const tPlaceholders = useTranslations('placeholders.select');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [expandedConv, setExpandedConv] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);

  useEffect(() => {
    fetchAgents();
  }, []);

  useEffect(() => {
    if (selectedAgentId) {
      fetchConversations(selectedAgentId);
    } else {
      setConversations([]);
    }
  }, [selectedAgentId]);

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/docpen/agents');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setAgents(data.agents || []);
      if (data.agents?.length > 0) {
        setSelectedAgentId(data.agents[0].id);
      }
    } catch (error) {
      toast.error('Failed to load agents');
    } finally {
      setLoading(false);
    }
  };

  const fetchConversations = async (agentId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/docpen/agents/${agentId}/conversations`);
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (error) {
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const refreshConversations = async () => {
    if (!selectedAgentId) return;
    setSyncing(true);
    try {
      await fetchConversations(selectedAgentId);
      toast.success('Conversations refreshed');
    } catch (error) {
      toast.error('Failed to refresh conversations');
    } finally {
      setSyncing(false);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const parseTranscript = (transcript: string | any[]): TranscriptMessage[] => {
    if (Array.isArray(transcript)) return transcript;
    if (typeof transcript === 'string') {
      try {
        return JSON.parse(transcript);
      } catch {
        return [];
      }
    }
    return [];
  };

  const toggleConversation = (convId: string) => {
    setExpandedConv(expandedConv === convId ? null : convId);
  };

  if (loading && agents.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Conversation History</h3>
          <p className="text-sm text-muted-foreground">
            View past voice assistant conversations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedAgentId || undefined} onValueChange={setSelectedAgentId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={tPlaceholders('agent')} />
            </SelectTrigger>
            <SelectContent>
              {agents.map(agent => (
                <SelectItem key={agent.id} value={agent.id}>
                  {PROFESSION_LABELS[agent.profession] || agent.profession}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshConversations}
            disabled={syncing || !selectedAgentId}
          >
            {syncing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {/* Conversations List */}
      {conversations.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h4 className="font-medium mb-1">No Conversations Yet</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Start a Docpen session to begin recording conversations
            </p>
            {selectedAgentId && (
              <Button variant="outline" onClick={refreshConversations} disabled={syncing}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh History
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {conversations.map(conv => {
            const isExpanded = expandedConv === conv.id;
            const transcript = parseTranscript(conv.transcript || []);

            return (
              <Collapsible key={conv.id} open={isExpanded}>
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardContent
                      className="py-4 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => toggleConversation(conv.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">
                                {conv.patientName || 'Conversation'}
                              </h4>
                              <Badge
                                variant={
                                  conv.status === 'completed' ? 'default' : 'secondary'
                                }
                              >
                                {conv.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(conv.startedAt)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDuration(conv.durationSec)}
                              </span>
                              <span>{conv.messageCount} messages</span>
                            </div>
                          </div>
                        </div>
                        {conv.audioUrl && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={e => {
                              e.stopPropagation();
                              // Play audio
                              setPlayingAudio(conv.id);
                              const audio = new Audio(conv.audioUrl);
                              audio.onended = () => setPlayingAudio(null);
                              audio.play().catch(() => setPlayingAudio(null));
                            }}
                          >
                            {playingAudio === conv.id ? (
                              <Volume2 className="h-4 w-4 animate-pulse" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="border-t px-6 py-4">
                      {conv.summary && (
                        <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                          <p className="text-sm font-medium mb-1">Summary</p>
                          <p className="text-sm text-muted-foreground">{conv.summary}</p>
                        </div>
                      )}

                      <p className="text-sm font-medium mb-3">Transcript</p>
                      <ScrollArea className="h-[300px]">
                        <div className="space-y-3">
                          {transcript.length > 0 ? (
                            transcript.map((msg, idx) => (
                              <div
                                key={idx}
                                className={`flex gap-3 ${
                                  msg.role === 'agent'
                                    ? 'justify-start'
                                    : 'justify-end'
                                }`}
                              >
                                {msg.role === 'agent' && (
                                  <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-950 h-fit">
                                    <Bot className="h-4 w-4 text-purple-600" />
                                  </div>
                                )}
                                <div
                                  className={`max-w-[80%] p-3 rounded-lg ${
                                    msg.role === 'agent'
                                      ? 'bg-muted'
                                      : 'bg-blue-100 dark:bg-blue-950'
                                  }`}
                                >
                                  <p className="text-sm">{msg.message}</p>
                                  {msg.time_in_call_secs !== undefined && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {formatDuration(msg.time_in_call_secs)}
                                    </p>
                                  )}
                                </div>
                                {msg.role !== 'agent' && (
                                  <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-950 h-fit">
                                    <User className="h-4 w-4 text-blue-600" />
                                  </div>
                                )}
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              No transcript available
                            </p>
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}
    </div>
  );
}
