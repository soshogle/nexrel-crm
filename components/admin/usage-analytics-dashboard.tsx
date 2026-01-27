'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Phone,
  MessageSquare,
  Mail,
  Brain,
  HardDrive,
  DollarSign,
  TrendingUp,
  Users,
  RefreshCw,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

interface UsageStats {
  user: {
    id: string;
    name: string | null;
    email: string;
    role: string;
    industry: string | null;
    businessCategory: string | null;
  };
  calls: {
    total: number;
    completed: number;
    inbound: number;
    outbound: number;
    totalMinutes: number;
    estimatedCost: number;
  };
  sms: {
    total: number;
    inbound: number;
    outbound: number;
    estimatedCost: number;
  };
  emails: {
    total: number;
    inbound: number;
    outbound: number;
    estimatedCost: number;
  };
  ai: {
    estimatedTokens: number;
    estimatedCost: number;
  };
  storage: {
    recordings: number;
    sizeGB: number;
    estimatedCost: number;
  };
  voiceAgents: number;
  totalCost: number;
  dailyBreakdown: Array<{
    date: string;
    calls: number;
    sms: number;
    emails: number;
  }>;
}

interface UsageResponse {
  period: string;
  startDate: string;
  endDate: string;
  users: UsageStats[];
}

export default function UsageAnalyticsDashboard() {
  const [usageData, setUsageData] = useState<UsageResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState('30d');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchUsageData();
  }, [period]);

  const fetchUsageData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/platform-admin/usage?period=${period}`);
      if (!response.ok) {
        throw new Error('Failed to fetch usage data');
      }
      const data = await response.json();
      setUsageData(data);
    } catch (error: any) {
      console.error('Error fetching usage data:', error);
      toast.error('Failed to load usage analytics');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTotals = () => {
    if (!usageData) return null;

    const totals = usageData.users.reduce(
      (acc, user) => ({
        calls: acc.calls + user.calls.total,
        callMinutes: acc.callMinutes + user.calls.totalMinutes,
        sms: acc.sms + user.sms.total,
        emails: acc.emails + user.emails.total,
        aiTokens: acc.aiTokens + user.ai.estimatedTokens,
        storageGB: acc.storageGB + user.storage.sizeGB,
        totalCost: acc.totalCost + user.totalCost,
        callCost: acc.callCost + user.calls.estimatedCost,
        smsCost: acc.smsCost + user.sms.estimatedCost,
        emailCost: acc.emailCost + user.emails.estimatedCost,
        aiCost: acc.aiCost + user.ai.estimatedCost,
        storageCost: acc.storageCost + user.storage.estimatedCost,
      }),
      {
        calls: 0,
        callMinutes: 0,
        sms: 0,
        emails: 0,
        aiTokens: 0,
        storageGB: 0,
        totalCost: 0,
        callCost: 0,
        smsCost: 0,
        emailCost: 0,
        aiCost: 0,
        storageCost: 0,
      }
    );

    return totals;
  };

  const totals = calculateTotals();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold gradient-text">Usage Analytics</h2>
          <p className="text-black font-semibold mt-1">Monitor platform usage and costs across all businesses</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32 bg-gray-800 border-gray-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchUsageData}
            className="bg-gray-800 border-gray-700 text-white"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Platform-Wide Summary Cards */}
      {totals && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Phone className="h-5 w-5 text-blue-400" />
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                  ${totals.callCost.toFixed(2)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-black">{totals.calls.toLocaleString()}</div>
              <p className="text-xs text-gray-400 mt-1">
                Total Calls · {totals.callMinutes.toLocaleString()} min
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <MessageSquare className="h-5 w-5 text-green-400" />
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  ${totals.smsCost.toFixed(2)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-black">{totals.sms.toLocaleString()}</div>
              <p className="text-xs text-gray-400 mt-1">Total SMS Messages</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Mail className="h-5 w-5 text-purple-400" />
                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                  ${totals.emailCost.toFixed(2)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-black">{totals.emails.toLocaleString()}</div>
              <p className="text-xs text-gray-400 mt-1">Total Emails</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-pink-500/10 to-pink-600/10 border-pink-500/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Brain className="h-5 w-5 text-pink-400" />
                <Badge className="bg-pink-500/20 text-pink-400 border-pink-500/30">
                  ${totals.aiCost.toFixed(2)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-black">
                {(totals.aiTokens / 1000).toFixed(1)}K
              </div>
              <p className="text-xs text-gray-400 mt-1">AI Tokens Used</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Total Platform Cost */}
      {totals && (
        <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <DollarSign className="h-6 w-6 text-yellow-400" />
                <div>
                  <CardTitle className="text-white">Total Platform Costs</CardTitle>
                  <CardDescription className="text-black font-semibold">
                    For {period === '7d' ? 'last 7 days' : period === '30d' ? 'last 30 days' : period === '90d' ? 'last 90 days' : 'last year'}
                  </CardDescription>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-yellow-400">
                  ${totals.totalCost.toFixed(2)}
                </div>
                <p className="text-xs text-black font-medium mt-1">
                  {usageData?.users.length} active businesses
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div>
                <p className="text-gray-400">Calls</p>
                <p className="text-black font-semibold">${totals.callCost.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-400">SMS</p>
                <p className="text-black font-semibold">${totals.smsCost.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-400">Emails</p>
                <p className="text-black font-semibold">${totals.emailCost.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-400">AI/LLM</p>
                <p className="text-black font-semibold">${totals.aiCost.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-400">Storage</p>
                <p className="text-black font-semibold">${totals.storageCost.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Per-User Usage Table */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="h-5 w-5" />
            Business Usage Breakdown
          </CardTitle>
          <CardDescription className="text-black font-semibold">
            Detailed usage statistics for each business owner
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Business</th>
                  <th className="text-center py-3 px-4 text-gray-400 font-medium">Calls</th>
                  <th className="text-center py-3 px-4 text-gray-400 font-medium">Minutes</th>
                  <th className="text-center py-3 px-4 text-gray-400 font-medium">SMS</th>
                  <th className="text-center py-3 px-4 text-gray-400 font-medium">Emails</th>
                  <th className="text-center py-3 px-4 text-gray-400 font-medium">AI Tokens</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium">Total Cost</th>
                </tr>
              </thead>
              <tbody>
                {usageData?.users.map((user) => (
                  <tr
                    key={user.user.id}
                    className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="py-4 px-4">
                      <div>
                        <p className="text-white font-medium">{user.user.name || 'Unnamed User'}</p>
                        <p className="text-xs text-gray-400">{user.user.email}</p>
                        {user.user.businessCategory && (
                          <Badge className="mt-1 bg-gray-700 text-gray-300 text-xs">
                            {user.user.businessCategory}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <div className="flex flex-col items-center">
                        <span className="text-black font-semibold">{user.calls.total}</span>
                        <span className="text-xs text-gray-400">
                          {user.calls.inbound}
                          <ArrowDownRight className="inline h-3 w-3 text-green-400" /> /{' '}
                          {user.calls.outbound}
                          <ArrowUpRight className="inline h-3 w-3 text-blue-400" />
                        </span>
                      </div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <span className="text-black font-semibold">{user.calls.totalMinutes}</span>
                    </td>
                    <td className="text-center py-4 px-4">
                      <div className="flex flex-col items-center">
                        <span className="text-black font-semibold">{user.sms.total}</span>
                        <span className="text-xs text-gray-400">
                          {user.sms.inbound} / {user.sms.outbound}
                        </span>
                      </div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <div className="flex flex-col items-center">
                        <span className="text-black font-semibold">{user.emails.total}</span>
                        <span className="text-xs text-gray-400">
                          {user.emails.inbound} / {user.emails.outbound}
                        </span>
                      </div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <span className="text-black font-semibold">
                        {(user.ai.estimatedTokens / 1000).toFixed(1)}K
                      </span>
                    </td>
                    <td className="text-right py-4 px-4">
                      <div className="flex flex-col items-end">
                        <span className="text-black font-bold text-lg">
                          ${user.totalCost.toFixed(2)}
                        </span>
                        <div className="text-xs text-gray-400 space-x-1 mt-1">
                          <span>C: ${user.calls.estimatedCost.toFixed(2)}</span>
                          <span>S: ${user.sms.estimatedCost.toFixed(2)}</span>
                          <span>E: ${user.emails.estimatedCost.toFixed(2)}</span>
                          <span>AI: ${user.ai.estimatedCost.toFixed(2)}</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
