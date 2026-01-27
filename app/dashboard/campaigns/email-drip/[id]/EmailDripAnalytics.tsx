'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TrendingUp, Mail, MousePointer, Reply, Users } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface AnalyticsData {
  totalEnrolled: number;
  activeEnrollments: number;
  completedEnrollments: number;
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  totalReplied: number;
  totalBounced: number;
  totalUnsubscribed: number;
  openRate: number;
  clickRate: number;
  replyRate: number;
  bounceRate: number;
  unsubscribeRate: number;
  sequencePerformance: Array<{
    sequenceOrder: number;
    name: string;
    subject: string;
    totalSent: number;
    totalOpened: number;
    totalClicked: number;
    totalReplied: number;
    openRate: number;
    clickRate: number;
  }>;
}

interface EmailDripAnalyticsProps {
  campaignId: string;
}

export default function EmailDripAnalytics({ campaignId }: EmailDripAnalyticsProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [campaignId]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/campaigns/drip/${campaignId}/analytics`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const data = await response.json();
      setAnalytics(data.analytics);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="text-gray-500 mt-4">Loading analytics...</p>
      </div>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-gray-500">No analytics data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalSent}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.totalDelivered} delivered ({((analytics.totalDelivered / analytics.totalSent) * 100).toFixed(1)}%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.openRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {analytics.totalOpened} opens
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Click Rate</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.clickRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {analytics.totalClicked} clicks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reply Rate</CardTitle>
            <Reply className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.replyRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {analytics.totalReplied} replies
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Enrollment Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Enrollment Statistics</CardTitle>
          <CardDescription>Lead engagement and progression</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Total Enrolled</p>
              <p className="text-2xl font-bold">{analytics.totalEnrolled}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Active</p>
              <p className="text-2xl font-bold text-green-600">{analytics.activeEnrollments}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Completed</p>
              <p className="text-2xl font-bold text-blue-600">{analytics.completedEnrollments}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Unsubscribed</p>
              <p className="text-2xl font-bold text-red-600">{analytics.totalUnsubscribed}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sequence Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Sequence Performance</CardTitle>
          <CardDescription>Individual email metrics</CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.sequencePerformance.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No data available yet</p>
          ) : (
            <div className="space-y-4">
              {analytics.sequencePerformance.map((seq) => (
                <div key={seq.sequenceOrder} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold">
                        {seq.name}
                        <span className="text-sm font-normal text-gray-500 ml-2">
                          (Step {seq.sequenceOrder})
                        </span>
                      </h4>
                      <p className="text-sm text-gray-600">{seq.subject}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Sent</p>
                      <p className="font-semibold">{seq.totalSent}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Opens</p>
                      <p className="font-semibold">
                        {seq.totalOpened}
                        <span className="text-gray-500 ml-1">({seq.openRate.toFixed(1)}%)</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Clicks</p>
                      <p className="font-semibold">
                        {seq.totalClicked}
                        <span className="text-gray-500 ml-1">({seq.clickRate.toFixed(1)}%)</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Replies</p>
                      <p className="font-semibold">{seq.totalReplied}</p>
                    </div>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="mt-3 space-y-2">
                    <div>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Open Rate</span>
                        <span>{seq.openRate.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${Math.min(seq.openRate, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Click Rate</span>
                        <span>{seq.clickRate.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${Math.min(seq.clickRate, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Bounce Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.bounceRate.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground">
              {analytics.totalBounced} bounced emails
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Unsubscribe Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.unsubscribeRate.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground">
              {analytics.totalUnsubscribed} unsubscribed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.totalEnrolled > 0
                ? ((analytics.completedEnrollments / analytics.totalEnrolled) * 100).toFixed(1)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics.completedEnrollments} of {analytics.totalEnrolled} completed
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
