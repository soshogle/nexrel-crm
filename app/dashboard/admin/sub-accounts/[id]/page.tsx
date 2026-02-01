
'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Users,
  Target,
  DollarSign,
  MessageSquare,
  Calendar,
  Phone,
  TrendingUp,
  Activity,
} from 'lucide-react';
import Link from 'next/link';

interface SubAccountDetails {
  subAccount: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    createdAt: string;
    updatedAt: string;
    agency: {
      id: string;
      name: string;
    } | null;
  };
  metrics: {
    leads: {
      total: number;
      converted: number;
      conversionRate: number;
    };
    deals: {
      total: number;
      won: number;
      winRate: number;
      totalRevenue: number;
    };
    campaigns: {
      total: number;
      active: number;
    };
    conversations: {
      total: number;
    };
    appointments: {
      total: number;
      completed: number;
    };
    voiceAgents: {
      total: number;
    };
  };
  recentActivity: {
    leads: Array<{
      id: string;
      businessName: string;
      status: string;
      createdAt: string;
    }>;
    deals: Array<{
      id: string;
      title: string;
      value: number | null;
      createdAt: string;
      stage: {
        name: string;
      };
    }>;
  };
}

export default function SubAccountDetailsPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const params = useParams();
  const [details, setDetails] = useState<SubAccountDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (session?.user?.role !== 'AGENCY_ADMIN' && session?.user?.role !== 'SUPER_ADMIN') {
      router.push('/dashboard');
      return;
    }

    fetchDetails();
  }, [session, status, router, params.id]);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/sub-accounts/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setDetails(data);
      }
    } catch (error) {
      console.error('Error fetching sub-account details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-7 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="text-center py-10">
        <h3 className="text-lg font-semibold">Sub-account not found</h3>
        <Link href="/dashboard/admin">
          <Button className="mt-4" variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/admin">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">
            {details.subAccount.name || 'Unnamed Account'}
          </h1>
          <p className="text-muted-foreground">{details.subAccount.email}</p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{details.metrics.leads.total}</div>
            <p className="text-xs text-muted-foreground">
              {details.metrics.leads.converted} converted ({details.metrics.leads.conversionRate}%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deals</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{details.metrics.deals.total}</div>
            <p className="text-xs text-muted-foreground">
              {details.metrics.deals.won} won ({details.metrics.deals.winRate}%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${details.metrics.deals.totalRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">From won deals</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Campaigns</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{details.metrics.campaigns.total}</div>
            <p className="text-xs text-muted-foreground">
              {details.metrics.campaigns.active} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversations</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{details.metrics.conversations.total}</div>
            <p className="text-xs text-muted-foreground">Total conversations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{details.metrics.appointments.total}</div>
            <p className="text-xs text-muted-foreground">
              {details.metrics.appointments.completed} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Voice Agents</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{details.metrics.voiceAgents.total}</div>
            <p className="text-xs text-muted-foreground">AI voice agents</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Leads</CardTitle>
            <CardDescription>Latest leads created by this sub-account</CardDescription>
          </CardHeader>
          <CardContent>
            {details.recentActivity.leads.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent leads</p>
            ) : (
              <div className="space-y-3">
                {details.recentActivity.leads.map((lead) => (
                  <div key={lead.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{lead.businessName}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(lead.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="outline">{lead.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Deals</CardTitle>
            <CardDescription>Latest deals created by this sub-account</CardDescription>
          </CardHeader>
          <CardContent>
            {details.recentActivity.deals.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent deals</p>
            ) : (
              <div className="space-y-3">
                {details.recentActivity.deals.map((deal) => (
                  <div key={deal.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{deal.title}</p>
                      <p className="text-xs text-muted-foreground">
                        ${deal.value?.toLocaleString() || 0} •{' '}
                        {new Date(deal.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="outline">{deal.stage.name}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
