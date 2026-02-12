'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CheckCircle2, XCircle, AlertTriangle, Phone, Calendar, Mail, Bot, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function VoiceAIDiagnosticsPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [summarizingId, setSummarizingId] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (status === 'authenticated') {
      runDiagnostics();
    }
  }, [status, router]);

  const runDiagnostics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/debug/voice-ai');
      if (response.ok) {
        const data = await response.json();
        setDiagnostics(data);
        if (data.summary?.issuesDetected?.length > 0) {
          toast.warning(`Found ${data.summary.issuesDetected.length} potential issues`);
        } else {
          toast.success('All systems operational');
        }
      } else {
        throw new Error('Failed to fetch diagnostics');
      }
    } catch (error) {
      console.error('Error running diagnostics:', error);
      toast.error('Failed to run diagnostics');
    } finally {
      setLoading(false);
    }
  };

  const handleSummarize = async (callId: string) => {
    setSummarizingId(callId);
    try {
      const res = await fetch(`/api/calls/${callId}/summarize`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Call summarized and note added');
        runDiagnostics();
      } else {
        toast.error(data.error || 'Failed to summarize');
      }
    } catch {
      toast.error('Failed to summarize call');
    } finally {
      setSummarizingId(null);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Voice AI Diagnostics</h1>
          <p className="text-gray-400 mt-1">Check the status of your voice AI booking system</p>
        </div>
        <Button onClick={runDiagnostics} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {diagnostics?.summary && (
        <>
          {/* Issues Detected */}
          {diagnostics.summary.issuesDetected.length > 0 && (
            <Card className="border-yellow-500/50 bg-yellow-500/5">
              <CardHeader>
                <CardTitle className="flex items-center text-yellow-500">
                  <AlertTriangle className="mr-2 h-5 w-5" />
                  Issues Detected
                </CardTitle>
                <CardDescription>The following issues need attention</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {diagnostics.summary.issuesDetected.map((issue: string, idx: number) => (
                    <li key={idx} className="flex items-start">
                      <XCircle className="mr-2 h-4 w-4 mt-0.5 text-yellow-500 flex-shrink-0" />
                      <span className="text-sm">{issue}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {diagnostics.summary.issuesDetected.length === 0 && (
            <Card className="border-green-500/50 bg-green-500/5">
              <CardHeader>
                <CardTitle className="flex items-center text-green-500">
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  All Systems Operational
                </CardTitle>
                <CardDescription>No issues detected with your voice AI system</CardDescription>
              </CardHeader>
            </Card>
          )}

          {/* Summary Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Voice Agents</CardTitle>
                <Bot className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{diagnostics.summary.voiceAgentsCount}</div>
                <p className="text-xs text-muted-foreground">
                  {diagnostics.summary.agentsWithEmailNotifications} with email notifications
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Call Logs</CardTitle>
                <Phone className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{diagnostics.summary.totalCallLogs}</div>
                <p className="text-xs text-muted-foreground">Total calls recorded</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Reservations</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{diagnostics.summary.voiceAIReservations}</div>
                <p className="text-xs text-muted-foreground">
                  From voice AI (of {diagnostics.summary.totalReservations} total)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Gmail Status</CardTitle>
                <Mail className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  {diagnostics.summary.gmailConnected ? (
                    <Badge className="bg-green-500">Connected</Badge>
                  ) : (
                    <Badge variant="destructive">Not Connected</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Information */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Voice Agents */}
            <Card>
              <CardHeader>
                <CardTitle>Voice Agents</CardTitle>
                <CardDescription>Your configured voice AI agents</CardDescription>
              </CardHeader>
              <CardContent>
                {diagnostics.diagnostics.voiceAgents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No voice agents configured</p>
                ) : (
                  <div className="space-y-4">
                    {diagnostics.diagnostics.voiceAgents.map((agent: any) => (
                      <div key={agent.id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold">{agent.name}</h4>
                          {agent.twilioPhoneNumber && (
                            <Badge variant="outline">{agent.twilioPhoneNumber}</Badge>
                          )}
                        </div>
                        <div className="text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Recording:</span>
                            <span>{agent.enableCallRecording ? '✅' : '❌'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Transcription:</span>
                            <span>{agent.enableTranscription ? '✅' : '❌'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Email Notifications:</span>
                            <span>{agent.sendRecordingEmail ? '✅' : '❌'}</span>
                          </div>
                          {agent.sendRecordingEmail && agent.recordingEmailAddress && (
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Email To:</span>
                              <span className="truncate ml-2">{agent.recordingEmailAddress}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Reservations */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Reservations</CardTitle>
                <CardDescription>Last 10 reservations (Voice AI)</CardDescription>
              </CardHeader>
              <CardContent>
                {diagnostics.diagnostics.reservations.filter((r: any) => r.source === 'VOICE_AI').length === 0 ? (
                  <p className="text-sm text-muted-foreground">No voice AI reservations yet</p>
                ) : (
                  <div className="space-y-3">
                    {diagnostics.diagnostics.reservations
                      .filter((r: any) => r.source === 'VOICE_AI')
                      .map((res: any) => (
                        <div key={res.id} className="border rounded-lg p-3 space-y-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-sm">{res.customerName}</h4>
                            <Badge variant="outline">{res.status}</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-0.5">
                            <div>📞 {res.customerPhone}</div>
                            <div>📅 {new Date(res.reservationDate).toLocaleDateString()} at {res.reservationTime}</div>
                            <div>👥 Party of {res.partySize}</div>
                            <div>🔖 {res.confirmationCode}</div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Call Logs */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Call Logs</CardTitle>
                <CardDescription>Last 10 calls</CardDescription>
              </CardHeader>
              <CardContent>
                {diagnostics.diagnostics.callLogs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No call logs yet</p>
                ) : (
                  <div className="space-y-3">
                    {diagnostics.diagnostics.callLogs.map((call: any) => (
                      <div key={call.id} className="border rounded-lg p-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-sm">{call.voiceAgent?.name || 'Unknown Agent'}</h4>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => handleSummarize(call.id)}
                              disabled={!!summarizingId}
                            >
                              {summarizingId === call.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <FileText className="h-3 w-3 mr-1" />
                              )}
                              Summarize
                            </Button>
                            <Badge variant={call.status === 'COMPLETED' ? 'default' : 'destructive'}>
                              {call.status}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          <div>From: {call.fromNumber}</div>
                          <div>To: {call.toNumber}</div>
                          {call.duration && <div>Duration: {call.duration}s</div>}
                          <div>Date: {new Date(call.createdAt).toLocaleString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Email Connections */}
            <Card>
              <CardHeader>
                <CardTitle>Email Connections</CardTitle>
                <CardDescription>Connected email accounts</CardDescription>
              </CardHeader>
              <CardContent>
                {diagnostics.diagnostics.emailConnections.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No email connections</p>
                ) : (
                  <div className="space-y-3">
                    {diagnostics.diagnostics.emailConnections.map((conn: any) => (
                      <div key={conn.id} className="border rounded-lg p-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-sm">{conn.providerType}</h4>
                          <Badge variant={conn.status === 'CONNECTED' ? 'default' : 'destructive'}>
                            {conn.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          <div>Display Name: {conn.displayName}</div>
                          <div>Identifier: {conn.channelIdentifier}</div>
                          <div>Connected: {new Date(conn.createdAt).toLocaleDateString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
