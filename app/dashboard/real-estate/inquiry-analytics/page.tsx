'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users, TrendingUp, Building2, Globe, ArrowUpRight, Loader2,
  Mail, Phone, Calendar, BarChart3, Target,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

interface AnalyticsData {
  totalLeads: number;
  last30Days: number;
  last7Days: number;
  conversionRate: number;
  dailyTrend: Array<{ date: string; count: number }>;
  sources: Array<{ source: string; count: number }>;
  statuses: Array<{ status: string; count: number }>;
  propertyInquiries: Array<{
    propertyId: string; address: string; status: string;
    price: number | null; inquiryCount: number;
  }>;
  websiteLeads: Array<{ websiteId: string; name: string; domain: string | null; leadCount: number }>;
  recentLeads: Array<{
    id: string; businessName: string; contactPerson: string | null;
    email: string | null; phone: string | null; source: string;
    status: string; createdAt: string;
  }>;
}

const SOURCE_COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16'];
const STATUS_COLORS: Record<string, string> = {
  NEW: '#3b82f6', CONTACTED: '#f59e0b', QUALIFIED: '#10b981',
  CONVERTED: '#8b5cf6', WON: '#22c55e', LOST: '#ef4444',
  UNRESPONSIVE: '#6b7280',
};

function formatPrice(n: number | null) {
  if (!n) return '—';
  return '$' + n.toLocaleString();
}

export default function InquiryAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/real-estate/inquiry-analytics')
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-40">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-40 text-muted-foreground">Failed to load analytics</div>
    );
  }

  const chartData = data.dailyTrend.map(d => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    leads: d.count,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Inquiry Analytics</h1>
        <p className="text-muted-foreground">Lead attribution, source tracking, and listing performance</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data.totalLeads}</p>
            <p className="text-xs text-muted-foreground">{data.last30Days} in last 30 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">This Week</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data.last7Days}</p>
            <p className="text-xs text-muted-foreground">new leads</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Conversion Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data.conversionRate}%</p>
            <p className="text-xs text-muted-foreground">qualified or converted</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sources</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data.sources.length}</p>
            <p className="text-xs text-muted-foreground">unique lead sources</p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Trend + Source Breakdown */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Lead Volume (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis allowDecimals={false} className="text-xs" />
                <Tooltip />
                <Area type="monotone" dataKey="leads" stroke="#8b5cf6" fill="#8b5cf680" name="Leads" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lead Sources</CardTitle>
          </CardHeader>
          <CardContent>
            {data.sources.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">No source data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={data.sources} dataKey="count" nameKey="source" cx="50%" cy="50%" outerRadius={90} label={({ source, percent }) => `${source} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {data.sources.map((_, i) => (
                      <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lead Status + Website Attribution */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Lead Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {data.statuses.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">No leads yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.statuses} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="status" width={100} className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="count" name="Leads">
                    {data.statuses.map((s, i) => (
                      <Cell key={i} fill={STATUS_COLORS[s.status] || '#6b7280'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" /> Website Lead Attribution
            </CardTitle>
            <CardDescription>Leads generated from your websites</CardDescription>
          </CardHeader>
          <CardContent>
            {data.websiteLeads.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">No website leads tracked yet</p>
            ) : (
              <div className="space-y-3">
                {data.websiteLeads.map(w => (
                  <div key={w.websiteId} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium text-sm">{w.name}</p>
                      <p className="text-xs text-muted-foreground">{w.domain || 'No domain'}</p>
                    </div>
                    <Badge variant={w.leadCount > 0 ? 'default' : 'secondary'}>
                      {w.leadCount} lead{w.leadCount !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Property Inquiry Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" /> Listing Inquiry Performance
          </CardTitle>
          <CardDescription>Which properties are generating the most interest (last 30 days)</CardDescription>
        </CardHeader>
        <CardContent>
          {data.propertyInquiries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No property inquiries tracked yet. As leads come in with property addresses, they will be matched here.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium">Property</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium text-right">Price</th>
                    <th className="pb-2 font-medium text-right">Inquiries</th>
                  </tr>
                </thead>
                <tbody>
                  {data.propertyInquiries.map(p => (
                    <tr key={p.propertyId} className="border-b last:border-0">
                      <td className="py-2.5">{p.address}</td>
                      <td className="py-2.5">
                        <Badge variant="outline" className="text-xs">{p.status}</Badge>
                      </td>
                      <td className="py-2.5 text-right">{formatPrice(p.price)}</td>
                      <td className="py-2.5 text-right font-semibold">{p.inquiryCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Leads */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Leads</CardTitle>
          <CardDescription>Latest inquiries and leads</CardDescription>
        </CardHeader>
        <CardContent>
          {data.recentLeads.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No recent leads</p>
          ) : (
            <div className="space-y-2">
              {data.recentLeads.map(lead => (
                <div key={lead.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{lead.contactPerson || lead.businessName}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      {lead.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{lead.email}</span>}
                      {lead.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{lead.phone}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <Badge variant="outline" className="text-xs">{lead.source}</Badge>
                    <Badge variant="secondary" className="text-xs">{lead.status}</Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(lead.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
