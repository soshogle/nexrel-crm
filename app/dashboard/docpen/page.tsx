'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Brain,
  FileText,
  Mic,
  CheckCircle2,
  ArrowLeft,
  FileSignature,
  Sparkles,
  Loader2,
  Settings,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

import { SessionList } from '@/components/docpen/session-list';
import { NewSessionDialog } from '@/components/docpen/new-session-dialog';
import { DocpenRecorder } from '@/components/docpen/docpen-recorder';
import { SOAPNoteEditor } from '@/components/docpen/soap-note-editor';
import { ActiveAssistant } from '@/components/docpen/active-assistant';
import { VoiceAssistant } from '@/components/docpen/voice-assistant';
import { ReviewSignDialog } from '@/components/docpen/review-sign-dialog';
import { DocpenErrorBoundary } from '@/components/docpen/docpen-error-boundary';
import type { DocpenProfessionType } from '@/lib/docpen/prompts';
import { isMenuItemVisible } from '@/lib/industry-menu-config';
import type { Industry } from '@/lib/industry-menu-config';

interface Session {
  id: string;
  patientName?: string;
  profession: string;
  customProfession?: string;
  status: string;
  sessionDate: string;
  sessionDuration?: number;
  chiefComplaint?: string;
  consultantName?: string;
  transcriptionComplete: boolean;
  soapNoteGenerated: boolean;
  signedAt?: string;
  signedBy?: string;
  lead?: {
    id: string;
    businessName: string;
    contactPerson?: string;
  };
  transcriptions?: Array<{
    id: string;
    speakerRole: string;
    speakerLabel?: string;
    content: string;
    startTime: number;
    endTime: number;
  }>;
  soapNotes?: Array<{
    id: string;
    version: number;
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
    additionalNotes?: string;
    aiModel?: string;
    processingTime?: number;
    isCurrentVersion: boolean;
    editedByUser: boolean;
  }>;
}

