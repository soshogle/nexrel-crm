'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Plus,
  Phone,
  Users,
  TrendingUp,
  PhoneOutgoing,
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
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreateVoiceAgentDialog } from './create-voice-agent-dialog';
import { ScheduleOutboundCallDialog } from './schedule-outbound-call-dialog';
import PurchasePhoneNumberDialog from './purchase-phone-number-dialog';
import { EditVoiceAgentDialog } from './edit-voice-agent-dialog';
import { VoiceAIUsageDashboard } from '../voice-ai/usage-dashboard';
import { Badge } from '@/components/ui/badge';
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
  const [outboundCalls, setOutboundCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showScheduleCallDialog, setShowScheduleCallDialog] = useState(false);
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
    outboundScheduled: 0,
    outboundCompleted: 0,
  });

  useEffect(() => {
    fetchAgents();
    fetchOutboundCalls();
  }, []);

  useEffect(() => {
    if (agents.length > 0) {
      fetchStats();
    }
  }, [agents]);

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

  const fetchOutboundCalls = async () => {
    try {
      const res = await fetch('/api/outbound-calls');
      const data = await res.json();
      setOutboundCalls(data || []);
    } catch (error) {
      console.error('Error fetching outbound calls:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const [callsRes, outboundRes] = await Promise.all([
        fetch('/api/calls'),
        fetch('/api/outbound-calls'),
      ]);
      const calls = await callsRes.json();
      const outbound = await outboundRes.json();
      setStats({
        totalAgents: agents.length,
        activeAgents: agents.filter((a) => a.status === 'ACTIVE').length,
        totalCalls: calls?.length || 0,
        outboundScheduled: outbound?.filter((c: any) => c.status === 'SCHEDULED').length || 0,
        outboundCompleted: outbound?.filter((c: any) => c.status === 'COMPLETED').length || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleAgentCreated = () => {
    setShowCreateDialog(false);
    fetchAgents();
  };

  const handleCallScheduled = () => {
    setShowScheduleCallDialog(false);
    fetchOutboundCalls();
    fetchStats();
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

  const canCreateMore = agents.length < VOICE_AGENT_LIMIT;
  const userIndustry = (session?.user?.industry as string) || null;

  // Avatar URL - use ui-avatars for consistent placeholder
  const getAvatarUrl = (agent: any) => {
    const name = encodeURIComponent(agent.name || 'Agent');
    return `https://ui-avatars.com/api/?name=${name}&background=6366f1&color=fff&size=128&bold=true`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="animate-spin h-10 w-10 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      {/* Subtle gradient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[80px]" />
      </div>

      <div className="relative z-10 p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-3">
              <span className="text-gray-300">My</span>
              <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                Voice Agents
              </span>
            </h1>
            <p className="text-gray-400 mt-1">
              {agents.length} / {VOICE_AGENT_LIMIT} agents · Industry-geared prompts
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleVerifySetup} className="border-gray-600 text-gray-300 hover:bg-gray-800">
              <RefreshCw className="w-4 h-4 mr-2" />
              Verify
            </Button>
            <Button variant="outline" size="sm" onClick={handleSyncPhoneNumbers} disabled={syncingPhones} className="border-gray-600 text-gray-300 hover:bg-gray-800">
              <RefreshCw className={cn('w-4 h-4 mr-2', syncingPhones && 'animate-spin')} />
              Sync Phones
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowPurchaseDialog(true)} className="border-gray-600 text-gray-300 hover:bg-gray-800">
              <ShoppingCart className="w-4 h-4 mr-2" />
              Buy Number
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowScheduleCallDialog(true)} className="border-gray-600 text-gray-300 hover:bg-gray-800">
              <PhoneOutgoing className="w-4 h-4 mr-2" />
              Schedule Call
            </Button>
            {canCreateMore && (
              <Button onClick={() => setShowCreateDialog(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Agent
              </Button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Agents', value: agents.length, icon: Users, color: 'blue' },
            { label: 'Active', value: stats.activeAgents, icon: TrendingUp, color: 'green' },
            { label: 'Total Calls', value: stats.totalCalls, icon: Phone, color: 'purple' },
            { label: 'Scheduled', value: stats.outboundScheduled, icon: PhoneOutgoing, color: 'orange' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div
              key={label}
              className="p-4 rounded-xl border border-gray-700/50 bg-gray-900/50 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">{label}</p>
                  <p className="text-2xl font-bold mt-1">{value}</p>
                </div>
                <div className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center',
                  color === 'blue' && 'bg-blue-500/20',
                  color === 'green' && 'bg-green-500/20',
                  color === 'purple' && 'bg-purple-500/20',
                  color === 'orange' && 'bg-orange-500/20'
                )}>
                  <Icon className={cn(
                    'w-5 h-5',
                    color === 'blue' && 'text-blue-400',
                    color === 'green' && 'text-green-400',
                    color === 'purple' && 'text-purple-400',
                    color === 'orange' && 'text-orange-400'
                  )} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Main Content - Layout inspired by attached image */}
        <Tabs defaultValue="agents" className="w-full">
          <TabsList className="bg-gray-800/50 border border-gray-700">
            <TabsTrigger value="agents" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Users className="w-4 h-4 mr-2" />
              Voice Agents
            </TabsTrigger>
            <TabsTrigger value="outbound" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <PhoneOutgoing className="w-4 h-4 mr-2" />
              Outbound Calls
              {stats.outboundScheduled > 0 && (
                <Badge className="ml-2 bg-blue-600/80">{stats.outboundScheduled}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="usage" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <BarChart3 className="w-4 h-4 mr-2" />
              Usage
            </TabsTrigger>
          </TabsList>

          <TabsContent value="agents" className="mt-6">
            {agents.length === 0 ? (
              <div className="text-center py-24 border-2 border-dashed border-gray-700 rounded-xl">
                <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
                  <Phone className="w-10 h-10 text-gray-500" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">No Voice Agents Yet</h3>
                <p className="text-gray-400 mb-6 max-w-md mx-auto">
                  Create your first agent to handle calls. Agents are created automatically when you add AI employees or workflows—or add one now.
                </p>
                <Button onClick={() => setShowCreateDialog(true)} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Agent
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Agent list */}
                <div className="space-y-3">
                  <div className="text-sm font-medium text-gray-400 mb-4">Your Agents</div>
                  {agents.map((agent) => {
                    const isActive = agent.status === 'ACTIVE' && (agent.aiEmployeeCount > 0 || agent._count?.campaigns > 0 || agent._count?.callLogs > 0);
                    return (
                      <button
                        key={agent.id}
                        onClick={() => setSelectedAgent(agent)}
                        className={cn(
                          'w-full text-left p-3 rounded-xl border-2 transition-all flex items-center gap-3',
                          selectedAgent?.id === agent.id
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-gray-700/50 bg-gray-800/30 hover:border-gray-600'
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
                          <p className="font-medium truncate">{agent.name}</p>
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
                    <Card className="border-2 border-gray-700/50 bg-gray-900/60 backdrop-blur-sm overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent pointer-events-none" />
                      <CardHeader className="relative">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              <img
                                src={getAvatarUrl(selectedAgent)}
                                alt={selectedAgent.name}
                                className="w-16 h-16 rounded-full ring-2 ring-blue-500/30"
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
                              <CardTitle className="text-2xl text-white">{selectedAgent.name}</CardTitle>
                              <CardDescription className="text-gray-400">{selectedAgent.businessName}</CardDescription>
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700">
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
                          <TabsList className="bg-gray-800/50 border border-gray-700 mb-4">
                            <TabsTrigger value="profile" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white">
                              Profile
                            </TabsTrigger>
                            <TabsTrigger value="connections" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white">
                              Connections
                            </TabsTrigger>
                            <TabsTrigger value="performance" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white">
                              Performance
                            </TabsTrigger>
                          </TabsList>
                          <TabsContent value="profile" className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700">
                                <p className="text-xs text-gray-500">Type</p>
                                <p className="font-medium">{selectedAgent.type}</p>
                              </div>
                              <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700">
                                <p className="text-xs text-gray-500">Phone</p>
                                <p className="font-medium">{selectedAgent.twilioPhoneNumber || '—'}</p>
                              </div>
                              <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700 col-span-2">
                                <p className="text-xs text-gray-500">Description</p>
                                <p className="font-medium">{selectedAgent.description || 'No description'}</p>
                              </div>
                            </div>
                          </TabsContent>
                          <TabsContent value="connections" className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/5 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                  <Bot className="w-5 h-5 text-blue-400" />
                                </div>
                                <div>
                                  <p className="font-medium">AI Employees</p>
                                  <p className="text-2xl font-bold text-blue-400">{selectedAgent.aiEmployeeCount || 0}</p>
                                </div>
                              </div>
                              <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-500/5 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                  <Megaphone className="w-5 h-5 text-purple-400" />
                                </div>
                                <div>
                                  <p className="font-medium">Campaigns</p>
                                  <p className="text-2xl font-bold text-purple-400">{selectedAgent._count?.campaigns || 0}</p>
                                </div>
                              </div>
                              <div className="p-4 rounded-xl border border-gray-600/50 bg-gray-800/30 flex items-center gap-3 col-span-2">
                                <div className="w-10 h-10 rounded-lg bg-gray-600/30 flex items-center justify-center">
                                  <Workflow className="w-5 h-5 text-gray-400" />
                                </div>
                                <div>
                                  <p className="font-medium">Workflows</p>
                                  <p className="text-sm text-gray-500">Assign in workflow task editor</p>
                                </div>
                              </div>
                            </div>
                          </TabsContent>
                          <TabsContent value="performance" className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="p-4 rounded-xl border border-gray-700 bg-gray-800/30">
                                <p className="text-sm text-gray-500">Total Calls</p>
                                <p className="text-2xl font-bold">{selectedAgent._count?.callLogs || 0}</p>
                              </div>
                              <div className="p-4 rounded-xl border border-gray-700 bg-gray-800/30">
                                <p className="text-sm text-gray-500">Outbound</p>
                                <p className="text-2xl font-bold">{selectedAgent._count?.outboundCalls || 0}</p>
                              </div>
                            </div>
                          </TabsContent>
                        </Tabs>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="flex items-center justify-center h-64 border-2 border-dashed border-gray-700 rounded-xl">
                      <p className="text-gray-500">Select an agent</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="outbound" className="mt-6">
            <div className="p-6 rounded-xl border border-gray-700 bg-gray-900/50">
              {outboundCalls.length === 0 ? (
                <div className="text-center py-12">
                  <PhoneOutgoing className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">No Outbound Calls</h3>
                  <p className="text-gray-400 mb-4">Schedule your first outbound call</p>
                  <Button onClick={() => setShowScheduleCallDialog(true)} className="bg-blue-600 hover:bg-blue-700">
                    <PhoneOutgoing className="w-4 h-4 mr-2" />
                    Schedule Call
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {outboundCalls.map((call: any) => (
                    <div
                      key={call.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-gray-700 bg-gray-800/30 hover:bg-gray-800/50"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{call.name}</h4>
                          <Badge variant={call.status === 'COMPLETED' ? 'default' : 'secondary'}>{call.status}</Badge>
                        </div>
                        <p className="text-sm text-gray-400">{call.phoneNumber} • {call.voiceAgent?.name}</p>
                      </div>
                      {call.status === 'SCHEDULED' && (
                        <Button
                          size="sm"
                          onClick={async () => {
                            await fetch(`/api/outbound-calls/${call.id}/initiate`, { method: 'POST' });
                            fetchOutboundCalls();
                          }}
                        >
                          <Phone className="w-4 h-4 mr-2" />
                          Call Now
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="usage" className="mt-6">
            <VoiceAIUsageDashboard />
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <CreateVoiceAgentDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onAgentCreated={handleAgentCreated}
        initialPhoneNumber={initialPhoneNumber}
      />
      <ScheduleOutboundCallDialog
        open={showScheduleCallDialog}
        onOpenChange={setShowScheduleCallDialog}
        onCallScheduled={handleCallScheduled}
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
