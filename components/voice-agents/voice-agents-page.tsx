'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Plus,
  Phone,
  Users,
  TrendingUp,
  ShoppingCart,
  RefreshCw,
  BarChart3,
  Bot,
  Workflow,
  Megaphone,
  MoreVertical,
  Pencil,
  Power,
  Trash2,
  TestTube2,
  ExternalLink,
  FileText,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreateVoiceAgentDialog } from './create-voice-agent-dialog';
import PurchasePhoneNumberDialog from './purchase-phone-number-dialog';
import { EditVoiceAgentDialog } from './edit-voice-agent-dialog';
import { VoiceAIUsageDashboard } from '../voice-ai/usage-dashboard';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { VOICE_AGENT_LIMIT } from '@/lib/voice-agent-templates';

export function VoiceAgentsPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [initialPhoneNumber, setInitialPhoneNumber] = useState<string | undefined>(undefined);
  const [syncingPhones, setSyncingPhones] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<any | null>(null);
  const [editingAgent, setEditingAgent] = useState<any | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [stats, setStats] = useState({
    totalAgents: 0,
    activeAgents: 0,
    totalCalls: 0,
  });
  const [recentCalls, setRecentCalls] = useState<any[]>([]);
  const [loadingCalls, setLoadingCalls] = useState(false);
  const [summarizingId, setSummarizingId] = useState<string | null>(null);

  useEffect(() => {
    fetchAgents();
  }, []);

  useEffect(() => {
    if (agents.length > 0) {
      fetchStats();
    }
  }, [agents]);

  useEffect(() => {
    if (selectedAgent?.id) {
      setLoadingCalls(true);
      fetch(`/api/calls?voiceAgentId=${selectedAgent.id}&limit=10`)
        .then((r) => r.json())
        .then((c) => setRecentCalls(Array.isArray(c) ? c : []))
        .catch(() => setRecentCalls([]))
        .finally(() => setLoadingCalls(false));
    } else {
      setRecentCalls([]);
    }
  }, [selectedAgent?.id]);

  useEffect(() => {
    const action = searchParams?.get('action');
    if (action === 'purchase-number') setShowPurchaseDialog(true);
  }, [searchParams]);

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/voice-agents');
      const data = await response.json();
      const validAgents = (Array.isArray(data) ? data : []).filter((a: any) => a && a.id);
      setAgents(validAgents);
      if (validAgents.length > 0 && !selectedAgent) {
        setSelectedAgent(validAgents[0]);
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
      setAgents([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const callsRes = await fetch('/api/calls');
      const calls = await callsRes.json();
      setStats({
        totalAgents: agents.length,
        activeAgents: agents.filter((a) => a.status === 'ACTIVE').length,
        totalCalls: calls?.length || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleAgentCreated = () => {
    setShowCreateDialog(false);
    fetchAgents();
  };

  const handleSyncPhoneNumbers = async () => {
    setSyncingPhones(true);
    const toastId = toast.loading('Syncing phone numbers...');
    try {
      const res = await fetch('/api/twilio/phone-numbers/sync', { method: 'POST' });
      const result = await res.json();
      if (res.ok) {
        toast.success('Phone numbers synced!', { id: toastId });
        fetchAgents();
      } else {
        toast.error(result.error || 'Sync failed', { id: toastId });
      }
    } catch (e: any) {
      toast.error(e.message || 'Sync failed', { id: toastId });
    } finally {
      setSyncingPhones(false);
    }
  };

  const handleVerifySetup = async () => {
    const toastId = toast.loading('Verifying setup...');
    try {
      const res = await fetch('/api/elevenlabs/validate');
      const data = await res.json();
      if (data.success) {
        const passed = data.checks?.filter((c: any) => c.status === 'passed').length || 0;
        toast.success(`${passed}/${data.checks?.length || 0} checks passed`, { id: toastId });
      } else {
        toast.error(data.errors?.[0] || 'Verification failed', { id: toastId });
      }
    } catch (e: any) {
      toast.error(e.message || 'Verification failed', { id: toastId });
    }
  };

  const handleSummarize = async (callId: string) => {
    setSummarizingId(callId);
    try {
      const res = await fetch(`/api/calls/${callId}/summarize`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Call summarized and note added');
        if (selectedAgent?.id) {
          fetch(`/api/calls?voiceAgentId=${selectedAgent.id}&limit=10`)
            .then((r) => r.json())
            .then((c) => setRecentCalls(Array.isArray(c) ? c : []));
        }
      } else {
        toast.error(data.error || 'Failed to summarize');
      }
    } catch {
      toast.error('Failed to summarize call');
    } finally {
      setSummarizingId(null);
    }
  };

  const canCreateMore = agents.length < VOICE_AGENT_LIMIT;
  const userIndustry = (session?.user?.industry as string) || null;
  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN' || (session?.user?.isImpersonating && session?.user?.superAdminId);

  // Avatar URL - use ui-avatars for consistent placeholder
  const getAvatarUrl = (agent: any) => {
    const name = encodeURIComponent(agent.name || 'Agent');
    return `https://ui-avatars.com/api/?name=${name}&background=6366f1&color=fff&size=128&bold=true`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50/50 via-white to-pink-50/50 flex items-center justify-center">
        <div className="animate-spin h-10 w-10 border-2 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50/50 via-white to-pink-50/50 relative overflow-hidden">
      {/* Animated background effects - match AI Brain */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-400/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-3">
              <span className="text-gray-700">My</span>
              <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 bg-clip-text text-transparent">
                Voice Agents
              </span>
            </h1>
            <p className="text-gray-600 mt-1">
              {agents.length} / {VOICE_AGENT_LIMIT} agents · Industry-geared prompts
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isSuperAdmin && (
              <>
                <Button variant="outline" size="sm" onClick={handleVerifySetup} className="border-purple-200 text-gray-700 hover:bg-purple-50">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Verify
                </Button>
                <Button variant="outline" size="sm" onClick={handleSyncPhoneNumbers} disabled={syncingPhones} className="border-purple-200 text-gray-700 hover:bg-purple-50">
                  <RefreshCw className={cn('w-4 h-4 mr-2', syncingPhones && 'animate-spin')} />
                  Sync Phones
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowPurchaseDialog(true)} className="border-purple-200 text-gray-700 hover:bg-purple-50">
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Buy Number
                </Button>
              </>
            )}
            {canCreateMore && (
              <Button onClick={() => setShowCreateDialog(true)} className="bg-purple-600 hover:bg-purple-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Agent
              </Button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: 'Total Agents', value: agents.length, icon: Users, color: 'purple' },
            { label: 'Active', value: stats.activeAgents, icon: TrendingUp, color: 'green' },
            { label: 'Total Calls', value: stats.totalCalls, icon: Phone, color: 'pink' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div
              key={label}
              className="p-4 rounded-xl border border-purple-200/50 bg-white/80 backdrop-blur-sm shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{label}</p>
                  <p className="text-2xl font-bold mt-1 text-gray-900">{value}</p>
                </div>
                <div className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center',
                  color === 'purple' && 'bg-purple-500/20',
                  color === 'green' && 'bg-green-500/20',
                  color === 'pink' && 'bg-pink-500/20'
                )}>
                  <Icon className={cn(
                    'w-5 h-5',
                    color === 'purple' && 'text-purple-500',
                    color === 'green' && 'text-green-500',
                    color === 'pink' && 'text-pink-500'
                  )} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Main Content */}
        <Tabs defaultValue="agents" className="w-full">
          <TabsList className="bg-white/80 border border-purple-200 backdrop-blur-sm">
            <TabsTrigger value="agents" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <Users className="w-4 h-4 mr-2" />
              My Voice Agents
            </TabsTrigger>
            <Link
              href="/dashboard/voice-agent"
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium text-gray-600 hover:bg-purple-50 hover:text-purple-600 transition-colors"
            >
              <Phone className="w-4 h-4" />
              Call History
              <ExternalLink className="w-3 h-3" />
            </Link>
            {isSuperAdmin && (
              <TabsTrigger value="usage" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                <BarChart3 className="w-4 h-4 mr-2" />
                Usage
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="agents" className="mt-6">
            {agents.length === 0 ? (
              <div className="text-center py-24 border-2 border-dashed border-purple-200 rounded-xl bg-white/50">
                <div className="w-20 h-20 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
                  <Phone className="w-10 h-10 text-purple-500" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Voice Agents Yet</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Create your first agent to handle calls. Agents are created automatically when you add AI employees or workflows—or add one now.
                </p>
                <Button onClick={() => setShowCreateDialog(true)} className="bg-purple-600 hover:bg-purple-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Agent
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Agent list */}
                <div className="space-y-3">
                  <div className="text-sm font-medium text-gray-600 mb-4">Your Agents</div>
                  {agents.map((agent) => {
                    const isActive = agent.status === 'ACTIVE' && (agent.aiEmployeeCount > 0 || agent._count?.campaigns > 0 || agent._count?.callLogs > 0);
                    return (
                      <button
                        key={agent.id}
                        onClick={() => setSelectedAgent(agent)}
                        className={cn(
                          'w-full text-left p-3 rounded-xl border-2 transition-all flex items-center gap-3',
                          selectedAgent?.id === agent.id
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-purple-200 bg-white/80 hover:border-purple-300'
                        )}
                      >
                        {/* Switchboard-style status light - green flicker when in use, yellow when idle */}
                        <div className="relative flex-shrink-0">
                          <div
                            className={cn(
                              'w-3.5 h-3.5 rounded-full border-2',
                              isActive
                                ? 'bg-emerald-500 border-emerald-400 animate-switchboard-flicker'
                                : 'bg-amber-500 border-amber-400 shadow-[0_0_4px_rgba(245,158,11,0.5)]'
                            )}
                          />
                        </div>
                        <img
                          src={getAvatarUrl(agent)}
                          alt={agent.name}
                          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate text-gray-900">{agent.name}</p>
                          <p className="text-xs text-gray-500 truncate">
                            {isActive ? 'In use' : 'Idle'}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Center: Selected agent card (like Sara Davis card in image) */}
                <div className="lg:col-span-2">
                  {selectedAgent ? (
                    <Card className="border-2 border-purple-200/50 bg-white/80 backdrop-blur-sm overflow-hidden shadow-sm">
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-transparent pointer-events-none" />
                      <CardHeader className="relative">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              <img
                                src={getAvatarUrl(selectedAgent)}
                                alt={selectedAgent.name}
                                className="w-16 h-16 rounded-full ring-2 ring-purple-500/30"
                              />
                              {(() => {
                                const isActive = selectedAgent.status === 'ACTIVE' && (selectedAgent.aiEmployeeCount > 0 || selectedAgent._count?.campaigns > 0 || selectedAgent._count?.callLogs > 0);
                                return (
                                  <div
                                    className={cn(
                                      'absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2',
                                      isActive
                                        ? 'bg-emerald-500 border-emerald-400 animate-switchboard-flicker'
                                        : 'bg-amber-500 border-amber-400'
                                    )}
                                  />
                                );
                              })()}
                            </div>
                            <div>
                              <CardTitle className="text-2xl text-gray-900">{selectedAgent.name}</CardTitle>
                              <CardDescription className="text-gray-600">{selectedAgent.businessName}</CardDescription>
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-white border-purple-200">
                              <DropdownMenuItem onClick={() => { setEditingAgent(selectedAgent); setShowEditDialog(true); }}>
                                <Pencil className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => window.location.href = `/dashboard/voice-agents/preview?agentId=${selectedAgent.id}`}>
                                <TestTube2 className="w-4 h-4 mr-2" />
                                Test
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => fetch(`/api/voice-agents/${selectedAgent.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ ...selectedAgent, status: selectedAgent.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }),
                              }).then(() => fetchAgents())}>
                                <Power className="w-4 h-4 mr-2" />
                                {selectedAgent.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  if (confirm('Delete this agent?')) {
                                    fetch(`/api/voice-agents/${selectedAgent.id}`, { method: 'DELETE' }).then(() => {
                                      fetchAgents();
                                      setSelectedAgent(null);
                                    });
                                  }
                                }}
                                className="text-red-400"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardHeader>
                      <CardContent className="relative">
                        <Tabs defaultValue="profile" className="w-full">
                          <TabsList className="bg-white/80 border border-purple-200 mb-4">
                            <TabsTrigger value="profile" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                              Profile
                            </TabsTrigger>
                            <TabsTrigger value="connections" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                              Connections
                            </TabsTrigger>
                            <TabsTrigger value="performance" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                              Performance
                            </TabsTrigger>
                          </TabsList>
                          <TabsContent value="profile" className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="p-3 rounded-lg bg-purple-50/50 border border-purple-200">
                                <p className="text-xs text-gray-500">Type</p>
                                <p className="font-medium text-gray-900">{selectedAgent.type}</p>
                              </div>
                              <div className="p-3 rounded-lg bg-purple-50/50 border border-purple-200">
                                <p className="text-xs text-gray-500">Phone</p>
                                <p className="font-medium text-gray-900">{selectedAgent.twilioPhoneNumber || '—'}</p>
                              </div>
                              <div className="p-3 rounded-lg bg-purple-50/50 border border-purple-200 col-span-2">
                                <p className="text-xs text-gray-500">Description</p>
                                <p className="font-medium text-gray-900">{selectedAgent.description || 'No description'}</p>
                              </div>
                            </div>
                          </TabsContent>
                          <TabsContent value="connections" className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/50 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                  <Bot className="w-5 h-5 text-purple-500" />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">AI Employees</p>
                                  <p className="text-2xl font-bold text-purple-600">{selectedAgent.aiEmployeeCount || 0}</p>
                                </div>
                              </div>
                              <div className="p-4 rounded-xl border border-pink-200 bg-pink-50/50 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center">
                                  <Megaphone className="w-5 h-5 text-pink-500" />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">Campaigns</p>
                                  <p className="text-2xl font-bold text-pink-600">{selectedAgent._count?.campaigns || 0}</p>
                                </div>
                              </div>
                              <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/30 flex items-center gap-3 col-span-2">
                                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                  <Workflow className="w-5 h-5 text-purple-500" />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">Workflows</p>
                                  <p className="text-sm text-gray-500">Assign in workflow task editor</p>
                                </div>
                              </div>
                            </div>
                          </TabsContent>
                          <TabsContent value="performance" className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/30">
                                <p className="text-sm text-gray-500">Total Calls</p>
                                <p className="text-2xl font-bold text-gray-900">{selectedAgent._count?.callLogs || 0}</p>
                              </div>
                              <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/30">
                                <p className="text-sm text-gray-500">Outbound</p>
                                <p className="text-2xl font-bold text-gray-900">{selectedAgent._count?.outboundCalls || 0}</p>
                              </div>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-700 mb-2">Recent Calls</p>
                              {loadingCalls ? (
                                <p className="text-sm text-gray-500">Loading...</p>
                              ) : recentCalls.length === 0 ? (
                                <p className="text-sm text-gray-500">No recent calls</p>
                              ) : (
                                <div className="space-y-2">
                                  {recentCalls.map((call) => (
                                    <div key={call.id} className="flex items-center justify-between p-2 rounded-lg border border-purple-200 bg-white/50">
                                      <div>
                                        <p className="text-sm font-medium text-gray-900">
                                          {call.lead?.contactPerson || call.lead?.businessName || call.fromNumber}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                          {format(new Date(call.createdAt), 'MMM d, h:mm a')}
                                          {call.duration != null && ` • ${Math.floor(call.duration / 60)}:${(call.duration % 60).toString().padStart(2, '0')}`}
                                        </p>
                                      </div>
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
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </TabsContent>
                        </Tabs>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="flex items-center justify-center h-64 border-2 border-dashed border-purple-200 rounded-xl bg-white/50">
                      <p className="text-gray-500">Select an agent</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          {isSuperAdmin && (
          <TabsContent value="usage" className="mt-6">
            <VoiceAIUsageDashboard />
          </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Dialogs */}
      <CreateVoiceAgentDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onAgentCreated={handleAgentCreated}
        initialPhoneNumber={initialPhoneNumber}
      />
      <PurchasePhoneNumberDialog
        open={showPurchaseDialog}
        onClose={() => { setShowPurchaseDialog(false); setInitialPhoneNumber(undefined); }}
        onSuccess={() => { setShowPurchaseDialog(false); fetchAgents(); }}
        onCreateVoiceAgent={(phone) => {
          setInitialPhoneNumber(phone);
          setShowPurchaseDialog(false);
          setShowCreateDialog(true);
        }}
      />
      {editingAgent && (
        <EditVoiceAgentDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          onAgentUpdated={() => { fetchAgents(); setShowEditDialog(false); setEditingAgent(null); }}
          agent={editingAgent}
        />
      )}
    </div>
  );
}