export default function DocpenPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status: sessionStatus } = useSession();
  const tToasts = useTranslations('toasts.general');
  const sessionIdParam = searchParams.get('session');

  const [activeView, setActiveView] = useState<'list' | 'session'>(sessionIdParam ? 'session' : 'list');
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [showSignDialog, setShowSignDialog] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState<'idle' | 'recording' | 'paused' | 'processing'>('idle');
  const [sessionStats, setSessionStats] = useState({
    activeSessions: 0,
    soapNotesGenerated: 0,
    signedComplete: 0,
  });

  // Check if user's industry has access to Docpen
  const userIndustry = (session?.user?.industry as Industry) || null;
  const hasDocpenAccess = isMenuItemVisible('docpen', userIndustry);

  // Redirect non-medical industries away from Docpen
  useEffect(() => {
    if (sessionStatus === 'loading') {
      return; // Still loading session
    }
    
    if (sessionStatus === 'unauthenticated') {
      // Session check will redirect via layout, but guard here too
      return;
    }

    // If user is authenticated but doesn't have access to Docpen, redirect to dashboard
    if (sessionStatus === 'authenticated' && !hasDocpenAccess) {
      router.push('/dashboard');
      return;
    }
  }, [sessionStatus, hasDocpenAccess, router]);

  // Wait for session to be ready before making API calls
  useEffect(() => {
    // Don't make API calls until session is authenticated
    if (sessionStatus === 'loading') {
      return; // Still loading session
    }
    
    if (sessionStatus === 'unauthenticated') {
      // Session check will redirect via layout, but guard here too
      return;
    }

    // Don't load data if user doesn't have access
    if (!hasDocpenAccess) {
      return;
    }

    // Session is authenticated, safe to make API calls
    if (sessionIdParam) {
      loadSession(sessionIdParam);
    } else {
      fetchStats();
    }
  }, [sessionIdParam, sessionStatus, session]);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/docpen/sessions');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      const sessions = data.sessions || [];
      
      const activeSessions = sessions.filter((s: Session) => 
        s.status === 'RECORDING' || s.status === 'PROCESSING' || s.status === 'REVIEW_PENDING'
      ).length;
      
      const soapNotesGenerated = sessions.filter((s: Session) => 
        s.soapNoteGenerated
      ).length;
      
      const signedComplete = sessions.filter((s: Session) => 
        s.status === 'SIGNED' || s.signedAt
      ).length;
      
      setSessionStats({
        activeSessions,
        soapNotesGenerated,
        signedComplete,
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const loadSession = async (sessionId: string) => {
    setIsLoadingSession(true);
    try {
      const response = await fetch(`/api/docpen/sessions/${sessionId}`);
      if (!response.ok) throw new Error('Failed to load session');
      const data = await response.json();
      setActiveSession(data.session);
      setActiveView('session');
    } catch (error) {
      toast.error(tToasts('sessionLoadFailed'));
      setActiveView('list');
    } finally {
      setIsLoadingSession(false);
    }
  };

  const handleSessionSelect = (sessionId: string) => {
    router.push(`/dashboard/docpen?session=${sessionId}`);
  };

  const handleSessionCreated = (sessionId: string) => {
    router.push(`/dashboard/docpen?session=${sessionId}`);
  };

  const handleBackToList = () => {
    router.push('/dashboard/docpen');
    setActiveSession(null);
    setActiveView('list');
  };

  const handleRecordingComplete = () => {
    if (activeSession) {
      loadSession(activeSession.id);
    }
  };

  const handleSOAPGenerated = () => {
    if (activeSession) {
      loadSession(activeSession.id);
    }
  };

  const handleSigned = () => {
    if (activeSession) {
      loadSession(activeSession.id);
    }
  };

  const currentSOAPNote = activeSession?.soapNotes?.find(n => n.isCurrentVersion) || null;

  // Show loading state while session is being checked
  if (sessionStatus === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Guard against unauthenticated state (should be handled by layout, but extra safety)
  if (sessionStatus === 'unauthenticated' || !session) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <p className="text-muted-foreground">Please sign in to access Docpen</p>
        </div>
      </div>
    );
  }

  // Check if user's industry has access to Docpen
  const userIndustry = (session?.user?.industry as Industry) || null;
  const hasDocpenAccess = isMenuItemVisible('docpen', userIndustry);

  // Redirect non-medical industries away from Docpen
  useEffect(() => {
    if (hasDocpenAccess === false) {
      router.push('/dashboard');
    }
  }, [hasDocpenAccess, router]);

  // Show loading while redirecting non-medical industries
  if (!hasDocpenAccess) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isLoadingSession) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <DocpenErrorBoundary>
      <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {activeView === 'session' && (
            <Button variant="ghost" size="icon" onClick={handleBackToList}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Brain className="h-7 w-7 text-purple-500" />
              AI Docpen
            </h1>
            <p className="text-muted-foreground">
              Ambient medical scribe & clinical assistant
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeView === 'list' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/dashboard/docpen/settings')}
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <NewSessionDialog onSessionCreated={handleSessionCreated} />
            </>
          )}
        </div>
      </div>

      {activeView === 'list' ? (
        /* Session List View */
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Stats Cards */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-950">
                  <Mic className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Sessions</p>
                  <p className="text-2xl font-bold">{sessionStats.activeSessions}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-950">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">SOAP Notes Generated</p>
                  <p className="text-2xl font-bold">{sessionStats.soapNotesGenerated}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-green-100 dark:bg-green-950">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Signed & Complete</p>
                  <p className="text-2xl font-bold">{sessionStats.signedComplete}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Session List */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>Recent Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                <SessionList onSessionSelect={handleSessionSelect} />
              </CardContent>
            </Card>
          </div>
        </div>
      ) : activeSession ? (
        /* Active Session View */
        <div className="space-y-6">
          {/* Session Header */}
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">
                    {activeSession.patientName ||
                      activeSession.lead?.contactPerson ||
                      activeSession.lead?.businessName ||
                      'Unnamed Patient'}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {activeSession.profession.replace('_', ' ')}
                    {activeSession.chiefComplaint && ` • ${activeSession.chiefComplaint}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={activeSession.status === 'SIGNED' ? 'default' : 'secondary'}>
                    {activeSession.status.replace('_', ' ')}
                  </Badge>
                  {activeSession.status === 'REVIEW_PENDING' && (
                    <Button
                      onClick={() => setShowSignDialog(true)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <FileSignature className="h-4 w-4 mr-2" />
                      Review & Sign
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column - Recording & Transcription */}
            <div className="lg:col-span-2 space-y-6">
              {/* Recording Interface */}
              {activeSession.status === 'RECORDING' && (
                <DocpenRecorder
                  sessionId={activeSession.id}
                  onRecordingComplete={handleRecordingComplete}
                  onStatusChange={setRecordingStatus}
                />
              )}

              {/* Transcription Display */}
              {activeSession.transcriptions && activeSession.transcriptions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Mic className="h-5 w-5" />
                      Transcription
                      <Badge variant="outline">{activeSession.transcriptions.length} segments</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {activeSession.transcriptions.map((t) => (
                        <div
                          key={t.id}
                          className={`p-3 rounded-lg ${
                            t.speakerRole === 'PRACTITIONER'
                              ? 'bg-blue-50 dark:bg-blue-950/30 ml-4'
                              : 'bg-gray-50 dark:bg-gray-800/30 mr-4'
                          }`}
                        >
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            {t.speakerLabel || t.speakerRole}
                          </p>
                          <p className="text-sm">{t.content}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* SOAP Note Editor */}
              {activeSession.transcriptionComplete && (
                <SOAPNoteEditor
                  sessionId={activeSession.id}
                  soapNote={currentSOAPNote}
                  readOnly={activeSession.status === 'SIGNED'}
                  onUpdate={(note) => {
                    setActiveSession(prev => prev ? {
                      ...prev,
                      soapNotes: prev.soapNotes?.map(n =>
                        n.id === note.id ? note : n
                      ) || [note],
                    } : null);
                  }}
                  onGenerate={handleSOAPGenerated}
                />
              )}
            </div>

            {/* Right Column - Voice & Text Assistant */}
            <div className="lg:col-span-1">
              <div className="sticky top-6">
                <Tabs defaultValue="voice" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="voice" className="flex items-center gap-1">
                      <Mic className="h-4 w-4" />
                      Voice
                    </TabsTrigger>
                    <TabsTrigger value="text" className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      Text
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="voice" className="mt-0">
                    <VoiceAssistant
                      sessionId={activeSession.id}
                      profession={activeSession.profession as DocpenProfessionType}
                      customProfession={activeSession.customProfession}
                      patientName={activeSession.patientName || activeSession.lead?.contactPerson}
                      chiefComplaint={activeSession.chiefComplaint}
                      consultantName={activeSession.consultantName}
                    />
                  </TabsContent>
                  <TabsContent value="text" className="mt-0">
                    <ActiveAssistant
                      sessionId={activeSession.id}
                      isActive={recordingStatus === 'recording'}
                    />
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Review & Sign Dialog */}
      {activeSession && (
        <ReviewSignDialog
          open={showSignDialog}
          onOpenChange={setShowSignDialog}
          sessionId={activeSession.id}
          patientName={activeSession.patientName || activeSession.lead?.contactPerson}
          sessionDate={new Date(activeSession.sessionDate)}
          onSigned={handleSigned}
        />
      )}
      </div>
    </DocpenErrorBoundary>
  );
}
