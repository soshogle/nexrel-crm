'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  DollarSign,
  TrendingUp,
  Shield,
  Eye,
  Database,
  CheckCircle,
  XCircle,
  BarChart3,
  Users,
  MapPin,
  Activity,
  Sparkles,
} from 'lucide-react';

interface ConsentData {
  id: string;
  status: string;
  sharingLevel: string;
  allowTransactionData: boolean;
  allowBehaviorData: boolean;
  allowDemographicData: boolean;
  allowLocationData: boolean;
  revenueShareEnabled: boolean;
  revenueSharePercentage: number;
  consentedAt: string | null;
}

interface InsightData {
  id: string;
  insightType: string;
  category: string | null;
  title: string;
  description: string;
  dataPoints: any;
  timeRange: string;
  confidence: number;
  accessCount: number;
  revenueGenerated: number;
  createdAt: string;
}

interface RevenueData {
  revenues: Array<{
    id: string;
    period: string;
    amount: number;
    dataAccessCount: number;
    transactionData: number;
    behaviorData: number;
    demographicData: number;
    locationData: number;
    status: string;
    paidAt: string | null;
  }>;
  total: {
    amount: number;
    accessCount: number;
    transactionData: number;
    behaviorData: number;
    demographicData: number;
    locationData: number;
  };
}

