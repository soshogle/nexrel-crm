
'use client';

/**
 * Data Monetization Dashboard
 * Displays aggregated insights and export capabilities
 * Demo Mode: Uses simulated data for visualization
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart3,
  TrendingUp,
  Download,
  FileText,
  Database,
  Calendar,
  DollarSign,
  Users,
  CreditCard,
  Wallet,
  Activity,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

interface Insight {
  id: string;
  insightType: string;
  period: string;
  startDate: string;
  endDate: string;
  totalTransactions: number;
  totalRevenue: number;
  averageOrderValue: number;
  uniqueCustomers: number;
  cardPayments: number;
  walletPayments: number;
  bnplPayments: number;
  achPayments: number;
  successRate: number;
  fraudRate: number;
  growthRate: number;
  trendData: any[];
  confidenceScore: number;
  createdAt: string;
}

interface ExportRecord {
  id: string;
  exportType: string;
  format: string;
  status: string;
  startDate: string;
  endDate: string;
  recordCount: number;
  fileSize: number;
  downloadUrl?: string;
  createdAt: string;
  completedAt?: string;
  expiresAt?: string;
}

export function DataMonetizationDashboard() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [exports, setExports] = useState<ExportRecord[]>([]);
  const [selectedInsightType, setSelectedInsightType] = useState('TRANSACTION_VOLUME');
  const [selectedPeriod, setSelectedPeriod] = useState('MONTHLY');
  const [selectedExportFormat, setSelectedExportFormat] = useState('CSV');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchInsights();
    fetchExports();
  }, []);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/payments/data-monetization/insights');
      if (!response.ok) throw new Error('Failed to fetch insights');
      const data = await response.json();
      setInsights(data.insights || []);
    } catch (error: any) {
      console.error('Error fetching insights:', error);
      toast.error('Failed to load insights');
    } finally {
      setLoading(false);
    }
  };

  const fetchExports = async () => {
    try {
      const response = await fetch('/api/payments/data-monetization/exports');
      if (!response.ok) throw new Error('Failed to fetch exports');
      const data = await response.json();
      setExports(data.exports || []);
    } catch (error: any) {
      console.error('Error fetching exports:', error);
    }
  };

  const generateInsight = async () => {
    try {
      setLoading(true);
      const endDate = new Date();
      const startDate = new Date();
      
      // Set date range based on period
      if (selectedPeriod === 'DAILY') {
        startDate.setDate(startDate.getDate() - 1);
      } else if (selectedPeriod === 'WEEKLY') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (selectedPeriod === 'MONTHLY') {
        startDate.setMonth(startDate.getMonth() - 1);
      } else if (selectedPeriod === 'QUARTERLY') {
        startDate.setMonth(startDate.getMonth() - 3);
      } else if (selectedPeriod === 'YEARLY') {
        startDate.setFullYear(startDate.getFullYear() - 1);
      }

      const response = await fetch('/api/payments/data-monetization/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          insightType: selectedInsightType,
          period: selectedPeriod,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        }),
      });

      if (!response.ok) throw new Error('Failed to generate insight');
      
      toast.success('Insight generated successfully');
      await fetchInsights();
    } catch (error: any) {
      console.error('Error generating insight:', error);
      toast.error('Failed to generate insight');
    } finally {
      setLoading(false);
    }
  };

  const requestExport = async () => {
    try {
      setExporting(true);
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1); // Last month

      const response = await fetch('/api/payments/data-monetization/exports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exportType: 'transactions',
          format: selectedExportFormat,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          anonymized: true,
        }),
      });

      if (!response.ok) throw new Error('Failed to request export');
      
      toast.success('Export requested. Processing will complete shortly.');
      
      // Refresh exports after a delay
      setTimeout(() => {
        fetchExports();
      }, 5000);
    } catch (error: any) {
      console.error('Error requesting export:', error);
      toast.error('Failed to request export');
    } finally {
      setExporting(false);
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const latestInsight = insights[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Data Monetization</h1>
          <p className="text-muted-foreground mt-1">
            Privacy-compliant analytics and data exports
            <Badge variant="secondary" className="ml-2">Demo Mode</Badge>
          </p>
        </div>
        <Button onClick={generateInsight} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <BarChart3 className="mr-2 h-4 w-4" />
              Generate Insight
            </>
          )}
        </Button>
      </div>

      {/* Insight Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Insight Configuration</CardTitle>
          <CardDescription>
            Generate aggregated insights based on your transaction data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Insight Type</label>
              <Select value={selectedInsightType} onValueChange={setSelectedInsightType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRANSACTION_VOLUME">Transaction Volume</SelectItem>
                  <SelectItem value="PAYMENT_METHOD_PREFERENCE">Payment Method Preference</SelectItem>
                  <SelectItem value="CUSTOMER_BEHAVIOR">Customer Behavior</SelectItem>
                  <SelectItem value="REVENUE_TREND">Revenue Trend</SelectItem>
                  <SelectItem value="CREDIT_UTILIZATION">Credit Utilization</SelectItem>
                  <SelectItem value="BNPL_PERFORMANCE">BNPL Performance</SelectItem>
                  <SelectItem value="FRAUD_DETECTION">Fraud Detection</SelectItem>
                  <SelectItem value="GEOGRAPHIC_DISTRIBUTION">Geographic Distribution</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Time Period</label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAILY">Daily</SelectItem>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                  <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                  <SelectItem value="YEARLY">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Latest Insight Overview */}
      {latestInsight && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Transactions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">
                    {latestInsight.totalTransactions.toLocaleString()}
                  </div>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </div>
                {latestInsight.growthRate !== 0 && (
                  <p className={`text-xs mt-1 ${latestInsight.growthRate > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {latestInsight.growthRate > 0 ? '+' : ''}{latestInsight.growthRate.toFixed(1)}% from last period
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">
                    {formatCurrency(latestInsight.totalRevenue)}
                  </div>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Avg: {formatCurrency(latestInsight.averageOrderValue)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Unique Customers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">
                    {latestInsight.uniqueCustomers.toLocaleString()}
                  </div>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {((latestInsight.uniqueCustomers / latestInsight.totalTransactions) * 100).toFixed(1)}% conversion rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Success Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">
                    {latestInsight.successRate.toFixed(1)}%
                  </div>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Fraud: {latestInsight.fraudRate.toFixed(2)}%
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Payment Method Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Method Distribution</CardTitle>
              <CardDescription>
                Breakdown of transactions by payment method
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <CreditCard className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Card Payments</p>
                    <p className="text-2xl font-bold">{latestInsight.cardPayments.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">
                      {((latestInsight.cardPayments / latestInsight.totalTransactions) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <Wallet className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Wallet Payments</p>
                    <p className="text-2xl font-bold">{latestInsight.walletPayments.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">
                      {((latestInsight.walletPayments / latestInsight.totalTransactions) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">BNPL Payments</p>
                    <p className="text-2xl font-bold">{latestInsight.bnplPayments.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">
                      {((latestInsight.bnplPayments / latestInsight.totalTransactions) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <Database className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">ACH Payments</p>
                    <p className="text-2xl font-bold">{latestInsight.achPayments.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">
                      {((latestInsight.achPayments / latestInsight.totalTransactions) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Data Export Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Data Export</CardTitle>
              <CardDescription>
                Export your transaction data in various formats
              </CardDescription>
            </div>
            <div className="flex items-center space-x-4">
              <Select value={selectedExportFormat} onValueChange={setSelectedExportFormat}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CSV">CSV</SelectItem>
                  <SelectItem value="JSON">JSON</SelectItem>
                  <SelectItem value="XML">XML</SelectItem>
                  <SelectItem value="PDF">PDF</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={requestExport} disabled={exporting}>
                {exporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Request Export
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {exports.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No exports yet. Request your first export above.
              </p>
            ) : (
              exports.map((exp) => (
                <div
                  key={exp.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        {exp.exportType} Export ({exp.format})
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(exp.startDate).toLocaleDateString()} - {new Date(exp.endDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      {exp.status === 'COMPLETED' && (
                        <>
                          <p className="text-sm font-medium">
                            {exp.recordCount.toLocaleString()} records
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(exp.fileSize)}
                          </p>
                        </>
                      )}
                    </div>
                    {exp.status === 'COMPLETED' ? (
                      <Button size="sm" asChild>
                        <a href={exp.downloadUrl} target="_blank" rel="noopener noreferrer">
                          <Download className="mr-2 h-3 w-3" />
                          Download
                        </a>
                      </Button>
                    ) : exp.status === 'PROCESSING' ? (
                      <Badge variant="secondary">
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        Processing
                      </Badge>
                    ) : exp.status === 'FAILED' ? (
                      <Badge variant="destructive">
                        <XCircle className="mr-1 h-3 w-3" />
                        Failed
                      </Badge>
                    ) : (
                      <Badge variant="outline">Pending</Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Insights History */}
      <Card>
        <CardHeader>
          <CardTitle>Insights History</CardTitle>
          <CardDescription>
            Previously generated insights and analytics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {insights.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No insights generated yet. Create your first insight above.
              </p>
            ) : (
              insights.map((insight) => (
                <div
                  key={insight.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <BarChart3 className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        {insight.insightType.replace(/_/g, ' ')} - {insight.period}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(insight.startDate).toLocaleDateString()} - {new Date(insight.endDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {insight.totalTransactions.toLocaleString()} transactions
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(insight.totalRevenue)} revenue
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {insight.confidenceScore.toFixed(0)}% confidence
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
