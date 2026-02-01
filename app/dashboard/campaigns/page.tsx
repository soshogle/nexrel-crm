'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import CreateCampaignWizard from '@/components/campaigns/create-campaign-wizard';
import {
  Plus,
  Mail,
  MessageSquare,
  TrendingUp,
  Users,
  Send,
  Play,
  Pause,
  MoreVertical,
  Trash2,
  Eye,
  Calendar,
  BarChart3,
  Sparkles,
  Loader2,
  AlertCircle,
  Phone,
} from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  description?: string;
  type: string;
  status: string;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  openedCount: number;
  clickedCount: number;
  openRate?: number;
  clickRate?: number;
  scheduledFor?: string;
  createdAt: string;
  aiGenerated: boolean;
  _count: {
    messages: number;
  };
}

export default function CampaignsPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchCampaigns();
    }
  }, [status, filterStatus, filterType]);

  const fetchCampaigns = async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (filterType !== 'all') params.append('type', filterType);

      const response = await fetch(`/api/campaigns?${params.toString()}`);
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

  const handleExecuteCampaign = async (campaignId: string) => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/execute`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to execute campaign');
      }

      const data = await response.json();
      toast.success(data.message || 'Campaign started successfully!');
      fetchCampaigns();
    } catch (error: any) {
      console.error('Error executing campaign:', error);
      toast.error(error.message || 'Failed to start campaign');
    }
  };

  const handlePauseCampaign = async (campaignId: string) => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/execute?action=pause`, {
        method: 'PATCH',
      });

      if (!response.ok) throw new Error('Failed to pause campaign');

      toast.success('Campaign paused');
      fetchCampaigns();
    } catch (error) {
      toast.error('Failed to pause campaign');
    }
  };

  const handleResumeCampaign = async (campaignId: string) => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/execute?action=resume`, {
        method: 'PATCH',
      });

      if (!response.ok) throw new Error('Failed to resume campaign');

      toast.success('Campaign resumed');
      fetchCampaigns();
    } catch (error) {
      toast.error('Failed to resume campaign');
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;

    try {
      const response = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete campaign');
      }

      toast.success('Campaign deleted successfully');
      fetchCampaigns();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete campaign');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any }> = {
      DRAFT: { variant: 'secondary', icon: Calendar },
      SCHEDULED: { variant: 'outline', icon: Calendar },
      RUNNING: { variant: 'default', icon: Play },
      PAUSED: { variant: 'secondary', icon: Pause },
      COMPLETED: { variant: 'default', icon: Send },
    };

    const config = variants[status] || variants.DRAFT;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant as any} className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
    const config: Record<string, { icon: any; color: string }> = {
      EMAIL: { icon: Mail, color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
      SMS: { icon: MessageSquare, color: 'bg-green-500/20 text-green-300 border-green-500/30' },
      VOICE_CALL: { icon: Phone, color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
      MULTI_CHANNEL: { icon: Send, color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
    };

    const { icon: Icon, color } = config[type] || config.EMAIL;

    return (
      <Badge className={`flex items-center gap-1 w-fit ${color}`}>
        <Icon className="h-3 w-3" />
        {type.replace('_', ' ')}
      </Badge>
    );
  };

  // Calculate overview stats
  const stats = {
    total: campaigns.length,
    active: campaigns.filter((c) => c.status === 'RUNNING').length,
    scheduled: campaigns.filter((c) => c.status === 'SCHEDULED').length,
    completed: campaigns.filter((c) => c.status === 'COMPLETED').length,
    totalSent: campaigns.reduce((sum, c) => sum + c.sentCount, 0),
    avgOpenRate: campaigns.length > 0
      ? campaigns.reduce((sum, c) => sum + (c.openRate || 0), 0) / campaigns.length
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Campaign Manager</h1>
          <p className="text-gray-400 mt-1">Create, manage, and track your marketing campaigns</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="gradient-button">
          <Plus className="mr-2 h-4 w-4" />
          Create Campaign
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{stats.total}</div>
              <BarChart3 className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-green-400">{stats.active}</div>
              <Play className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{stats.totalSent.toLocaleString()}</div>
              <Send className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Avg Open Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{(stats.avgOpenRate * 100).toFixed(1)}%</div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="SCHEDULED">Scheduled</SelectItem>
            <SelectItem value="RUNNING">Running</SelectItem>
            <SelectItem value="PAUSED">Paused</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="EMAIL">Email</SelectItem>
            <SelectItem value="SMS">SMS</SelectItem>
            <SelectItem value="VOICE_CALL">Voice Call</SelectItem>
            <SelectItem value="MULTI_CHANNEL">Multi-Channel</SelectItem>
          </SelectContent>
        </Select>
        
        <Button
          variant="outline"
          onClick={() => router.push('/dashboard/campaigns/voice')}
          className="border-purple-500/30 hover:border-purple-500"
        >
          <Phone className="mr-2 h-4 w-4" />
          Voice Campaigns
        </Button>
      </div>

      {/* Campaigns List */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Campaigns</CardTitle>
          <CardDescription>View and manage all your marketing campaigns</CardDescription>
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-300 mb-2">No campaigns yet</h3>
              <p className="text-gray-400 mb-4">
                Create your first AI-powered campaign to get started
              </p>
              <Button onClick={() => setCreateDialogOpen(true)} className="gradient-button">
                <Plus className="mr-2 h-4 w-4" />
                Create Campaign
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {campaigns.map((campaign) => (
                <Card key={campaign.id} className="bg-gray-800/50 border-gray-700 hover:border-purple-500/50 transition-colors">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{campaign.name}</h3>
                          {campaign.aiGenerated && (
                            <Badge variant="outline" className="text-purple-400 border-purple-500/30">
                              <Sparkles className="h-3 w-3 mr-1" />
                              AI
                            </Badge>
                          )}
                          {getStatusBadge(campaign.status)}
                          {getTypeBadge(campaign.type)}
                        </div>
                        
                        {campaign.description && (
                          <p className="text-sm text-gray-400 mb-3">{campaign.description}</p>
                        )}

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                          <div>
                            <div className="text-xs text-gray-500">Recipients</div>
                            <div className="text-sm font-semibold">{campaign.totalRecipients || 0}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">Sent</div>
                            <div className="text-sm font-semibold">{campaign.sentCount || 0}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">Opens</div>
                            <div className="text-sm font-semibold">
                              {campaign.openedCount || 0}
                              {campaign.openRate && (
                                <span className="text-xs text-gray-500 ml-1">
                                  ({(campaign.openRate * 100).toFixed(1)}%)
                                </span>
                              )}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">Clicks</div>
                            <div className="text-sm font-semibold">
                              {campaign.clickedCount || 0}
                              {campaign.clickRate && (
                                <span className="text-xs text-gray-500 ml-1">
                                  ({(campaign.clickRate * 100).toFixed(1)}%)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-xs text-gray-500">
                          Created {new Date(campaign.createdAt).toLocaleDateString()}
                          {campaign.scheduledFor && (
                            <> • Scheduled for {new Date(campaign.scheduledFor).toLocaleString()}</>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {campaign.status === 'DRAFT' && (
                          <Button
                            size="sm"
                            onClick={() => handleExecuteCampaign(campaign.id)}
                            className="gradient-button"
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Launch
                          </Button>
                        )}
                        {campaign.status === 'RUNNING' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePauseCampaign(campaign.id)}
                          >
                            <Pause className="h-4 w-4 mr-1" />
                            Pause
                          </Button>
                        )}
                        {campaign.status === 'PAUSED' && (
                          <Button
                            size="sm"
                            onClick={() => handleResumeCampaign(campaign.id)}
                            className="gradient-button"
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Resume
                          </Button>
                        )}

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => router.push(`/campaigns/${campaign.id}`)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteCampaign(campaign.id)}
                              className="text-red-400"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Campaign Wizard */}
      <CreateCampaignWizard
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCampaignCreated={fetchCampaigns}
      />
    </div>
  );
}