export function DataMonetizationDashboard() {
  const [loading, setLoading] = useState(true);
  const [consent, setConsent] = useState<ConsentData | null>(null);
  const [insights, setInsights] = useState<InsightData[]>([]);
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [generatingDemo, setGeneratingDemo] = useState(false);

  // Consent form state
  const [sharingLevel, setSharingLevel] = useState('ANONYMOUS_ONLY');
  const [allowTransactionData, setAllowTransactionData] = useState(true);
  const [allowBehaviorData, setAllowBehaviorData] = useState(true);
  const [allowDemographicData, setAllowDemographicData] = useState(false);
  const [allowLocationData, setAllowLocationData] = useState(false);
  const [revenueShareEnabled, setRevenueShareEnabled] = useState(true);
  const [revenueSharePercentage, setRevenueSharePercentage] = useState(30);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load consent
      const consentRes = await fetch('/api/data-monetization/consent');
      if (consentRes.ok) {
        const data = await consentRes.json();
        setConsent(data.consent);

        // Populate form with existing consent
        if (data.consent) {
          setSharingLevel(data.consent.sharingLevel);
          setAllowTransactionData(data.consent.allowTransactionData);
          setAllowBehaviorData(data.consent.allowBehaviorData);
          setAllowDemographicData(data.consent.allowDemographicData);
          setAllowLocationData(data.consent.allowLocationData);
          setRevenueShareEnabled(data.consent.revenueShareEnabled);
          setRevenueSharePercentage(data.consent.revenueSharePercentage);
        }
      }

      // Load insights
      const insightsRes = await fetch('/api/data-monetization/insights');
      if (insightsRes.ok) {
        const data = await insightsRes.json();
        setInsights(data.insights || []);
      }

      // Load revenue
      const revenueRes = await fetch('/api/data-monetization/revenue');
      if (revenueRes.ok) {
        const data = await revenueRes.json();
        setRevenue(data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data monetization information');
    } finally {
      setLoading(false);
    }
  };

  const handleGrantConsent = async () => {
    try {
      const res = await fetch('/api/data-monetization/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sharingLevel,
          allowTransactionData,
          allowBehaviorData,
          allowDemographicData,
          allowLocationData,
          revenueShareEnabled,
          revenueSharePercentage,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to grant consent');
      }

      const data = await res.json();
      setConsent(data.consent);
      toast.success('Consent updated successfully');
    } catch (error: any) {
      console.error('Error granting consent:', error);
      toast.error(error.message || 'Failed to update consent');
    }
  };

  const handleRevokeConsent = async () => {
    if (!confirm('Are you sure you want to revoke data sharing consent? This will stop revenue sharing.')) {
      return;
    }

    try {
      const res = await fetch('/api/data-monetization/consent', {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to revoke consent');
      }

      const data = await res.json();
      setConsent(data.consent);
      toast.success('Consent revoked successfully');
      loadData();
    } catch (error: any) {
      console.error('Error revoking consent:', error);
      toast.error(error.message || 'Failed to revoke consent');
    }
  };

  const generateDemoData = async () => {
    try {
      setGeneratingDemo(true);
      const res = await fetch('/api/data-monetization/demo', {
        method: 'POST',
      });

      if (!res.ok) {
        throw new Error('Failed to generate demo data');
      }

      toast.success('Demo data generated successfully');
      await loadData();
    } catch (error: any) {
      console.error('Error generating demo data:', error);
      toast.error(error.message || 'Failed to generate demo data');
    } finally {
      setGeneratingDemo(false);
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Data Monetization</h1>
            <p className="text-muted-foreground mt-2">
              Loading data monetization dashboard...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Data Monetization</h1>
          <p className="text-muted-foreground mt-2">
            Share anonymized data insights and earn revenue
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
            <Sparkles className="h-3 w-3 mr-1" />
            Demo Mode
          </Badge>
          <Button onClick={generateDemoData} disabled={generatingDemo}>
            {generatingDemo ? 'Generating...' : 'Generate Demo Data'}
          </Button>
        </div>
      </div>

      {/* Revenue Overview */}
      {consent?.status === 'GRANTED' && revenue && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(revenue.total.amount)}</div>
              <p className="text-xs text-muted-foreground">
                From {revenue.revenues.length} period(s)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Data Access Count</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{revenue.total.accessCount.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Total data accesses</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Transaction Data</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(revenue.total.transactionData)}</div>
              <p className="text-xs text-muted-foreground">Revenue from transaction data</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Behavior Data</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(revenue.total.behaviorData)}</div>
              <p className="text-xs text-muted-foreground">Revenue from behavior data</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Consent Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Data Sharing Consent
          </CardTitle>
          <CardDescription>
            Control what data you share and earn revenue from anonymized insights
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {consent?.status === 'GRANTED' ? (
            <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-900">Consent Granted</p>
                  <p className="text-sm text-green-700">
                    You are earning {consent.revenueSharePercentage}% revenue share
                  </p>
                </div>
              </div>
              <Button variant="destructive" onClick={handleRevokeConsent}>
                Revoke Consent
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-gray-600" />
                <div>
                  <p className="font-medium text-gray-900">No Active Consent</p>
                  <p className="text-sm text-gray-700">
                    Grant consent to start earning revenue from your data
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sharingLevel">Data Sharing Level</Label>
              <Select value={sharingLevel} onValueChange={setSharingLevel}>
                <SelectTrigger id="sharingLevel">
                  <SelectValue placeholder="Select sharing level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">None - No sharing</SelectItem>
                  <SelectItem value="ANONYMOUS_ONLY">Anonymous Only</SelectItem>
                  <SelectItem value="AGGREGATED">Aggregated Data</SelectItem>
                  <SelectItem value="FULL_ANONYMOUS">Full Anonymous</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="revenueShare">Revenue Share (%)</Label>
              <Select
                value={revenueSharePercentage.toString()}
                onValueChange={(val) => setRevenueSharePercentage(Number(val))}
                disabled={!revenueShareEnabled}
              >
                <SelectTrigger id="revenueShare">
                  <SelectValue placeholder="Select percentage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10%</SelectItem>
                  <SelectItem value="20">20%</SelectItem>
                  <SelectItem value="30">30%</SelectItem>
                  <SelectItem value="40">40%</SelectItem>
                  <SelectItem value="50">50%</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="transaction">Transaction Data</Label>
              </div>
              <Switch
                id="transaction"
                checked={allowTransactionData}
                onCheckedChange={setAllowTransactionData}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="behavior">Behavior Data</Label>
              </div>
              <Switch
                id="behavior"
                checked={allowBehaviorData}
                onCheckedChange={setAllowBehaviorData}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="demographic">Demographic Data</Label>
              </div>
              <Switch
                id="demographic"
                checked={allowDemographicData}
                onCheckedChange={setAllowDemographicData}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="location">Location Data</Label>
              </div>
              <Switch
                id="location"
                checked={allowLocationData}
                onCheckedChange={setAllowLocationData}
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="revenueEnabled">Enable Revenue Sharing</Label>
              </div>
              <Switch
                id="revenueEnabled"
                checked={revenueShareEnabled}
                onCheckedChange={setRevenueShareEnabled}
              />
            </div>
          </div>

          <Button onClick={handleGrantConsent} className="w-full">
            {consent?.status === 'GRANTED' ? 'Update Consent' : 'Grant Consent'}
          </Button>
        </CardContent>
      </Card>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Insights ({insights.length})
          </CardTitle>
          <CardDescription>
            Anonymized insights generated from your business data
          </CardDescription>
        </CardHeader>
        <CardContent>
          {insights.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No insights available yet</p>
              <p className="text-sm">Grant consent and generate demo data to see insights</p>
            </div>
          ) : (
            <div className="space-y-4">
              {insights.map((insight) => (
                <div
                  key={insight.id}
                  className="p-4 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium">{insight.title}</h4>
                      {insight.category && (
                        <Badge variant="outline" className="mt-1">
                          {insight.category}
                        </Badge>
                      )}
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {Math.round(insight.confidence * 100)}% confidence
                      </div>
                      <div>{insight.timeRange.replace(/_/g, ' ')}</div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{insight.description}</p>
                  <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {insight.accessCount} accesses
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      {formatCurrency(insight.revenueGenerated)} earned
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revenue History */}
      {consent?.status === 'GRANTED' && revenue && revenue.revenues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Revenue History
            </CardTitle>
            <CardDescription>Your earnings from data sharing by period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {revenue.revenues.map((rev) => (
                <div
                  key={rev.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{rev.period}</p>
                    <p className="text-sm text-muted-foreground">
                      {rev.dataAccessCount} data accesses
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">{formatCurrency(rev.amount)}</p>
                    <Badge variant={rev.status === 'PAID' ? 'default' : 'secondary'}>
                      {rev.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
