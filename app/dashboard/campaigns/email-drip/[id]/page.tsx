'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  Edit,
  Play,
  Pause,
  Trash2,
  Users,
  Mail,
  TrendingUp,
  BarChart3,
  Settings,
  UserPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
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
import EnrollLeadsDialog from './EnrollLeadsDialog';
import EmailDripAnalytics from './EmailDripAnalytics';

interface Campaign {
  id: string;
  name: string;
  description?: string;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED';
  triggerType: string;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
  totalEnrolled: number;
  totalCompleted: number;
  totalUnsubscribed: number;
  totalBounced: number;
  avgOpenRate: number;
  avgClickRate: number;
  avgReplyRate: number;
  enableAbTesting: boolean;
  tags?: string;
  createdAt: string;
  sequences: any[];
  enrollments: any[];
}

const statusColors = {
  DRAFT: 'bg-gray-100 text-gray-800',
  ACTIVE: 'bg-green-100 text-green-800',
  PAUSED: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-blue-100 text-blue-800',
  ARCHIVED: 'bg-gray-100 text-gray-600',
};

export default function CampaignDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEnrollDialog, setShowEnrollDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (id) {
      fetchCampaign();
    }
  }, [id]);

  const fetchCampaign = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/campaigns/drip/${id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch campaign');
      }

      const data = await response.json();
      setCampaign(data.campaign);
    } catch (error) {
      console.error('Error fetching campaign:', error);
      toast.error('Failed to load campaign details');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: 'ACTIVE' | 'PAUSED') => {
    try {
      setActionLoading(true);
      const endpoint = newStatus === 'PAUSED' ? 'pause' : 'activate';
      const response = await fetch(`/api/campaigns/drip/${id}/${endpoint}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Failed to ${endpoint} campaign`);
      }

      toast.success(`Campaign ${newStatus === 'PAUSED' ? 'paused' : 'activated'} successfully`);
      await fetchCampaign();
    } catch (error: any) {
      console.error('Error updating campaign status:', error);
      toast.error(error.message || 'Failed to update campaign status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setActionLoading(true);
      const response = await fetch(`/api/campaigns/drip/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete campaign');
      }

      toast.success('Campaign deleted successfully');
      router.push('/dashboard/campaigns/email-drip');
    } catch (error: any) {
      console.error('Error deleting campaign:', error);
      toast.error(error.message || 'Failed to delete campaign');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-gray-500 mt-4">Loading campaign...</p>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">Campaign not found</p>
            <Button
              onClick={() => router.push('/dashboard/campaigns/email-drip')}
              className="mt-4"
            >
              Back to Campaigns
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push('/dashboard/campaigns/email-drip')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Campaigns
        </Button>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{campaign.name}</h1>
              <Badge className={statusColors[campaign.status]}>
                {campaign.status}
              </Badge>
            </div>
            {campaign.description && (
              <p className="text-gray-500">{campaign.description}</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {campaign.status === 'DRAFT' && (
              <Button
                onClick={() => handleStatusChange('ACTIVE')}
                disabled={actionLoading}
              >
                <Play className="h-4 w-4 mr-2" />
                Activate
              </Button>
            )}
            {campaign.status === 'ACTIVE' && (
              <Button
                variant="outline"
                onClick={() => handleStatusChange('PAUSED')}
                disabled={actionLoading}
              >
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </Button>
            )}
            {campaign.status === 'PAUSED' && (
              <Button
                onClick={() => handleStatusChange('ACTIVE')}
                disabled={actionLoading}
              >
                <Play className="h-4 w-4 mr-2" />
                Resume
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setShowEnrollDialog(true)}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Enroll Leads
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/campaigns/email-drip/${id}/edit`)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(true)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enrolled Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaign.totalEnrolled}</div>
            <p className="text-xs text-muted-foreground">
              {campaign.totalCompleted} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaign.avgOpenRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Average across sequences
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Click Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaign.avgClickRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Of opened emails
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reply Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaign.avgReplyRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Direct responses
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="sequences" className="w-full">
        <TabsList>
          <TabsTrigger value="sequences">Email Sequences ({campaign.sequences?.length || 0})</TabsTrigger>
          <TabsTrigger value="enrollments">Enrollments ({campaign.totalEnrolled})</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="sequences" className="mt-6">
          <div className="space-y-4">
            {campaign.sequences?.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No email sequences configured yet</p>
                </CardContent>
              </Card>
            ) : (
              campaign.sequences?.map((sequence: any) => (
                <Card key={sequence.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">
                          {sequence.name}
                          {sequence.sequenceOrder > 1 && (
                            <span className="text-sm font-normal text-gray-500 ml-2">
                              (Day {sequence.delayDays}, +{sequence.delayHours}h)
                            </span>
                          )}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {sequence.subject}
                        </CardDescription>
                      </div>
                      <Badge variant="outline">
                        Step {sequence.sequenceOrder}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Sent</p>
                        <p className="font-semibold">{sequence.totalSent}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Delivered</p>
                        <p className="font-semibold">{sequence.totalDelivered}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Opened</p>
                        <p className="font-semibold">
                          {sequence.totalOpened}
                          {sequence.totalSent > 0 && (
                            <span className="text-gray-500 ml-1">
                              ({((sequence.totalOpened / sequence.totalSent) * 100).toFixed(1)}%)
                            </span>
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Clicked</p>
                        <p className="font-semibold">
                          {sequence.totalClicked}
                          {sequence.totalOpened > 0 && (
                            <span className="text-gray-500 ml-1">
                              ({((sequence.totalClicked / sequence.totalOpened) * 100).toFixed(1)}%)
                            </span>
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Replied</p>
                        <p className="font-semibold">{sequence.totalReplied}</p>
                      </div>
                    </div>
                    {sequence.previewText && (
                      <p className="text-sm text-gray-500 mt-3 border-t pt-3">
                        {sequence.previewText}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="enrollments" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Enrolled Leads</CardTitle>
              <CardDescription>
                Leads currently enrolled in this campaign
              </CardDescription>
            </CardHeader>
            <CardContent>
              {campaign.enrollments?.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">No leads enrolled yet</p>
                  <Button onClick={() => setShowEnrollDialog(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Enroll Leads
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {campaign.enrollments?.slice(0, 10).map((enrollment: any) => (
                    <div
                      key={enrollment.id}
                      className="flex justify-between items-center p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">Lead #{enrollment.leadId}</p>
                        <p className="text-sm text-gray-500">
                          Step {enrollment.currentStep} • 
                          {enrollment.nextSendAt && (
                            <> Next: {format(new Date(enrollment.nextSendAt), 'MMM d, h:mm a')}</>
                          )}
                        </p>
                      </div>
                      <Badge variant="outline">{enrollment.status}</Badge>
                    </div>
                  ))}
                  {campaign.enrollments && campaign.enrollments.length > 10 && (
                    <p className="text-sm text-gray-500 text-center pt-2">
                      And {campaign.enrollments.length - 10} more...
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <EmailDripAnalytics campaignId={id} />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Settings</CardTitle>
              <CardDescription>
                Configuration and sender information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Trigger Type</p>
                  <p className="font-medium">{campaign.triggerType}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">From Name</p>
                  <p className="font-medium">{campaign.fromName || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">From Email</p>
                  <p className="font-medium">{campaign.fromEmail || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Reply-To</p>
                  <p className="font-medium">{campaign.replyTo || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">A/B Testing</p>
                  <p className="font-medium">{campaign.enableAbTesting ? 'Enabled' : 'Disabled'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Tags</p>
                  <p className="font-medium">{campaign.tags || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Created</p>
                  <p className="font-medium">{format(new Date(campaign.createdAt), 'MMM d, yyyy')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <EnrollLeadsDialog
        campaignId={id}
        isOpen={showEnrollDialog}
        onClose={() => setShowEnrollDialog(false)}
        onSuccess={() => {
          fetchCampaign();
          setShowEnrollDialog(false);
        }}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the campaign &quot;{campaign.name}&quot; and all its data.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Campaign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
