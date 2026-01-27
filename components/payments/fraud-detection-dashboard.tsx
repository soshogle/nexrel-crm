
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  TrendingUp,
  Activity,
  Eye,
  Ban,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

interface FraudAlert {
  id: string;
  transactionId: string;
  customerId: string;
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reason: string;
  amount: number;
  timestamp: string;
  status: 'PENDING' | 'REVIEWED' | 'BLOCKED' | 'APPROVED';
}

interface FraudStats {
  totalTransactions: number;
  flaggedTransactions: number;
  blockedTransactions: number;
  averageRiskScore: number;
  highRiskPercentage: number;
}

export function FraudDetectionDashboard() {
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [stats, setStats] = useState<FraudStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadFraudData();
  }, []);

  const loadFraudData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/payments/fraud-detection');
      if (!response.ok) throw new Error('Failed to load fraud data');
      const data = await response.json();
      
      setAlerts(data.alerts || []);
      setStats(data.stats || null);
    } catch (error) {
      console.error('Error loading fraud data:', error);
      toast.error('Failed to load fraud detection data');
    } finally {
      setLoading(false);
    }
  };

  const handleReviewAlert = async (alertId: string, action: 'APPROVED' | 'BLOCKED') => {
    try {
      const response = await fetch(`/api/payments/fraud-detection/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action }),
      });

      if (!response.ok) throw new Error('Failed to update alert');
      
      toast.success(`Transaction ${action.toLowerCase()}`);
      loadFraudData();
    } catch (error) {
      console.error('Error updating alert:', error);
      toast.error('Failed to update alert status');
    }
  };

  const getRiskBadgeColor = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'bg-red-500 hover:bg-red-600';
      case 'HIGH': return 'bg-orange-500 hover:bg-orange-600';
      case 'MEDIUM': return 'bg-yellow-500 hover:bg-yellow-600';
      case 'LOW': return 'bg-green-500 hover:bg-green-600';
      default: return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'CRITICAL': return <XCircle className="h-4 w-4" />;
      case 'HIGH': return <AlertTriangle className="h-4 w-4" />;
      case 'MEDIUM': return <Activity className="h-4 w-4" />;
      case 'LOW': return <CheckCircle2 className="h-4 w-4" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Fraud Detection</h2>
          <p className="text-muted-foreground">
            Monitor and manage suspicious transactions
          </p>
        </div>
        <Button onClick={loadFraudData} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTransactions}</div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Flagged</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.flaggedTransactions}</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalTransactions > 0 
                  ? ((stats.flaggedTransactions / stats.totalTransactions) * 100).toFixed(1)
                  : '0'}% of total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Blocked</CardTitle>
              <Ban className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.blockedTransactions}</div>
              <p className="text-xs text-muted-foreground">Prevented fraud</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Risk Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageRiskScore.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">Out of 100</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">High Risk</CardTitle>
              <Shield className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.highRiskPercentage.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">Requiring review</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alert Badge */}
      {alerts.filter(a => a.status === 'PENDING').length > 0 && (
        <Alert className="border-orange-500 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            You have {alerts.filter(a => a.status === 'PENDING').length} pending fraud alerts requiring review.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pending">
            Pending Review
            {alerts.filter(a => a.status === 'PENDING').length > 0 && (
              <Badge className="ml-2 bg-orange-500">{alerts.filter(a => a.status === 'PENDING').length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="all">All Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent High-Risk Alerts</CardTitle>
              <CardDescription>Transactions flagged as high or critical risk</CardDescription>
            </CardHeader>
            <CardContent>
              {alerts.filter(a => a.riskLevel === 'HIGH' || a.riskLevel === 'CRITICAL').length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
                  <p>No high-risk alerts at this time</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts
                    .filter(a => a.riskLevel === 'HIGH' || a.riskLevel === 'CRITICAL')
                    .slice(0, 5)
                    .map(alert => (
                      <AlertCard key={alert.id} alert={alert} onReview={handleReviewAlert} />
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Review</CardTitle>
              <CardDescription>Alerts requiring manual review</CardDescription>
            </CardHeader>
            <CardContent>
              {alerts.filter(a => a.status === 'PENDING').length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
                  <p>All alerts have been reviewed</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts
                    .filter(a => a.status === 'PENDING')
                    .map(alert => (
                      <AlertCard key={alert.id} alert={alert} onReview={handleReviewAlert} />
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Fraud Alerts</CardTitle>
              <CardDescription>Complete history of fraud detection alerts</CardDescription>
            </CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-2" />
                  <p>No fraud alerts found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts.map(alert => (
                    <AlertCard key={alert.id} alert={alert} onReview={handleReviewAlert} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface AlertCardProps {
  alert: FraudAlert;
  onReview: (alertId: string, action: 'APPROVED' | 'BLOCKED') => void;
}

function AlertCard({ alert, onReview }: AlertCardProps) {
  const getRiskBadgeColor = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'bg-red-500 hover:bg-red-600';
      case 'HIGH': return 'bg-orange-500 hover:bg-orange-600';
      case 'MEDIUM': return 'bg-yellow-500 hover:bg-yellow-600';
      case 'LOW': return 'bg-green-500 hover:bg-green-600';
      default: return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'CRITICAL': return <XCircle className="h-4 w-4" />;
      case 'HIGH': return <AlertTriangle className="h-4 w-4" />;
      case 'MEDIUM': return <Activity className="h-4 w-4" />;
      case 'LOW': return <CheckCircle2 className="h-4 w-4" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED': return <Badge className="bg-green-500">Approved</Badge>;
      case 'BLOCKED': return <Badge className="bg-red-500">Blocked</Badge>;
      case 'REVIEWED': return <Badge className="bg-blue-500">Reviewed</Badge>;
      case 'PENDING': return <Badge className="bg-yellow-500">Pending</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="flex items-start justify-between border rounded-lg p-4 hover:bg-muted/50 transition-colors">
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Badge className={getRiskBadgeColor(alert.riskLevel)}>
            {getRiskIcon(alert.riskLevel)}
            <span className="ml-1">{alert.riskLevel}</span>
          </Badge>
          {getStatusBadge(alert.status)}
          <span className="text-sm text-muted-foreground">
            Risk Score: {alert.riskScore}/100
          </span>
        </div>
        
        <div className="space-y-1">
          <p className="text-sm font-medium">
            Transaction ID: {alert.transactionId}
          </p>
          <p className="text-sm text-muted-foreground">
            Amount: ${(alert.amount / 100).toFixed(2)}
          </p>
          <p className="text-sm text-muted-foreground">
            Reason: {alert.reason}
          </p>
          <p className="text-xs text-muted-foreground">
            {new Date(alert.timestamp).toLocaleString()}
          </p>
        </div>
      </div>

      {alert.status === 'PENDING' && (
        <div className="flex gap-2 ml-4">
          <Button
            size="sm"
            variant="outline"
            className="text-green-600 border-green-600 hover:bg-green-50"
            onClick={() => onReview(alert.id, 'APPROVED')}
          >
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-red-600 border-red-600 hover:bg-red-50"
            onClick={() => onReview(alert.id, 'BLOCKED')}
          >
            <Ban className="h-4 w-4 mr-1" />
            Block
          </Button>
        </div>
      )}
    </div>
  );
}
