'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Loader2,
  Search,
  RefreshCw,
  X,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Phone,
  Clock,
  User,
  Copy,
  Download,
  MoreVertical,
  Trash2,
} from 'lucide-react';

interface Agent {
  id: string;
  profession: string;
  customProfession?: string;
  elevenLabsAgentId: string;
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
  const { data: session } = useSession();
  const tToasts = useTranslations('toasts.general');

  // Check if user is SUPER_ADMIN
  const isSuperAdmin =
    session?.user?.role === 'SUPER_ADMIN' ||
    (session?.user?.isImpersonating && session?.user?.superAdminId);

  // Agents and filtering
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('all');

  // Main list state
  const [conversations, setConversations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Selected conversation state
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [conversationDetails, setConversationDetails] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Audio player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waveformRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (session) {
      fetchAgents();
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (session && agents.length > 0) {
      fetchConversations();
    }
  }, [session?.user?.id, selectedAgentId]);

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/docpen/agents');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setAgents(data.agents || []);
      if (data.agents?.length > 0 && selectedAgentId === 'all') {
        // Keep 'all' selected
      }
    } catch (error) {
      toast.error(tToasts('agentsLoadFailed'));
    }
  };

  const fetchConversations = async () => {
    setIsLoading(true);
    try {
      const url =
        selectedAgentId === 'all'
          ? '/api/docpen/conversations?page_size=100'
          : `/api/docpen/conversations?agent_id=${selectedAgentId}&page_size=100`;

      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch conversations');
      }

      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (error: any) {
      console.error('❌ [Docpen History] Error fetching conversations:', error);
      toast.error('Failed to load conversation history');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchConversationDetails = async (conversationId: string) => {
    setIsLoadingDetails(true);
    try {
      const response = await fetch(`/api/docpen/conversations/${conversationId}`);
      if (!response.ok) throw new Error('Failed to fetch conversation details');

      const data = await response.json();
      setConversationDetails(data.conversation);
    } catch (error: any) {
      console.error('Error fetching conversation details:', error);
      toast.error(tToasts('conversationDetailsFailed'));
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleRowClick = (conversation: any) => {
    setSelectedConversation(conversation);
    setConversationDetails(null);
    fetchConversationDetails(conversation.conversation_id);

    // Reset audio player
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  };

  const handleBackToList = () => {
    setSelectedConversation(null);
    setConversationDetails(null);
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
  };

  // Audio player handlers
  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const skipForward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(audioRef.current.currentTime + 5, duration);
    }
  };

  const skipBackward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(audioRef.current.currentTime - 5, 0);
    }
  };

  const changeSpeed = () => {
    const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
    setPlaybackSpeed(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (durationSecs?: number) => {
    if (!durationSecs || durationSecs <= 0) return 'N/A';
    const mins = Math.floor(durationSecs / 60);
    const secs = Math.floor(durationSecs % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTranscriptTurnCount = (conversation: any) => {
    if (conversation?.message_count) return conversation.message_count;
    if (conversation?.transcript && Array.isArray(conversation.transcript))
      return conversation.transcript.length;
    return 0;
  };

  // Copy transcript to clipboard
  const handleCopyTranscript = () => {
    if (!conversationDetails?.transcript || !Array.isArray(conversationDetails.transcript)) {
      toast.error(tToasts('noTranscript'));
      return;
    }

    const transcriptText = conversationDetails.transcript
      .map((turn: any) => {
        const time = formatTime(turn.time_in_call_secs || 0);
        const speaker =
          turn.role === 'agent'
            ? conversationDetails.agent_name || 'AI Agent'
            : 'Caller';
        return `[${time}] ${speaker}: ${turn.message}`;
      })
      .join('\n\n');

    navigator.clipboard
      .writeText(transcriptText)
      .then(() => {
        toast.success(tToasts('transcriptCopied'));
      })
      .catch((error) => {
        console.error('Failed to copy transcript:', error);
        toast.error(tToasts('copyFailed'));
      });
  };

  // Download transcript as a text file
  const handleDownloadTranscript = () => {
    if (!conversationDetails?.transcript || !Array.isArray(conversationDetails.transcript)) {
      toast.error(tToasts('noTranscriptDownload'));
      return;
    }

    const transcriptText = conversationDetails.transcript
      .map((turn: any) => {
        const time = formatTime(turn.time_in_call_secs || 0);
        const speaker =
          turn.role === 'agent'
            ? conversationDetails.agent_name || 'AI Agent'
            : 'Caller';
        return `[${time}] ${speaker}: ${turn.message}`;
      })
      .join('\n\n');

    const header = `Call Transcript\nDate: ${format(
      new Date(selectedConversation.start_time_unix_secs * 1000),
      "MMM d, yyyy 'at' h:mm a"
    )}\nDuration: ${formatDuration(selectedConversation.call_duration_secs)}\nAgent: ${
      conversationDetails.agent_name || 'Unknown'
    }\n\n---\n\n`;
    const fullText = header + transcriptText;

    const blob = new Blob([fullText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `transcript_${selectedConversation.conversation_id}_${format(
      new Date(selectedConversation.start_time_unix_secs * 1000),
      'yyyy-MM-dd'
    )}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Transcript downloaded');
  };

  // Open delete confirmation dialog
  const handleDeleteCall = () => {
    if (!selectedConversation) {
      toast.error(tToasts('noConversationSelected'));
      return;
    }
    setShowDeleteDialog(true);
  };

  // Perform the actual deletion
  const confirmDeleteCall = async () => {
    if (!selectedConversation) {
      return;
    }

    setIsDeleting(true);
    setShowDeleteDialog(false);

    try {
      const response = await fetch(
        `/api/docpen/conversations/${selectedConversation.conversation_id}`,
        {
          method: 'DELETE',
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete conversation');
      }

      toast.success('Conversation deleted successfully');
      handleBackToList();
      await fetchConversations();
    } catch (error: any) {
      console.error('❌ Error deleting conversation:', error);
      toast.error(error.message || 'Failed to delete conversation');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter conversations
  const filteredConversations = conversations.filter((conv) => {
    const matchesSearch =
      searchQuery === '' ||
      conv.agent_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.conversation_initiation_client_data?.caller_number?.includes(searchQuery);

    const matchesAgent =
      selectedAgentId === 'all' ||
      conv.agent_id_local === selectedAgentId ||
      conv.agent_id === selectedAgentId;

    const matchesStatus = selectedStatus === 'all' || conv.status === selectedStatus;

    return matchesSearch && matchesAgent && matchesStatus;
  });

  // Loading state
  if (isLoading && conversations.length === 0) {
    return (
      <div className="flex items-center justify-center h-[600px] bg-white">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-600" />
          <p className="mt-4 text-sm text-gray-600">Loading conversation history...</p>
        </div>
      </div>
    );
  }

  // Detail view
  if (selectedConversation) {
    const playbackProgress = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
      <div className="flex flex-col h-full bg-white">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToList}
              className="text-gray-600 hover:text-gray-900"
            >
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Conversation with {selectedConversation.agent_name || 'Agent'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {selectedConversation.conversation_id}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-600"
              onClick={() => {
                if (conversationDetails?.audio_url) {
                  window.open(conversationDetails.audio_url, '_blank');
                  toast.success(tToasts('openingAudio'));
                } else {
                  toast.error(tToasts('noAudioAvailable'));
                }
              }}
              disabled={!conversationDetails?.audio_url}
            >
              <Download className="h-4 w-4 mr-2" />
              Download audio
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-600"
              onClick={handleCopyTranscript}
              disabled={!conversationDetails?.transcript}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy transcript
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-gray-600">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={handleDownloadTranscript}
                  disabled={!conversationDetails?.transcript}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download transcript
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleCopyTranscript}
                  disabled={!conversationDetails?.transcript}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy to clipboard
                </DropdownMenuItem>
                {isSuperAdmin ? (
                  <DropdownMenuItem
                    onClick={handleDeleteCall}
                    disabled={isDeleting}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 focus:text-red-700 focus:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {isDeleting ? 'Deleting...' : 'Delete Conversation'}
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem disabled className="text-xs text-gray-500">
                    Delete (Super Admin only)
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left side - Details */}
          <div className="flex-1 p-6 overflow-y-auto">
            {isLoadingDetails ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Animated Waveform visualization */}
                <div className="bg-black rounded-lg p-6 shadow-lg">
                  <div className="flex items-center justify-center h-32" ref={waveformRef}>
                    <div className="flex items-center justify-center gap-[2px] h-full w-full">
                      {Array.from({ length: 120 }).map((_, i) => {
                        const isPlayed = i < (playbackProgress / 100) * 120;
                        const baseHeight =
                          30 + Math.sin(i / 10) * 20 + Math.random() * 40;
                        const height = Math.max(15, Math.min(95, baseHeight));

                        return (
                          <div
                            key={i}
                            className={`flex-1 transition-all duration-75 ${
                              isPlayed ? 'shadow-[0_0_8px_rgba(168,85,247,0.6)]' : ''
                            }`}
                            style={{
                              height: `${height}%`,
                              background: isPlayed
                                ? `linear-gradient(to top, #a855f7 0%, #ec4899 50%, #3b82f6 100%)`
                                : '#374151',
                              transform:
                                isPlaying && isPlayed
                                  ? `scaleY(${0.9 + Math.random() * 0.2})`
                                  : 'scaleY(1)',
                              borderRadius: '1px',
                              minWidth: '2px',
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Audio player */}
                {conversationDetails?.audio_url ? (
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <audio
                      ref={audioRef}
                      src={conversationDetails.audio_url}
                      onTimeUpdate={handleTimeUpdate}
                      onLoadedMetadata={handleLoadedMetadata}
                      onEnded={() => setIsPlaying(false)}
                    />

                    <div className="flex items-center gap-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={skipBackward}
                        className="text-gray-600"
                      >
                        <SkipBack className="h-5 w-5" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={togglePlay}
                        className="h-10 w-10 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700"
                      >
                        {isPlaying ? (
                          <Pause className="h-5 w-5" />
                        ) : (
                          <Play className="h-5 w-5 ml-0.5" />
                        )}
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={skipForward}
                        className="text-gray-600"
                      >
                        <SkipForward className="h-5 w-5" />
                      </Button>

                      <div className="flex-1 flex items-center gap-4">
                        <span className="text-sm text-gray-600 font-mono">
                          {formatTime(currentTime)}
                        </span>
                        <input
                          type="range"
                          min="0"
                          max={duration || 0}
                          value={currentTime}
                          onChange={handleSeek}
                          className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                          style={{
                            background: `linear-gradient(to right, #8b5cf6 0%, #3b82f6 ${playbackProgress}%, #e5e7eb ${playbackProgress}%, #e5e7eb 100%)`,
                          }}
                        />
                        <span className="text-sm text-gray-600 font-mono">
                          {formatTime(duration)}
                        </span>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={changeSpeed}
                        className="text-gray-600 font-mono"
                      >
                        {playbackSpeed}x
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                    <p className="text-gray-600">
                      No audio recording available for this conversation
                    </p>
                  </div>
                )}

                {/* Tabs */}
                <Tabs defaultValue="transcription" className="w-full">
                  <div className="flex items-center justify-between border-b border-gray-200">
                    <TabsList className="bg-transparent border-0">
                      <TabsTrigger value="transcription">Transcription</TabsTrigger>
                      <TabsTrigger value="overview">Overview</TabsTrigger>
                      <TabsTrigger value="client-data">Client data</TabsTrigger>
                    </TabsList>

                    <div className="flex items-center gap-2 mr-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDownloadTranscript}
                        disabled={!conversationDetails?.transcript}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        <Download className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopyTranscript}
                        disabled={!conversationDetails?.transcript}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-gray-600 hover:text-gray-900"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={handleCopyTranscript}
                            disabled={!conversationDetails?.transcript}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Copy transcript
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={handleDownloadTranscript}
                            disabled={!conversationDetails?.transcript}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download transcript
                          </DropdownMenuItem>
                          {isSuperAdmin ? (
                            <DropdownMenuItem
                              onClick={handleDeleteCall}
                              disabled={isDeleting}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 focus:text-red-700 focus:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {isDeleting ? 'Deleting...' : 'Delete Conversation'}
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem disabled className="text-xs text-gray-500">
                              Delete (Super Admin only)
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <TabsContent value="transcription" className="mt-4">
                    {conversationDetails?.transcript &&
                    Array.isArray(conversationDetails.transcript) &&
                    conversationDetails.transcript.length > 0 ? (
                      <div className="space-y-4">
                        {conversationDetails.transcript.map((turn: any, index: number) => (
                          <div key={index} className="flex gap-3">
                            <div
                              className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                                turn.role === 'agent'
                                  ? 'bg-gradient-to-br from-purple-500 to-blue-500'
                                  : 'bg-gray-200'
                              }`}
                            >
                              {turn.role === 'agent' ? (
                                <Phone className="h-4 w-4 text-white" />
                              ) : (
                                <User className="h-4 w-4 text-gray-600" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-gray-900">
                                  {turn.role === 'agent'
                                    ? conversationDetails.agent_name || 'AI Agent'
                                    : 'Caller'}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {formatTime(turn.time_in_call_secs || 0)}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700 leading-relaxed">
                                {turn.message}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-sm text-gray-500">
                          No transcript available for this conversation
                        </p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="overview" className="space-y-4 mt-4">
                    {conversationDetails?.analysis?.call_summary && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">
                          Call Summary
                        </h3>
                        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4">
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {conversationDetails.analysis.call_summary}
                          </p>
                        </div>
                      </div>
                    )}

                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">Status</h3>
                      <Badge
                        className={
                          selectedConversation.status === 'done'
                            ? 'bg-blue-100 text-blue-700 hover:bg-blue-100'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-100'
                        }
                      >
                        {selectedConversation.status === 'done' ? 'Successful' : 'Unsuccessful'}
                      </Badge>
                    </div>
                  </TabsContent>

                  <TabsContent value="client-data" className="mt-4">
                    <div className="space-y-3">
                      <div className="flex justify-between py-2">
                        <span className="text-sm text-gray-600">From</span>
                        <span className="text-sm font-medium text-gray-900">
                          {selectedConversation.conversation_initiation_client_data?.caller_number ||
                            'Unknown'}
                        </span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-sm text-gray-600">To</span>
                        <span className="text-sm font-medium text-gray-900">
                          {selectedConversation.agent_name || 'Agent'}
                        </span>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>

          {/* Right side - Metadata */}
          <div className="w-80 border-l border-gray-200 bg-gray-50 p-6 overflow-y-auto">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Metadata</h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Date</p>
                <p className="text-sm text-gray-900">
                  {format(
                    new Date(selectedConversation.start_time_unix_secs * 1000),
                    "MMM d, yyyy 'at' h:mm a"
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1">Connection duration</p>
                <p className="text-sm text-gray-900">
                  {formatDuration(selectedConversation.call_duration_secs)}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1">Transcript Messages</p>
                <p className="text-sm text-gray-900">
                  {getTranscriptTurnCount(conversationDetails)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Conversation History</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchConversations}
            disabled={isLoading}
            className="text-gray-600"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by agent or phone number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-50 border-gray-200"
            />
          </div>

          <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
            <SelectTrigger className="w-48 bg-gray-50 border-gray-200">
              <SelectValue placeholder="All Agents" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Agents</SelectItem>
              {agents.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  {PROFESSION_LABELS[agent.profession] || agent.customProfession || agent.profession}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-48 bg-gray-50 border-gray-200">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="done">Successful</SelectItem>
              <SelectItem value="failed">Unsuccessful</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <Phone className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-600 font-medium">No conversations found</p>
            <p className="text-sm text-gray-500 mt-1">
              {searchQuery || selectedAgentId !== 'all' || selectedStatus !== 'all'
                ? 'Try adjusting your filters'
                : 'Conversation history will appear here once you have conversations'}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Agent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transcript Messages
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredConversations.map((conversation) => (
                <tr
                  key={conversation.conversation_id}
                  onClick={() => handleRowClick(conversation)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {format(
                      new Date(conversation.start_time_unix_secs * 1000),
                      'MMM d, h:mm a'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                        <Phone className="h-4 w-4 text-white" />
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {conversation.agent_name || 'Unknown Agent'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatDuration(conversation.call_duration_secs)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {getTranscriptTurnCount(conversation)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge
                      className={
                        conversation.status === 'done'
                          ? 'bg-blue-100 text-blue-700 hover:bg-blue-100'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-100'
                      }
                    >
                      {conversation.status === 'done' ? 'Successful' : 'Unsuccessful'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Are you sure you want to delete this conversation? This action cannot be undone.
              </p>
              {selectedConversation && (
                <div className="mt-4 p-3 bg-gray-50 rounded-md text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date:</span>
                    <span className="font-medium text-gray-900">
                      {format(
                        new Date(selectedConversation.start_time_unix_secs * 1000),
                        "MMM d, yyyy 'at' h:mm a"
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-medium text-gray-900">
                      {formatDuration(selectedConversation.call_duration_secs)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Agent:</span>
                    <span className="font-medium text-gray-900">
                      {selectedConversation.agent_name || 'Unknown Agent'}
                    </span>
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteCall}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Conversation
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
