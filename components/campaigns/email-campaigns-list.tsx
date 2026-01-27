
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Mail,
  Plus,
  Eye,
  Send,
  Trash2,
  Calendar,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Pause,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { CreateEmailCampaignDialog } from './create-email-campaign-dialog';

interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  status: string;
  scheduledFor: string | null;
  sentAt: string | null;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  openedCount: number;
  clickedCount: number;
  bouncedCount: number;
  createdAt: string;
}

export function EmailCampaignsList() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const response = await fetch('/api/campaigns/email');
      if (response.ok) {
        const data = await response.json();
        setCampaigns(data);
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const response = await fetch(`/api/campaigns/email/${deleteId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Campaign deleted successfully');
        fetchCampaigns();
      } else {
        toast.error('Failed to delete campaign');
      }
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast.error('Failed to delete campaign');
    } finally {
      setDeleteId(null);
    }
  };

  const handleSend = async (id: string) => {
    setSendingId(id);
    try {
      const response = await fetch(`/api/campaigns/email/${id}/send`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Campaign sent to ${data.sentCount} recipients`);
        fetchCampaigns();
      } else {
        toast.error('Failed to send campaign');
      }
    } catch (error) {
      console.error('Error sending campaign:', error);
      toast.error('Failed to send campaign');
    } finally {
      setSendingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      DRAFT: { label: 'Draft', className: 'bg-gray-100 text-gray-800' },
      SCHEDULED: { label: 'Scheduled', className: 'bg-blue-100 text-blue-800' },
      SENDING: { label: 'Sending', className: 'bg-yellow-100 text-yellow-800' },
      SENT: { label: 'Sent', className: 'bg-green-100 text-green-800' },
      PAUSED: { label: 'Paused', className: 'bg-orange-100 text-orange-800' },
      CANCELLED: { label: 'Cancelled', className: 'bg-red-100 text-red-800' },
    };

    const config = statusConfig[status] || statusConfig.DRAFT;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getOpenRate = (campaign: EmailCampaign) => {
    if (campaign.deliveredCount === 0) return '0%';
    return `${Math.round((campaign.openedCount / campaign.deliveredCount) * 100)}%`;
  };

  const getClickRate = (campaign: EmailCampaign) => {
    if (campaign.openedCount === 0) return '0%';
    return `${Math.round((campaign.clickedCount / campaign.openedCount) * 100)}%`;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="h-32 bg-muted" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Email Campaigns</h2>
            <p className="text-muted-foreground">
              Create and manage your email marketing campaigns
            </p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Campaign
          </Button>
        </div>

        {campaigns.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Mail className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No campaigns yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create your first email campaign to start engaging with your audience
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Campaign
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {campaigns.map((campaign) => (
              <Card key={campaign.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-xl">{campaign.name}</CardTitle>
                        {getStatusBadge(campaign.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">{campaign.subject}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/dashboard/campaigns/email/${campaign.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      {(campaign.status === 'DRAFT' || campaign.status === 'SCHEDULED') && (
                        <Button
                          size="sm"
                          onClick={() => handleSend(campaign.id)}
                          disabled={sendingId === campaign.id || campaign.totalRecipients === 0}
                        >
                          <Send className="h-4 w-4 mr-1" />
                          {sendingId === campaign.id ? 'Sending...' : 'Send Now'}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setDeleteId(campaign.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Recipients</p>
                        <p className="font-semibold">{campaign.totalRecipients}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="text-xs text-muted-foreground">Delivered</p>
                        <p className="font-semibold">{campaign.deliveredCount}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-blue-600" />
                      <div>
                        <p className="text-xs text-muted-foreground">Open Rate</p>
                        <p className="font-semibold">{getOpenRate(campaign)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-purple-600" />
                      <div>
                        <p className="text-xs text-muted-foreground">Click Rate</p>
                        <p className="font-semibold">{getClickRate(campaign)}</p>
                      </div>
                    </div>
                  </div>

                  {campaign.scheduledFor && (
                    <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Scheduled for {new Date(campaign.scheduledFor).toLocaleString()}
                      </span>
                    </div>
                  )}

                  {campaign.sentAt && (
                    <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>Sent on {new Date(campaign.sentAt).toLocaleString()}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <CreateEmailCampaignDialog
        open={showCreateDialog}
        onClose={() => {
          setShowCreateDialog(false);
          fetchCampaigns();
        }}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this campaign? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
