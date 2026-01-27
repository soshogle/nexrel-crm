'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Phone,
  Plus,
  Play,
  Pause,
  Clock,
  Users,
  PhoneCall,
  PhoneOff,
  Timer,
  TrendingUp,
  Loader2,
  CheckCircle2,
  XCircle,
  Calendar,
  Target,
  Sparkles,
} from 'lucide-react';

interface VoiceAgent {
  id: string;
  name: string;
  description?: string;
  status: string;
}

interface VoiceCampaign {
  id: string;
  name: string;
  description?: string;
  status: string;
  totalRecipients: number;
  sentCount: number;
  totalCalls: number;
  answeredCalls: number;
  voicemails: number;
  avgCallDuration: number;
  minLeadScore: number;
  maxCallsPerDay: number;
  callWindowStart: string;
  callWindowEnd: string;
  createdAt: string;
  voiceAgent?: VoiceAgent;
}

export default function VoiceCampaignsPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<VoiceCampaign[]>([]);
  const [voiceAgents, setVoiceAgents] = useState<VoiceAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    voiceAgentId: '',
    minLeadScore: 75,
    maxCallsPerDay: 50,
    callWindowStart: '09:00',
    callWindowEnd: '17:00',
    retryFailedCalls: true,
    maxRetries: 2,
  });

  useEffect(() => {
    if (status === 'authenticated') {
      fetchVoiceCampaigns();
      fetchVoiceAgents();
    }
  }, [status]);

  const fetchVoiceCampaigns = async () => {
    try {
      const response = await fetch('/api/campaigns?type=VOICE_CALL');
      if (!response.ok) throw new Error('Failed to fetch campaigns');
      const data = await response.json();
      setCampaigns(data.campaigns || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const fetchVoiceAgents = async () => {
    try {
      const response = await fetch('/api/voice-agents');
      if (!response.ok) throw new Error('Failed to fetch voice agents');
      const data = await response.json();
      setVoiceAgents(data.voiceAgents || []);
    } catch (error) {
      console.error('Error fetching voice agents:', error);
    }
  };

  const handleCreateCampaign = async () => {
    try {
      if (!formData.name || !formData.voiceAgentId) {
        toast.error('Please fill in all required fields');
        return;
      }

      setProcessing(true);

      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          type: 'VOICE_CALL',
          voiceAgentId: formData.voiceAgentId,
          minLeadScore: formData.minLeadScore,
          maxCallsPerDay: formData.maxCallsPerDay,
          callWindowStart: formData.callWindowStart,
          callWindowEnd: formData.callWindowEnd,
          retryFailedCalls: formData.retryFailedCalls,
          maxRetries: formData.maxRetries,
          targetAudience: {
            minScore: formData.minLeadScore,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create campaign');
      }

      const data = await response.json();
      toast.success('Voice campaign created successfully!');
      setCreateDialogOpen(false);
      setFormData({
        name: '',
        description: '',
        voiceAgentId: '',
        minLeadScore: 75,
        maxCallsPerDay: 50,
        callWindowStart: '09:00',
        callWindowEnd: '17:00',
        retryFailedCalls: true,
        maxRetries: 2,
      });
      fetchVoiceCampaigns();
    } catch (error: any) {
      console.error('Error creating campaign:', error);
      toast.error(error.message || 'Failed to create campaign');
    } finally {
      setProcessing(false);
    }
  };

  const handleLaunchCampaign = async (campaignId: string) => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/execute`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to launch campaign');
      }

      toast.success('Voice campaign launched!');
      fetchVoiceCampaigns();
    } catch (error: any) {
      toast.error(error.message || 'Failed to launch campaign');
    }
  };

  const handleProcessCampaigns = async () => {
    try {
      setProcessing(true);
      const response = await fetch('/api/campaigns/voice/schedule', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to process campaigns');
      }

      const data = await response.json();
      toast.success(data.message || 'Campaigns processed successfully');
      fetchVoiceCampaigns();
    } catch (error: any) {
      toast.error(error.message || 'Failed to process campaigns');
    } finally {
      setProcessing(false);
    }
  };

  const stats = {
    total: campaigns.length,
    running: campaigns.filter((c) => c.status === 'RUNNING').length,
    totalCalls: campaigns.reduce((sum, c) => sum + c.totalCalls, 0),
    answeredCalls: campaigns.reduce((sum, c) => sum + c.answeredCalls, 0),
    avgAnswerRate:
      campaigns.length > 0
        ? campaigns.reduce(
            (sum, c) =>
              sum + (c.totalCalls > 0 ? (c.answeredCalls / c.totalCalls) * 100 : 0),
            0
          ) / campaigns.length
        : 0,
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text flex items-center gap-2">
            <Phone className="h-8 w-8" />
            Voice AI Campaigns
          </h1>
          <p className="text-gray-400 mt-1">
            Automated voice calling campaigns with intelligent scheduling
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleProcessCampaigns}
            variant="outline"
            disabled={processing}
          >
            {processing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Process Now
              </>
            )}
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)} className="gradient-button">
            <Plus className="mr-2 h-4 w-4" />
            Create Campaign
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Total Campaigns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{stats.total}</div>
              <Target className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-green-400">{stats.running}</div>
              <PhoneCall className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Total Calls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{stats.totalCalls}</div>
              <Phone className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Avg Answer Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{stats.avgAnswerRate.toFixed(1)}%</div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Voice Campaigns</CardTitle>
          <CardDescription>
            View and manage your automated voice calling campaigns
          </CardDescription>
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <div className="text-center py-12">
              <Phone className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-300 mb-2">
                No voice campaigns yet
              </h3>
              <p className="text-gray-400 mb-4">
                Create your first automated voice campaign to reach high-quality leads
              </p>
              <Button onClick={() => setCreateDialogOpen(true)} className="gradient-button">
                <Plus className="mr-2 h-4 w-4" />
                Create Campaign
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {campaigns.map((campaign) => (
                <Card
                  key={campaign.id}
                  className="bg-gray-800/50 border-gray-700 hover:border-purple-500/50 transition-colors"
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{campaign.name}</h3>
                          <Badge
                            variant={campaign.status === 'RUNNING' ? 'default' : 'secondary'}
                          >
                            {campaign.status}
                          </Badge>
                        </div>
                        {campaign.description && (
                          <p className="text-sm text-gray-400 mb-3">{campaign.description}</p>
                        )}
                      </div>
                      {campaign.status === 'DRAFT' && (
                        <Button
                          size="sm"
                          onClick={() => handleLaunchCampaign(campaign.id)}
                          className="gradient-button"
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Launch
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-3">
                      <div>
                        <div className="text-xs text-gray-500">Total Calls</div>
                        <div className="text-sm font-semibold flex items-center gap-1">
                          <PhoneCall className="h-4 w-4 text-blue-400" />
                          {campaign.totalCalls}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Answered</div>
                        <div className="text-sm font-semibold flex items-center gap-1">
                          <CheckCircle2 className="h-4 w-4 text-green-400" />
                          {campaign.answeredCalls}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Voicemails</div>
                        <div className="text-sm font-semibold flex items-center gap-1">
                          <PhoneOff className="h-4 w-4 text-yellow-400" />
                          {campaign.voicemails}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Avg Duration</div>
                        <div className="text-sm font-semibold flex items-center gap-1">
                          <Timer className="h-4 w-4 text-purple-400" />
                          {Math.floor(campaign.avgCallDuration / 60)}m{' '}
                          {campaign.avgCallDuration % 60}s
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Daily Limit</div>
                        <div className="text-sm font-semibold flex items-center gap-1">
                          <Clock className="h-4 w-4 text-orange-400" />
                          {campaign.maxCallsPerDay}/day
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Target className="h-3 w-3" />
                        Min Score: {campaign.minLeadScore}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {campaign.callWindowStart} - {campaign.callWindowEnd}
                      </div>
                      {campaign.voiceAgent && (
                        <div className="flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          {campaign.voiceAgent.name}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl glass-card">
          <DialogHeader>
            <DialogTitle className="gradient-text">Create Voice Campaign</DialogTitle>
            <DialogDescription>
              Set up an automated voice calling campaign for your high-quality leads
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Campaign Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Q4 High-Value Lead Outreach"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Automated calling campaign targeting leads with score 75+"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="voiceAgent">Voice Agent *</Label>
              <Select
                value={formData.voiceAgentId}
                onValueChange={(value) => setFormData({ ...formData, voiceAgentId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a voice agent" />
                </SelectTrigger>
                <SelectContent>
                  {voiceAgents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minLeadScore">Minimum Lead Score</Label>
                <Input
                  id="minLeadScore"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.minLeadScore}
                  onChange={(e) =>
                    setFormData({ ...formData, minLeadScore: parseInt(e.target.value) })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxCallsPerDay">Max Calls Per Day</Label>
                <Input
                  id="maxCallsPerDay"
                  type="number"
                  min="1"
                  value={formData.maxCallsPerDay}
                  onChange={(e) =>
                    setFormData({ ...formData, maxCallsPerDay: parseInt(e.target.value) })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="callWindowStart">Call Window Start</Label>
                <Input
                  id="callWindowStart"
                  type="time"
                  value={formData.callWindowStart}
                  onChange={(e) =>
                    setFormData({ ...formData, callWindowStart: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="callWindowEnd">Call Window End</Label>
                <Input
                  id="callWindowEnd"
                  type="time"
                  value={formData.callWindowEnd}
                  onChange={(e) => setFormData({ ...formData, callWindowEnd: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxRetries">Max Retry Attempts</Label>
              <Input
                id="maxRetries"
                type="number"
                min="0"
                max="5"
                value={formData.maxRetries}
                onChange={(e) =>
                  setFormData({ ...formData, maxRetries: parseInt(e.target.value) })
                }
              />
              <p className="text-xs text-gray-500">
                Number of times to retry failed calls
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateCampaign} disabled={processing} className="gradient-button">
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Campaign
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
