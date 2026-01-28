'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus, Phone, Users, TrendingUp, PhoneOutgoing, ShoppingCart, RefreshCw, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreateVoiceAgentDialog } from './create-voice-agent-dialog';
import { ScheduleOutboundCallDialog } from './schedule-outbound-call-dialog';
import PurchasePhoneNumberDialog from './purchase-phone-number-dialog';
import { VoiceAgentsList } from './voice-agents-list';
import { VoiceAIUsageDashboard } from '../voice-ai/usage-dashboard';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export function VoiceAgentsPage() {
  const searchParams = useSearchParams();
  const [agents, setAgents] = useState<any[]>([]);
  const [outboundCalls, setOutboundCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showScheduleCallDialog, setShowScheduleCallDialog] = useState(false);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [initialPhoneNumber, setInitialPhoneNumber] = useState<string | undefined>(undefined);
  const [syncingPhones, setSyncingPhones] = useState(false);
  const [stats, setStats] = useState({
    totalAgents: 0,
    activeAgents: 0,
    totalCalls: 0,
    appointmentsBooked: 0,
    outboundScheduled: 0,
    outboundCompleted: 0,
  });

  useEffect(() => {
    fetchAgents();
    fetchOutboundCalls();
    fetchStats();
  }, []);

  // Check if we should open the purchase dialog from URL parameter
  useEffect(() => {
    const action = searchParams?.get('action');
    if (action === 'purchase-number') {
      setShowPurchaseDialog(true);
    }
  }, [searchParams]);

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/voice-agents');
      const data = await response.json();
      // Filter out any null/invalid agents
      const validAgents = (Array.isArray(data) ? data : []).filter(agent => agent && agent.id);
      setAgents(validAgents);
    } catch (error) {
      console.error('Error fetching agents:', error);
      setAgents([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const fetchOutboundCalls = async () => {
    try {
      const response = await fetch('/api/outbound-calls');
      const data = await response.json();
      setOutboundCalls(data);
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
      
      const appointmentCalls = calls.filter((call: any) => 
        call.outcome === 'APPOINTMENT_BOOKED'
      );

      setStats({
        totalAgents: agents.length,
        activeAgents: agents.filter((a) => a.status === 'ACTIVE').length,
        totalCalls: calls.length,
        appointmentsBooked: appointmentCalls.length,
        outboundScheduled: outbound.filter((c: any) => c.status === 'SCHEDULED').length,
        outboundCompleted: outbound.filter((c: any) => c.status === 'COMPLETED').length,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleSyncPhoneNumbers = async () => {
    setSyncingPhones(true);
    const toastId = toast.loading('Syncing phone numbers to Voice AI platform...');
    
    try {
      const response = await fetch('/api/twilio/phone-numbers/sync', {
        method: 'POST'
      });

      if (response.ok) {
        const result = await response.json();
        toast.success('Phone numbers synced successfully!', {
          id: toastId,
          description: result.message || `Synced ${result.syncedToDatabase} to database, imported ${result.importedToElevenLabs} to Voice AI`,
          duration: 5000
        });
        
        // Refresh agents list to show updated phone assignments
        fetchAgents();
      } else {
        const error = await response.json();
        
        // Special handling for payment plan issues
        if (response.status === 402 || error.upgradeRequired) {
          toast.error('Voice AI Plan Upgrade Required', {
            id: toastId,
            description: `${error.details || error.error}\n\n${error.recommendation || 'Please upgrade your Voice AI plan to use phone numbers.'}`,
            duration: 10000,
            action: error.upgradeUrl ? {
              label: 'Upgrade Now',
              onClick: () => window.open(error.upgradeUrl, '_blank')
            } : undefined
          });
        } else {
          toast.error('Sync failed', {
            id: toastId,
            description: error.details || error.error || 'Failed to sync phone numbers',
            duration: 6000
          });
        }
      }
    } catch (error: any) {
      console.error('Sync error:', error);
      toast.error('Sync failed', {
        id: toastId,
        description: error.message || 'Failed to sync phone numbers',
        duration: 6000
      });
    } finally {
      setSyncingPhones(false);
    }
  };

  const [verifying, setVerifying] = useState(false);

  const handleVerifySetup = async () => {
    setVerifying(true);
    const toastId = toast.loading('Verifying Voice AI and phone setup...');
    
    try {
      const response = await fetch('/api/elevenlabs/validate');
      const data = await response.json();

      if (data.success) {
        const passedChecks = data.checks.filter((c: any) => c.status === 'passed').length;
        const totalChecks = data.checks.length;
        
        toast.success(`Setup Verified: ${passedChecks}/${totalChecks} checks passed`, {
          id: toastId,
          description: data.warnings.length > 0 
            ? `${data.warnings.length} warning(s): ${data.warnings[0]}` 
            : 'Your Voice AI and phone configuration is valid',
          duration: 5000
        });
        
        // Log detailed results to console for debugging
        console.log('🔍 Setup Verification Results:', data);
      } else {
        toast.error('Setup verification failed', {
          id: toastId,
          description: data.errors.length > 0 
            ? data.errors[0] 
            : 'Please check your Voice AI and phone configuration',
          duration: 8000
        });
        
        // Log detailed errors to console
        console.error('❌ Setup Verification Errors:', data);
      }
    } catch (error: any) {
      toast.error('Verification error', {
        id: toastId,
        description: error.message || 'Failed to verify setup',
        duration: 5000
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleAgentCreated = () => {
    setShowCreateDialog(false);
    fetchAgents();
    fetchStats();
  };

  const handleCallScheduled = () => {
    setShowScheduleCallDialog(false);
    fetchOutboundCalls();
    fetchStats();
  };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
            Voice AI Agents
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your AI-powered phone receptionists
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleVerifySetup} 
            className="gap-2" 
            variant="outline"
            disabled={verifying}
          >
            <RefreshCw className={`w-4 h-4 ${verifying ? 'animate-spin' : ''}`} />
            {verifying ? 'Verifying...' : 'Verify Setup'}
          </Button>
          <Button 
            onClick={handleSyncPhoneNumbers} 
            className="gap-2" 
            variant="outline"
            disabled={syncingPhones}
          >
            <RefreshCw className={`w-4 h-4 ${syncingPhones ? 'animate-spin' : ''}`} />
            {syncingPhones ? 'Syncing...' : 'Sync Phone Numbers'}
          </Button>
          <Button onClick={() => setShowPurchaseDialog(true)} className="gap-2" variant="outline">
            <ShoppingCart className="w-4 h-4" />
            Buy Phone Number
          </Button>
          <Button onClick={() => setShowScheduleCallDialog(true)} className="gap-2" variant="outline">
            <PhoneOutgoing className="w-4 h-4" />
            Schedule Call
          </Button>
          <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Create Agent
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="p-6 bg-gray-900 rounded-xl border border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">
                Total Agents
              </p>
              <p className="text-3xl font-bold text-white mt-2">
                {agents.length}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="p-6 bg-gray-900 rounded-xl border border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">
                Active Agents
              </p>
              <p className="text-3xl font-bold text-white mt-2">
                {agents.filter((a) => a.status === 'ACTIVE').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-400" />
            </div>
          </div>
        </div>

        <div className="p-6 bg-gray-900 rounded-xl border border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">
                Total Calls
              </p>
              <p className="text-3xl font-bold text-white mt-2">
                {stats.totalCalls}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Phone className="w-6 h-6 text-purple-400" />
            </div>
          </div>
        </div>

        <div className="p-6 bg-gray-900 rounded-xl border border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">
                Scheduled Calls
              </p>
              <p className="text-3xl font-bold text-white mt-2">
                {stats.outboundScheduled}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <PhoneOutgoing className="w-6 h-6 text-orange-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs for Agents and Outbound Calls */}
      <Tabs defaultValue="agents" className="w-full">
        <TabsList>
          <TabsTrigger value="agents">
            <Users className="w-4 h-4 mr-2" />
            Voice Agents
          </TabsTrigger>
          <TabsTrigger value="outbound">
            <PhoneOutgoing className="w-4 h-4 mr-2" />
            Outbound Calls
            {stats.outboundScheduled > 0 && (
              <Badge className="ml-2" variant="secondary">
                {stats.outboundScheduled}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="usage">
            <BarChart3 className="w-4 h-4 mr-2" />
            Usage & Billing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="mt-6">
          <VoiceAgentsList 
            agents={agents}
            loading={loading}
            onAgentUpdated={fetchAgents}
          />
        </TabsContent>

        <TabsContent value="outbound" className="mt-6">
          <div className="p-6 bg-gray-900 rounded-xl border border-gray-800">
            <div className="space-y-4">
              {outboundCalls.length === 0 ? (
                <div className="text-center py-12">
                  <PhoneOutgoing className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">
                    No Outbound Calls Scheduled
                  </h3>
                  <p className="text-gray-400 mb-4">
                    Schedule your first outbound call to get started
                  </p>
                  <Button onClick={() => setShowScheduleCallDialog(true)} className="gap-2">
                    <PhoneOutgoing className="w-4 h-4" />
                    Schedule Call
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {outboundCalls.map((call) => (
                    <div
                      key={call.id}
                      className="flex items-center justify-between p-4 bg-gray-800/50 border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-white">{call.name}</h4>
                          <Badge variant={
                            call.status === 'COMPLETED' ? 'default' :
                            call.status === 'SCHEDULED' ? 'secondary' :
                            call.status === 'IN_PROGRESS' ? 'default' :
                            'destructive'
                          }>
                            {call.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-400">
                          {call.phoneNumber} • {call.voiceAgent?.name}
                        </p>
                        {call.purpose && (
                          <p className="text-sm text-gray-400 mt-1">{call.purpose}</p>
                        )}
                        {call.scheduledFor && (
                          <p className="text-xs text-gray-500 mt-1">
                            Scheduled: {new Date(call.scheduledFor).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {call.status === 'SCHEDULED' && (
                          <Button
                            size="sm"
                            onClick={async () => {
                              try {
                                await fetch(`/api/outbound-calls/${call.id}/initiate`, {
                                  method: 'POST',
                                });
                                fetchOutboundCalls();
                              } catch (err) {
                                console.error('Failed to initiate call:', err);
                              }
                            }}
                          >
                            <Phone className="w-4 h-4 mr-2" />
                            Call Now
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="usage" className="mt-6">
          <VoiceAIUsageDashboard />
        </TabsContent>
      </Tabs>

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
        onClose={() => {
          setShowPurchaseDialog(false);
          setInitialPhoneNumber(undefined); // Clear initial phone number
        }}
        onSuccess={(phoneNumber) => {
          console.log('Phone number purchased:', phoneNumber);
          setShowPurchaseDialog(false);
          setInitialPhoneNumber(undefined);
          fetchAgents(); // Refresh agents list
        }}
        onCreateVoiceAgent={(phoneNumber) => {
          console.log('Creating voice agent with number:', phoneNumber);
          setInitialPhoneNumber(phoneNumber);
          setShowPurchaseDialog(false);
          setShowCreateDialog(true);
        }}
      />
    </div>
  );
}
