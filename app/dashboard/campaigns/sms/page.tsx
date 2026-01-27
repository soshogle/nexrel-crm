'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  Plus,
  MessageSquare,
  Send,
  MoreVertical,
  Trash2,
  Eye,
  Loader2,
  AlertCircle,
  TrendingUp,
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  MessageCircle,
} from 'lucide-react';
import { format } from 'date-fns';

interface SmsCampaign {
  id: string;
  name: string;
  message: string;
  status: string;
  minLeadScore: number;
  dailyLimit: number | null;
  weeklyLimit: number | null;
  totalRecipients: number;
  totalSent: number;
  totalDelivered: number;
  totalReplied: number;
  totalFailed: number;
  sentToday: number;
  sentThisWeek: number;
  scheduledFor: string | null;
  sentAt: string | null;
  completedAt: string | null;
  createdAt: string;
  metrics?: {
    deliveryRate: string;
    replyRate: string;
  };
}

interface CampaignFormData {
  name: string;
  message: string;
  minLeadScore: number;
  dailyLimit: string;
  weeklyLimit: string;
}

export default function SmsCampaignsPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<SmsCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [highQualityLeadsCount, setHighQualityLeadsCount] = useState(0);

  const [formData, setFormData] = useState<CampaignFormData>({
    name: '',
    message: '',
    minLeadScore: 75,
    dailyLimit: '',
    weeklyLimit: '',
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchCampaigns();
      fetchHighQualityLeadsCount();
    }
  }, [status, filterStatus]);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStatus !== 'ALL') params.append('status', filterStatus);

      const response = await fetch(`/api/sms-campaigns?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch campaigns');

      const data = await response.json();
      setCampaigns(data.campaigns || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast.error('Failed to load SMS campaigns');
    } finally {
      setLoading(false);
    }
  };

  const fetchHighQualityLeadsCount = async () => {
    try {
      const response = await fetch('/api/leads/high-quality?minScore=75&hasPhone=true');
      if (!response.ok) throw new Error('Failed to fetch leads count');

      const data = await response.json();
      setHighQualityLeadsCount(data.totalCount || 0);
    } catch (error) {
      console.error('Error fetching high-quality leads count:', error);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.message.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.message.length > 160) {
      toast.error('Message must be 160 characters or less for a single SMS');
      return;
    }

    try {
      setCreating(true);

      const payload: any = {
        name: formData.name,
        message: formData.message,
        minLeadScore: formData.minLeadScore,
      };

      if (formData.dailyLimit) {
        payload.dailyLimit = parseInt(formData.dailyLimit);
      }
      if (formData.weeklyLimit) {
        payload.weeklyLimit = parseInt(formData.weeklyLimit);
      }

      const response = await fetch('/api/sms-campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create campaign');
      }

      toast.success('SMS campaign created successfully');
      setCreateDialogOpen(false);
      setFormData({
        name: '',
        message: '',
        minLeadScore: 75,
        dailyLimit: '',
        weeklyLimit: '',
      });
      fetchCampaigns();
    } catch (error: any) {
      console.error('Error creating campaign:', error);
      toast.error(error.message || 'Failed to create SMS campaign');
    } finally {
      setCreating(false);
    }
  };

  const handleSendCampaign = async (campaignId: string) => {
    try {
      setSending(campaignId);

      const response = await fetch(`/api/sms-campaigns/${campaignId}/send`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send campaign');
      }

      const data = await response.json();
      toast.success(
        `Campaign sent! Sent: ${data.sent}, Failed: ${data.failed}${data.skipped > 0 ? `, Skipped: ${data.skipped} (rate limit)` : ''}`
      );
      fetchCampaigns();
    } catch (error: any) {
      console.error('Error sending campaign:', error);
      toast.error(error.message || 'Failed to send SMS campaign');
    } finally {
      setSending(null);
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    try {
      const response = await fetch(`/api/sms-campaigns/${campaignId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete campaign');
      }

      toast.success('Campaign deleted successfully');
      fetchCampaigns();
    } catch (error: any) {
      console.error('Error deleting campaign:', error);
      toast.error(error.message || 'Failed to delete campaign');
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: any; icon: any }> = {
      DRAFT: { label: 'Draft', variant: 'secondary', icon: Clock },
      SCHEDULED: { label: 'Scheduled', variant: 'default', icon: Clock },
      SENDING: { label: 'Sending', variant: 'default', icon: Loader2 },
      SENT: { label: 'Sent', variant: 'success', icon: CheckCircle2 },
      PAUSED: { label: 'Paused', variant: 'warning', icon: AlertCircle },
      CANCELLED: { label: 'Cancelled', variant: 'destructive', icon: XCircle },
    };

    const config = statusMap[status] || statusMap.DRAFT;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">SMS Campaigns</h1>
          <p className="text-muted-foreground mt-1">
            Send targeted SMS messages to high-quality leads (score ≥ 75)
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <form onSubmit={handleCreateCampaign}>
              <DialogHeader>
                <DialogTitle>Create SMS Campaign</DialogTitle>
                <DialogDescription>
                  Create a new SMS campaign to send messages to high-quality leads.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Campaign Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Summer Promotion 2024"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message *</Label>
                  <Textarea
                    id="message"
                    placeholder="Write your SMS message here. You can use {name} or {businessName} for personalization."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    rows={4}
                    maxLength={160}
                    required
                  />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Use placeholders: {'{name}'} or {'{businessName}'}
                    </span>
                    <span
                      className={`${
                        formData.message.length > 160 ? 'text-destructive' : 'text-muted-foreground'
                      }`}
                    >
                      {formData.message.length}/160 characters
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="minLeadScore">Min Lead Score</Label>
                    <Select
                      value={formData.minLeadScore.toString()}
                      onValueChange={(value) =>
                        setFormData({ ...formData, minLeadScore: parseInt(value) })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="60">60+ (Good)</SelectItem>
                        <SelectItem value="70">70+ (High Quality)</SelectItem>
                        <SelectItem value="75">75+ (Excellent)</SelectItem>
                        <SelectItem value="80">80+ (Premium)</SelectItem>
                        <SelectItem value="90">90+ (Top Tier)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-muted-foreground">
                      Target Leads: {highQualityLeadsCount}
                    </Label>
                    <div className="text-sm text-muted-foreground">
                      Leads with score ≥ {formData.minLeadScore} and phone number
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Frequency Capping (Optional)</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dailyLimit">Daily Limit</Label>
                      <Input
                        id="dailyLimit"
                        type="number"
                        placeholder="Unlimited"
                        value={formData.dailyLimit}
                        onChange={(e) => setFormData({ ...formData, dailyLimit: e.target.value })}
                        min="1"
                      />
                      <p className="text-xs text-muted-foreground">
                        Max messages to send per day
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="weeklyLimit">Weekly Limit</Label>
                      <Input
                        id="weeklyLimit"
                        type="number"
                        placeholder="Unlimited"
                        value={formData.weeklyLimit}
                        onChange={(e) => setFormData({ ...formData, weeklyLimit: e.target.value })}
                        min="1"
                      />
                      <p className="text-xs text-muted-foreground">
                        Max messages to send per week
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateDialogOpen(false)}
                  disabled={creating}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Campaign'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Campaigns</CardTitle>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                <SelectItem value="SENDING">Sending</SelectItem>
                <SelectItem value="SENT">Sent</SelectItem>
                <SelectItem value="PAUSED">Paused</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No SMS Campaigns Yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first SMS campaign to reach high-quality leads
              </p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Campaign
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {campaigns.map((campaign) => (
                <Card key={campaign.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-xl">{campaign.name}</CardTitle>
                          {getStatusBadge(campaign.status)}
                        </div>
                        <CardDescription className="line-clamp-2">
                          {campaign.message}
                        </CardDescription>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => router.push(`/dashboard/campaigns/sms/${campaign.id}`)}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          {campaign.status === 'DRAFT' && (
                            <DropdownMenuItem onClick={() => handleSendCampaign(campaign.id)}>
                              <Send className="w-4 h-4 mr-2" />
                              Send Now
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => setDeleteConfirmId(campaign.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Target Leads</div>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{campaign.totalRecipients}</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Sent</div>
                        <div className="flex items-center gap-2">
                          <Send className="w-4 h-4 text-blue-500" />
                          <span className="font-medium">{campaign.totalSent}</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Delivered</div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          <span className="font-medium">
                            {campaign.totalDelivered} ({campaign.metrics?.deliveryRate || '0'}%)
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Replied</div>
                        <div className="flex items-center gap-2">
                          <MessageCircle className="w-4 h-4 text-purple-500" />
                          <span className="font-medium">
                            {campaign.totalReplied} ({campaign.metrics?.replyRate || '0'}%)
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Failed</div>
                        <div className="flex items-center gap-2">
                          <XCircle className="w-4 h-4 text-red-500" />
                          <span className="font-medium">{campaign.totalFailed}</span>
                        </div>
                      </div>
                    </div>

                    {(campaign.dailyLimit || campaign.weeklyLimit) && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="text-sm text-muted-foreground mb-2">Frequency Caps</div>
                        <div className="flex gap-4">
                          {campaign.dailyLimit && (
                            <div className="text-sm">
                              Daily: {campaign.sentToday}/{campaign.dailyLimit}
                            </div>
                          )}
                          {campaign.weeklyLimit && (
                            <div className="text-sm">
                              Weekly: {campaign.sentThisWeek}/{campaign.weeklyLimit}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="text-sm text-muted-foreground">
                    {campaign.sentAt
                      ? `Sent ${format(new Date(campaign.sentAt), 'PPp')}`
                      : `Created ${format(new Date(campaign.createdAt), 'PPp')}`}
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the campaign and all
              associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && handleDeleteCampaign(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
