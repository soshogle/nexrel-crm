'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  Mail,
  MoreVertical,
  Play,
  Pause,
  Edit,
  Trash,
  BarChart3,
  Users,
  Send,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

interface DripCampaign {
  id: string;
  name: string;
  description: string | null;
  status: string;
  triggerType: string;
  totalEnrolled: number;
  totalCompleted: number;
  avgOpenRate: number;
  avgClickRate: number;
  createdAt: string;
  sequences: any[];
  _count: {
    enrollments: number;
    sequences: number;
  };
}

export default function DripCampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<DripCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const response = await fetch('/api/campaigns/drip');
      if (response.ok) {
        const data = await response.json();
        setCampaigns(data);
      } else {
        toast.error('Failed to load campaigns');
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (campaignId: string) => {
    setActionLoading(campaignId);
    try {
      const response = await fetch(`/api/campaigns/drip/${campaignId}/activate`, {
        method: 'POST',
      });

      if (response.ok) {
        toast.success('Campaign activated successfully');
        fetchCampaigns();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to activate campaign');
      }
    } catch (error) {
      console.error('Error activating campaign:', error);
      toast.error('Failed to activate campaign');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePause = async (campaignId: string) => {
    setActionLoading(campaignId);
    try {
      const response = await fetch(`/api/campaigns/drip/${campaignId}/pause`, {
        method: 'POST',
      });

      if (response.ok) {
        toast.success('Campaign paused successfully');
        fetchCampaigns();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to pause campaign');
      }
    } catch (error) {
      console.error('Error pausing campaign:', error);
      toast.error('Failed to pause campaign');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) {
      return;
    }

    setActionLoading(campaignId);
    try {
      const response = await fetch(`/api/campaigns/drip/${campaignId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Campaign deleted successfully');
        fetchCampaigns();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete campaign');
      }
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast.error('Failed to delete campaign');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      DRAFT: 'secondary',
      ACTIVE: 'default',
      PAUSED: 'outline',
      COMPLETED: 'secondary',
      ARCHIVED: 'secondary',
    };

    return (
      <Badge variant={variants[status] || 'default'}>
        {status}
      </Badge>
    );
  };

  const getTriggerTypeLabel = (triggerType: string) => {
    const labels: Record<string, string> = {
      MANUAL: 'Manual',
      LEAD_CREATED: 'Lead Created',
      LEAD_STATUS: 'Lead Status',
      TAG_ADDED: 'Tag Added',
      FORM_SUBMITTED: 'Form Submitted',
      LIST_ADDED: 'List Added',
      SCHEDULED: 'Scheduled',
    };

    return labels[triggerType] || triggerType;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Email Drip Campaigns</h1>
          <p className="text-muted-foreground mt-1">
            Create automated email sequences to nurture leads
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard/campaigns/drip/create')}>
          <Plus className="h-4 w-4 mr-2" />
          New Drip Campaign
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No drip campaigns yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first email drip campaign to start nurturing leads
                automatically.
              </p>
              <Button onClick={() => router.push('/dashboard/campaigns/drip/create')}>
                <Plus className="h-4 w-4 mr-2" />
                Create Drip Campaign
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Campaigns
                </CardTitle>
                <Mail className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{campaigns.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Campaigns
                </CardTitle>
                <Play className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {campaigns.filter(c => c.status === 'ACTIVE').length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Enrolled
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {campaigns.reduce((sum, c) => sum + c.totalEnrolled, 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Avg Open Rate
                </CardTitle>
                <Send className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {campaigns.length > 0
                    ? Math.round(
                        campaigns.reduce((sum, c) => sum + c.avgOpenRate, 0) /
                          campaigns.length
                      )
                    : 0}%
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Campaigns Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Campaigns</CardTitle>
              <CardDescription>
                Manage and monitor your email drip campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Trigger</TableHead>
                    <TableHead>Sequences</TableHead>
                    <TableHead>Enrolled</TableHead>
                    <TableHead>Open Rate</TableHead>
                    <TableHead>Click Rate</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{campaign.name}</div>
                          {campaign.description && (
                            <div className="text-sm text-muted-foreground">
                              {campaign.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getTriggerTypeLabel(campaign.triggerType)}
                        </Badge>
                      </TableCell>
                      <TableCell>{campaign._count.sequences}</TableCell>
                      <TableCell>{campaign.totalEnrolled}</TableCell>
                      <TableCell>
                        {Math.round(campaign.avgOpenRate)}%
                      </TableCell>
                      <TableCell>
                        {Math.round(campaign.avgClickRate)}%
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(campaign.createdAt), {
                          addSuffix: true,
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={actionLoading === campaign.id}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(
                                  `/dashboard/campaigns/drip/${campaign.id}/analytics`
                                )
                              }
                            >
                              <BarChart3 className="h-4 w-4 mr-2" />
                              View Analytics
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(
                                  `/dashboard/campaigns/drip/${campaign.id}/edit`
                                )
                              }
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Campaign
                            </DropdownMenuItem>
                            {campaign.status === 'DRAFT' && (
                              <DropdownMenuItem
                                onClick={() => handleActivate(campaign.id)}
                              >
                                <Play className="h-4 w-4 mr-2" />
                                Activate
                              </DropdownMenuItem>
                            )}
                            {campaign.status === 'ACTIVE' && (
                              <DropdownMenuItem
                                onClick={() => handlePause(campaign.id)}
                              >
                                <Pause className="h-4 w-4 mr-2" />
                                Pause
                              </DropdownMenuItem>
                            )}
                            {campaign.status !== 'ACTIVE' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDelete(campaign.id)}
                                  className="text-destructive"
                                >
                                  <Trash className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
