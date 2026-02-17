'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Phone,
  Mail,
  MessageSquare,
  ArrowRight,
  Workflow,
  Sparkles,
  Plus,
  Play,
  Target,
  PhoneCall,
  TrendingUp,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

interface VoiceCampaign {
  id: string;
  name: string;
  description?: string;
  status: string;
  totalCalls: number;
  answeredCalls: number;
  voicemails?: number;
  avgCallDuration?: number;
}

interface DripCampaign {
  id: string;
  name: string;
  description?: string;
  status: string;
  totalEnrolled?: number;
  totalCompleted?: number;
  avgOpenRate?: number;
  avgClickRate?: number;
  avgReplyRate?: number;
}

type CampaignItem =
  | { type: 'voice'; data: VoiceCampaign }
  | { type: 'email-drip'; data: DripCampaign }
  | { type: 'sms-drip'; data: DripCampaign };

export default function CampaignsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [voiceCampaigns, setVoiceCampaigns] = useState<VoiceCampaign[]>([]);
  const [emailCampaigns, setEmailCampaigns] = useState<DripCampaign[]>([]);
  const [smsCampaigns, setSmsCampaigns] = useState<DripCampaign[]>([]);

  useEffect(() => {
    fetchAllCampaigns();
  }, []);

  const fetchAllCampaigns = async () => {
    try {
      setLoading(true);
      const [voiceRes, emailRes, smsRes] = await Promise.all([
        fetch('/api/campaigns?type=VOICE_CALL'),
        fetch('/api/campaigns/drip'),
        fetch('/api/campaigns/sms-drip'),
      ]);

      if (voiceRes.ok) {
        const d = await voiceRes.json();
        setVoiceCampaigns(d.campaigns || []);
      }
      if (emailRes.ok) {
        const d = await emailRes.json();
        setEmailCampaigns(Array.isArray(d) ? d : d.campaigns || []);
      }
      if (smsRes.ok) {
        const d = await smsRes.json();
        setSmsCampaigns(d.campaigns || []);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessVoice = async () => {
    try {
      setProcessing(true);
      const res = await fetch('/api/campaigns/voice/schedule', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to process');
      const data = await res.json();
      toast.success(data.message || 'Campaigns processed');
      fetchAllCampaigns();
    } catch (e) {
      toast.error('Failed to process campaigns');
    } finally {
      setProcessing(false);
    }
  };

  const stats = {
    total: voiceCampaigns.length + emailCampaigns.length + smsCampaigns.length,
    active:
      voiceCampaigns.filter((c) => c.status === 'RUNNING').length +
      emailCampaigns.filter((c) => c.status === 'ACTIVE').length +
      smsCampaigns.filter((c) => c.status === 'ACTIVE').length,
    totalCalls: voiceCampaigns.reduce((s, c) => s + (c.totalCalls || 0), 0),
    answeredCalls: voiceCampaigns.reduce((s, c) => s + (c.answeredCalls || 0), 0),
    avgAnswerRate:
      voiceCampaigns.length > 0
        ? voiceCampaigns.reduce(
            (s, c) =>
              s + (c.totalCalls ? ((c.answeredCalls || 0) / c.totalCalls) * 100 : 0),
            0
          ) / voiceCampaigns.length
        : 0,
  };

  const allCampaigns: CampaignItem[] = [
    ...voiceCampaigns.map((d) => ({ type: 'voice' as const, data: d })),
    ...emailCampaigns.map((d) => ({ type: 'email-drip' as const, data: d })),
    ...smsCampaigns.map((d) => ({ type: 'sms-drip' as const, data: d })),
  ].sort(
    (a, b) =>
      new Date((b.data as any).createdAt || 0).getTime() -
      new Date((a.data as any).createdAt || 0).getTime()
  );

  const getCampaignLink = (item: CampaignItem) => {
    if (item.type === 'voice') return `/dashboard/campaigns/${item.data.id}`;
    if (item.type === 'email-drip') return `/dashboard/campaigns/email-drip/${item.data.id}`;
    return `/dashboard/campaigns/sms-drip/${item.data.id}`;
  };

  const getTypeBadge = (type: CampaignItem['type']) => {
    const config = {
      voice: { label: 'Voice', icon: Phone, color: 'bg-purple-100 text-purple-800' },
      'email-drip': { label: 'Email', icon: Mail, color: 'bg-green-100 text-green-800' },
      'sms-drip': { label: 'SMS', icon: MessageSquare, color: 'bg-orange-100 text-orange-800' },
    };
    return config[type];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Campaigns</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage email, SMS, and voice campaigns
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleProcessVoice}
            disabled={processing || voiceCampaigns.length === 0}
          >
            {processing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Process Now
          </Button>
          <Button onClick={() => router.push('/dashboard/campaigns/builder')}>
            <Plus className="h-4 w-4 mr-2" />
            Create Campaign
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
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
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
              <PhoneCall className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
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
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
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

      {/* Campaign type cards - all go to builder */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card
          className="hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => router.push('/dashboard/campaigns/builder?type=voice')}
        >
          <CardHeader>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-2">
              <Phone className="h-6 w-6 text-purple-600" />
            </div>
            <CardTitle>Voice Campaigns</CardTitle>
            <CardDescription>
              Automated AI voice calling campaigns with intelligent scheduling
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="ghost" className="w-full justify-between">
              Open Canvas Builder
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card
          className="hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => router.push('/dashboard/campaigns/builder?type=email-drip')}
        >
          <CardHeader>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-2">
              <Mail className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle>Email Drip Campaigns</CardTitle>
            <CardDescription>
              Multi-step email sequences with triggers and A/B testing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="ghost" className="w-full justify-between">
              Open Canvas Builder
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card
          className="hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => router.push('/dashboard/campaigns/builder?type=sms-drip')}
        >
          <CardHeader>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-2">
              <MessageSquare className="h-6 w-6 text-orange-600" />
            </div>
            <CardTitle>SMS Drip Campaigns</CardTitle>
            <CardDescription>
              Automated SMS sequences with reply tracking
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="ghost" className="w-full justify-between">
              Open Canvas Builder
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Campaign list */}
      <Card>
        <CardHeader>
          <CardTitle>All Campaigns</CardTitle>
          <CardDescription>
            View and manage your campaigns. Click to open details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {allCampaigns.length === 0 ? (
            <div className="text-center py-12">
              <Workflow className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No campaigns yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first campaign to reach leads with email, SMS, or voice
              </p>
              <Button onClick={() => router.push('/dashboard/campaigns/builder')}>
                <Plus className="h-4 w-4 mr-2" />
                Create Campaign
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {allCampaigns.map((item) => {
                const cfg = getTypeBadge(item.type);
                const Icon = cfg.icon;
                return (
                  <Card
                    key={`${item.type}-${item.data.id}`}
                    className="hover:border-purple-300 transition-colors cursor-pointer"
                    onClick={() => router.push(getCampaignLink(item))}
                  >
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center ${cfg.color}`}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{item.data.name}</h3>
                            {item.data.description && (
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {item.data.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{cfg.label}</Badge>
                          <Badge
                            variant={
                              item.data.status === 'ACTIVE' || item.data.status === 'RUNNING'
                                ? 'default'
                                : 'outline'
                            }
                          >
                            {item.data.status}
                          </Badge>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
