'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Send,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  MessageCircle,
  TrendingUp,
  Users,
  AlertCircle,
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
  recipients?: CampaignRecipient[];
}

interface CampaignRecipient {
  id: string;
  recipientPhone: string;
  recipientName: string | null;
  status: string;
  sentAt: string | null;
  deliveredAt: string | null;
  repliedAt: string | null;
  errorMessage: string | null;
  lead?: {
    id: string;
    businessName: string;
    contactPerson: string | null;
    phone: string;
    leadScore: number;
  } | null;
}

export default function SmsCampaignDetailPage() {
  const params = useParams();
  const campaignId = params?.id as string;
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [campaign, setCampaign] = useState<SmsCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated' && campaignId) {
      fetchCampaign();
    }
  }, [status, campaignId]);

  const fetchCampaign = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/sms-campaigns/${campaignId}`);
      if (!response.ok) throw new Error('Failed to fetch campaign');

      const data = await response.json();
      setCampaign(data.campaign);
    } catch (error) {
      console.error('Error fetching campaign:', error);
      toast.error('Failed to load campaign details');
      router.push('/dashboard/campaigns/sms');
    } finally {
      setLoading(false);
    }
  };

  const handleSendCampaign = async () => {
    if (!campaign) return;

    try {
      setSending(true);

      const response = await fetch(`/api/sms-campaigns/${campaign.id}/send`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send campaign');
      }

      const data = await response.json();
      toast.success(
        `Campaign sent! Sent: ${data.sent}, Failed: ${data.failed}${
          data.skipped > 0 ? `, Skipped: ${data.skipped}` : ''
        }`
      );
      fetchCampaign();
    } catch (error: any) {
      console.error('Error sending campaign:', error);
      toast.error(error.message || 'Failed to send SMS campaign');
    } finally {
      setSending(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: any; icon: any }> = {
      PENDING: { label: 'Pending', variant: 'secondary', icon: Clock },
      SENDING: { label: 'Sending', variant: 'default', icon: Loader2 },
      SENT: { label: 'Sent', variant: 'default', icon: Send },
      DELIVERED: { label: 'Delivered', variant: 'success', icon: CheckCircle2 },
      REPLIED: { label: 'Replied', variant: 'success', icon: MessageCircle },
      FAILED: { label: 'Failed', variant: 'destructive', icon: XCircle },
    };

    const config = statusMap[status] || statusMap.PENDING;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const getCampaignStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: any }> = {
      DRAFT: { label: 'Draft', variant: 'secondary' },
      SCHEDULED: { label: 'Scheduled', variant: 'default' },
      SENDING: { label: 'Sending', variant: 'default' },
      SENT: { label: 'Sent', variant: 'success' },
      PAUSED: { label: 'Paused', variant: 'warning' },
      CANCELLED: { label: 'Cancelled', variant: 'destructive' },
    };

    const config = statusMap[status] || statusMap.DRAFT;

    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!campaign) {
    return null;
  }

  const deliveryRate =
    campaign.totalSent > 0
      ? ((campaign.totalDelivered / campaign.totalSent) * 100).toFixed(1)
      : '0';
  const replyRate =
    campaign.totalDelivered > 0
      ? ((campaign.totalReplied / campaign.totalDelivered) * 100).toFixed(1)
      : '0';

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold">{campaign.name}</h1>
              {getCampaignStatusBadge(campaign.status)}
            </div>
            <p className="text-muted-foreground">Campaign Details & Recipients</p>
          </div>
        </div>
        {campaign.status === 'DRAFT' && (
          <Button onClick={handleSendCampaign} disabled={sending}>
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send Campaign
              </>
            )}
          </Button>
        )}
      </div>

      {/* Campaign Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Campaign Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Message</div>
              <div className="p-3 bg-muted rounded-md">{campaign.message}</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Min Lead Score</div>
                <div className="font-medium">{campaign.minLeadScore}+</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Target Leads</div>
                <div className="font-medium">{campaign.totalRecipients}</div>
              </div>
            </div>
            {(campaign.dailyLimit || campaign.weeklyLimit) && (
              <div>
                <div className="text-sm text-muted-foreground mb-2">Frequency Caps</div>
                <div className="space-y-1">
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
            <div className="pt-2 border-t">
              <div className="text-sm text-muted-foreground">
                Created {format(new Date(campaign.createdAt), 'PPp')}
              </div>
              {campaign.sentAt && (
                <div className="text-sm text-muted-foreground">
                  Sent {format(new Date(campaign.sentAt), 'PPp')}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Campaign Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm">Total Recipients</span>
                </div>
                <span className="font-semibold">{campaign.totalRecipients}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950 rounded-md">
                <div className="flex items-center gap-2">
                  <Send className="w-5 h-5 text-blue-500" />
                  <span className="text-sm">Sent</span>
                </div>
                <span className="font-semibold">{campaign.totalSent}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 rounded-md">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-sm">Delivered</span>
                </div>
                <span className="font-semibold">
                  {campaign.totalDelivered} ({deliveryRate}%)
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-950 rounded-md">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-purple-500" />
                  <span className="text-sm">Replied</span>
                </div>
                <span className="font-semibold">
                  {campaign.totalReplied} ({replyRate}%)
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950 rounded-md">
                <div className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-500" />
                  <span className="text-sm">Failed</span>
                </div>
                <span className="font-semibold">{campaign.totalFailed}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recipients Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recipients ({campaign.recipients?.length || 0})</CardTitle>
          <CardDescription>
            View all recipients and their message delivery status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!campaign.recipients || campaign.recipients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="w-12 h-12 mx-auto mb-3" />
              <p>No recipients yet. Send the campaign to see recipients here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Lead Score</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent At</TableHead>
                    <TableHead>Delivered At</TableHead>
                    <TableHead>Replied At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaign.recipients.map((recipient) => (
                    <TableRow key={recipient.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {recipient.recipientName ||
                              recipient.lead?.contactPerson ||
                              recipient.lead?.businessName ||
                              'Unknown'}
                          </div>
                          {recipient.lead?.businessName && recipient.recipientName && (
                            <div className="text-sm text-muted-foreground">
                              {recipient.lead.businessName}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{recipient.recipientPhone}</TableCell>
                      <TableCell>
                        {recipient.lead?.leadScore ? (
                          <Badge variant="outline">{recipient.lead.leadScore}</Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(recipient.status)}</TableCell>
                      <TableCell>
                        {recipient.sentAt ? format(new Date(recipient.sentAt), 'Pp') : '-'}
                      </TableCell>
                      <TableCell>
                        {recipient.deliveredAt
                          ? format(new Date(recipient.deliveredAt), 'Pp')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {recipient.repliedAt ? format(new Date(recipient.repliedAt), 'Pp') : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
