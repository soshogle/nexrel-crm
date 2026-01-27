
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  TrendingUp,
  DollarSign,
  Target,
  MessageSquare,
  Calendar,
  Activity,
  Eye,
} from 'lucide-react';
import Link from 'next/link';

interface SubAccount {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
  image: string | null;
  metrics: {
    leads: number;
    deals: number;
    campaigns: number;
    conversations: number;
    appointments: number;
    voiceAgents: number;
    totalRevenue: number;
    conversionRate: number;
    recentActivity: number;
  };
}

interface Overview {
  totalSubAccounts: number;
  activeSubAccounts: number;
  totalRevenue: number;
  totalLeads: number;
  convertedLeads: number;
  overallConversionRate: number;
  totalCampaigns: number;
  totalConversations: number;
  totalAppointments: number;
}

export default function AdminDashboard() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [subAccounts, setSubAccounts] = useState<SubAccount[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
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

    fetchData();
  }, [session, status, router]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [subAccountsRes, overviewRes] = await Promise.all([
        fetch('/api/admin/sub-accounts'),
        fetch('/api/admin/overview'),
      ]);

      if (subAccountsRes.ok) {
        const data = await subAccountsRes.json();
        setSubAccounts(data.subAccounts || []);
      }

      if (overviewRes.ok) {
        const data = await overviewRes.json();
        setOverview(data.overview);
      }
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-7 w-16 mb-1" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage and monitor all sub-accounts in your agency
          </p>
        </div>
      </div>

      {/* Overview Stats */}
      {overview && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sub-Accounts</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.totalSubAccounts}</div>
              <p className="text-xs text-muted-foreground">
                {overview.activeSubAccounts} active in last 30 days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${overview.totalRevenue.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                From {overview.convertedLeads} converted leads
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.overallConversionRate}%</div>
              <p className="text-xs text-muted-foreground">
                {overview.convertedLeads} of {overview.totalLeads} leads
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Activity</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {overview.totalCampaigns + overview.totalConversations}
              </div>
              <p className="text-xs text-muted-foreground">
                Campaigns & conversations
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sub-Accounts List */}
      <Card>
        <CardHeader>
          <CardTitle>Sub-Accounts</CardTitle>
          <CardDescription>
            View and manage all sub-accounts under your agency
          </CardDescription>
        </CardHeader>
        <CardContent>
          {subAccounts.length === 0 ? (
            <div className="text-center py-10">
              <Users className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No sub-accounts yet</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Sub-accounts will appear here once they are created
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {subAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-lg font-semibold text-primary">
                        {account.name?.charAt(0) || account.email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{account.name || 'Unnamed'}</h4>
                        {account.metrics.recentActivity > 0 && (
                          <Badge variant="outline" className="text-xs">
                            <Activity className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{account.email}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-8 mr-8">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{account.metrics.leads}</div>
                      <div className="text-xs text-muted-foreground">Leads</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{account.metrics.deals}</div>
                      <div className="text-xs text-muted-foreground">Deals</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        ${account.metrics.totalRevenue.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">Revenue</div>
                    </div>
                  </div>

                  <Link href={`/dashboard/admin/sub-accounts/${account.id}`}>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
