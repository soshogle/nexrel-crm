'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MoreVertical,
  Eye,
  Archive,
  Trash2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface Session {
  id: string;
  patientName?: string;
  profession: string;
  status: string;
  sessionDate: string;
  sessionDuration?: number;
  chiefComplaint?: string;
  transcriptionComplete: boolean;
  soapNoteGenerated: boolean;
  signedAt?: string;
  lead?: {
    id: string;
    businessName: string;
    contactPerson?: string;
  };
  soapNotes?: Array<{
    id: string;
    subjective?: string;
    assessment?: string;
  }>;
  _count?: {
    transcriptions: number;
    assistantQueries: number;
  };
}

interface SessionListProps {
  onSessionSelect?: (sessionId: string) => void;
}

export function SessionList({ onSessionSelect }: SessionListProps) {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/docpen/sessions');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setSessions(data.sessions);
    } catch (error) {
      toast.error('Failed to load sessions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchive = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/docpen/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ARCHIVED' }),
      });
      if (!response.ok) throw new Error('Failed to archive');
      toast.success('Session archived');
      fetchSessions();
    } catch (error) {
      toast.error('Failed to archive session');
    }
  };

  const handleCancel = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/docpen/sessions/${sessionId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to cancel');
      toast.success('Session cancelled');
      fetchSessions();
    } catch (error) {
      toast.error('Failed to cancel session');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RECORDING':
        return <Badge variant="destructive">Recording</Badge>;
      case 'PROCESSING':
        return <Badge variant="secondary">Processing</Badge>;
      case 'REVIEW_PENDING':
        return <Badge variant="default">Review Pending</Badge>;
      case 'SIGNED':
        return <Badge className="bg-green-600">Signed</Badge>;
      case 'ARCHIVED':
        return <Badge variant="outline">Archived</Badge>;
      case 'CANCELLED':
        return <Badge variant="outline" className="text-destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getProfessionLabel = (profession: string) => {
    const labels: Record<string, string> = {
      GENERAL_PRACTICE: 'General Practice',
      DENTIST: 'Dentistry',
      OPTOMETRIST: 'Optometry',
      DERMATOLOGIST: 'Dermatology',
      CARDIOLOGIST: 'Cardiology',
      PSYCHIATRIST: 'Psychiatry',
      PEDIATRICIAN: 'Pediatrics',
      ORTHOPEDIC: 'Orthopedics',
      PHYSIOTHERAPIST: 'Physical Therapy',
      CHIROPRACTOR: 'Chiropractic',
      CUSTOM: 'Custom',
    };
    return labels[profession] || profession;
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">No Sessions Yet</h3>
        <p className="text-muted-foreground">
          Start a new consultation to begin recording and generating SOAP notes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sessions.map((session) => (
        <Card
          key={session.id}
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => onSessionSelect?.(session.id)}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold truncate">
                    {session.patientName ||
                      session.lead?.contactPerson ||
                      session.lead?.businessName ||
                      'Unnamed Patient'}
                  </h4>
                  {getStatusBadge(session.status)}
                </div>

                <p className="text-sm text-muted-foreground mb-2">
                  {getProfessionLabel(session.profession)}
                  {session.chiefComplaint && ` • ${session.chiefComplaint}`}
                </p>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(session.sessionDate), { addSuffix: true })}
                  </span>
                  <span>{formatDuration(session.sessionDuration)}</span>
                  {session.transcriptionComplete && (
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle2 className="h-3 w-3" />
                      Transcribed
                    </span>
                  )}
                  {session.soapNoteGenerated && (
                    <span className="flex items-center gap-1 text-blue-600">
                      <FileText className="h-3 w-3" />
                      SOAP Ready
                    </span>
                  )}
                </div>

                {session.soapNotes?.[0]?.assessment && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-1">
                    <span className="font-medium">Assessment:</span>{' '}
                    {session.soapNotes[0].assessment.slice(0, 100)}...
                  </p>
                )}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onSessionSelect?.(session.id)}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
                  {session.status !== 'SIGNED' && session.status !== 'ARCHIVED' && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleArchive(session.id);
                      }}
                    >
                      <Archive className="h-4 w-4 mr-2" />
                      Archive
                    </DropdownMenuItem>
                  )}
                  {session.status !== 'SIGNED' && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCancel(session.id);
                      }}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Cancel Session
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
