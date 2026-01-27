'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  Phone,
  MessageSquare,
  Brain,
  HardDrive,
  DollarSign,
  TrendingUp,
  RefreshCw,
  Loader2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface BillingData {
  calls: {
    count: number;
    minutes: number;
    cost: number;
    rate: number;
  };
  sms: {
    count: number;
    cost: number;
    rate: number;
  };
  ai: {
    minutes: number;
    cost: number;
    rate: number;
  };
  llm: {
    tokens: number;
    cost: number;
    rate: number;
    breakdown: {
      chatMessages: number;
      transcriptions: number;
      aiSuggestions: number;
    };
  };
  storage: {
    gb: number;
    cost: number;
    rate: number;
  };
  total: number;
}

export default function BillingPage() {
  const { data: session } = useSession() || {};
  const [mounted, setMounted] = useState(false);
  const [period, setPeriod] = useState('30d');
  const [billingData, setBillingData] = useState<BillingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchBillingData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/billing/usage?period=${period}`);
      if (!response.ok) {
        throw new Error('Failed to fetch billing data');
      }
      const data = await response.json();
      setBillingData(data.data);
      // Use date-fns format for consistent server/client rendering
      setStartDate(format(new Date(data.startDate), 'MMM d, yyyy'));
      setEndDate(format(new Date(data.endDate), 'MMM d, yyyy'));
    } catch (error: any) {
      console.error('Error fetching billing data:', error);
      toast.error('Failed to load billing data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (mounted) {
      fetchBillingData();
    }
  }, [period, mounted]);

  if (!mounted || isLoading || !billingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatNumber = (num: number, decimals: number = 0) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900/20 via-gray-900 to-blue-900/20 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold gradient-text mb-2">Billing & Usage</h1>
            <p className="text-gray-400">
              Track your platform usage and costs • {startDate} - {endDate}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[180px] bg-gray-800 border-gray-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={fetchBillingData}
              variant="outline"
              size="sm"
              className="bg-purple-500/10 border-purple-500/50 text-purple-300 hover:bg-purple-500/20"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Total Cost Card */}
        <Card className="bg-gradient-to-br from-purple-900/40 to-blue-900/40 border-purple-500/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-400" />
                  Total Platform Costs
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Your total usage charges for the selected period
                </CardDescription>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold gradient-text">
                  {formatCurrency(billingData.total)}
                </div>
                <Badge className="mt-2 bg-green-500/20 text-green-300 border-green-500/50">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Actual billing data
                </Badge>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Detailed Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Phone Calls */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-500/10 rounded-lg">
                    <Phone className="h-6 w-6 text-blue-400" />
                  </div>
                  <div>
                    <CardTitle className="text-white">Phone Calls</CardTitle>
                    <CardDescription className="text-gray-200">
                      Voice call usage
                    </CardDescription>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">
                    {formatCurrency(billingData.calls.cost)}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-200">Total Calls:</span>
                  <span className="text-gray-200">{formatNumber(billingData.calls.count)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-200">Total Minutes:</span>
                  <span className="text-gray-200">
                    {formatNumber(billingData.calls.minutes, 2)} min
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-200">Rate:</span>
                  <span className="font-mono text-gray-200">
                    {formatCurrency(billingData.calls.rate)}/minute
                  </span>
                </div>
              </div>
              <div className="pt-2 border-t border-gray-800">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <AlertCircle className="h-3 w-3" />
                  <span>Actual Twilio billing data</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SMS Messages */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-500/10 rounded-lg">
                    <MessageSquare className="h-6 w-6 text-green-400" />
                  </div>
                  <div>
                    <CardTitle className="text-white">SMS Messages</CardTitle>
                    <CardDescription className="text-gray-200">
                      Text messaging usage
                    </CardDescription>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">
                    {formatCurrency(billingData.sms.cost)}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-200">Total Messages:</span>
                  <span className="text-gray-200">{formatNumber(billingData.sms.count)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-200">Rate:</span>
                  <span className="font-mono text-gray-200">
                    {formatCurrency(billingData.sms.rate)}/message
                  </span>
                </div>
              </div>
              <div className="pt-2 border-t border-gray-800">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <AlertCircle className="h-3 w-3" />
                  <span>Actual Twilio billing data</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Voice Agent */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-500/10 rounded-lg">
                    <Brain className="h-6 w-6 text-purple-400" />
                  </div>
                  <div>
                    <CardTitle className="text-white">AI Voice Agent</CardTitle>
                    <CardDescription className="text-gray-200">
                      Conversational AI usage
                    </CardDescription>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">
                    {formatCurrency(billingData.ai.cost)}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-200">AI Minutes:</span>
                  <span className="text-gray-200">
                    {formatNumber(billingData.ai.minutes, 2)} min
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-200">Rate:</span>
                  <span className="font-mono text-gray-200">
                    {formatCurrency(billingData.ai.rate)}/minute
                  </span>
                </div>
              </div>
              <div className="pt-2 border-t border-gray-800">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <AlertCircle className="h-3 w-3" />
                  <span>Based on ElevenLabs subscription</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Chat Assistant (LLM) */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-pink-500/10 rounded-lg">
                    <Sparkles className="h-6 w-6 text-pink-400" />
                  </div>
                  <div>
                    <CardTitle className="text-white">AI Chat Assistant</CardTitle>
                    <CardDescription className="text-gray-200">
                      LLM API usage & automation
                    </CardDescription>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">
                    {formatCurrency(billingData.llm.cost)}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-200">Total Tokens:</span>
                  <span className="text-gray-200">
                    {formatNumber(billingData.llm.tokens)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-200">Rate:</span>
                  <span className="font-mono text-gray-200">
                    {formatCurrency(billingData.llm.rate)}/1K tokens
                  </span>
                </div>
                <div className="pt-2 border-t border-gray-700">
                  <div className="text-xs text-gray-400 space-y-1">
                    <div className="flex justify-between">
                      <span>• Chat Messages:</span>
                      <span className="text-white">{formatNumber(billingData.llm.breakdown.chatMessages)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>• Call Transcriptions:</span>
                      <span className="text-white">{formatNumber(billingData.llm.breakdown.transcriptions)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>• AI Task Suggestions:</span>
                      <span className="text-white">{formatNumber(billingData.llm.breakdown.aiSuggestions)}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="pt-2 border-t border-gray-800">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <AlertCircle className="h-3 w-3" />
                  <span>Estimated LLM token usage</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Storage */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-orange-500/10 rounded-lg">
                    <HardDrive className="h-6 w-6 text-orange-400" />
                  </div>
                  <div>
                    <CardTitle className="text-white">Storage</CardTitle>
                    <CardDescription className="text-gray-200">
                      Call recording storage
                    </CardDescription>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">
                    {formatCurrency(billingData.storage.cost)}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-200">Storage Used:</span>
                  <span className="text-gray-200">
                    {formatNumber(billingData.storage.gb, 2)} GB
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-200">Rate:</span>
                  <span className="font-mono text-gray-200">
                    {formatCurrency(billingData.storage.rate)}/GB
                  </span>
                </div>
              </div>
              <div className="pt-2 border-t border-gray-800">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <AlertCircle className="h-3 w-3" />
                  <span>Estimated storage costs</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cost Breakdown Chart */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Cost Breakdown</CardTitle>
            <CardDescription className="text-gray-200">
              Visual breakdown of your platform costs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-200">Phone Calls</span>
                  <span className="text-gray-200">
                    {formatCurrency(billingData.calls.cost)} (
                    {((billingData.calls.cost / billingData.total) * 100).toFixed(1)}%)
                  </span>
                </div>
                <Progress
                  value={(billingData.calls.cost / billingData.total) * 100}
                  className="h-2 bg-gray-800"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-200">SMS Messages</span>
                  <span className="text-gray-200">
                    {formatCurrency(billingData.sms.cost)} (
                    {((billingData.sms.cost / billingData.total) * 100).toFixed(1)}%)
                  </span>
                </div>
                <Progress
                  value={(billingData.sms.cost / billingData.total) * 100}
                  className="h-2 bg-gray-800"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-200">AI Voice Agent</span>
                  <span className="text-gray-200">
                    {formatCurrency(billingData.ai.cost)} (
                    {((billingData.ai.cost / billingData.total) * 100).toFixed(1)}%)
                  </span>
                </div>
                <Progress
                  value={(billingData.ai.cost / billingData.total) * 100}
                  className="h-2 bg-gray-800"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-200">AI Chat Assistant</span>
                  <span className="text-gray-200">
                    {formatCurrency(billingData.llm.cost)} (
                    {((billingData.llm.cost / billingData.total) * 100).toFixed(1)}%)
                  </span>
                </div>
                <Progress
                  value={(billingData.llm.cost / billingData.total) * 100}
                  className="h-2 bg-gray-800"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-200">Storage</span>
                  <span className="text-gray-200">
                    {formatCurrency(billingData.storage.cost)} (
                    {((billingData.storage.cost / billingData.total) * 100).toFixed(1)}%)
                  </span>
                </div>
                <Progress
                  value={(billingData.storage.cost / billingData.total) * 100}
                  className="h-2 bg-gray-800"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Important Notes */}
        <Card className="bg-yellow-900/20 border-yellow-500/30">
          <CardHeader>
            <CardTitle className="text-yellow-300 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Important Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-200">
            <p>
              • <strong>Phone Calls & SMS:</strong> Actual costs from Twilio billing API
            </p>
            <p>
              • <strong>AI Voice Agent:</strong> Based on your ElevenLabs subscription tier
            </p>
            <p>
              • <strong>AI Chat Assistant:</strong> Estimated LLM token usage for chat messages, call transcriptions, and AI task automation ($0.01/1K tokens)
            </p>
            <p>
              • <strong>Storage:</strong> Estimated based on call recording duration (~1MB per minute)
            </p>
            <p>
              • These costs reflect platform usage charges. Your actual subscription may include
              bundled credits or different pricing.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
