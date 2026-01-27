
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  XCircle,
  ArrowRight,
  RefreshCw,
  Plus
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface AchSettlementStats {
  totalSettlements: number;
  completedSettlements: number;
  pendingSettlements: number;
  failedSettlements: number;
  totalProcessedAmount: number;
}

interface AchSettlement {
  id: string;
  batchId: string;
  settlementDate: string;
  status: string;
  totalAmount: number;
  transactionCount: number;
  successCount: number;
  failedCount: number;
  processingFee: number;
  netAmount: number;
  bankName?: string;
  accountLast4?: string;
  createdAt: string;
  transactions: Array<{
    id: string;
    status: string;
    amount: number;
    transactionType: string;
  }>;
}

export default function AchSettlementPage() {
  const { data: session, status } = useSession() || {};
  const [stats, setStats] = useState<AchSettlementStats | null>(null);
  const [settlements, setSettlements] = useState<AchSettlement[]>([]);
  const [selectedSettlement, setSelectedSettlement] = useState<AchSettlement | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [showDemoDialog, setShowDemoDialog] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchData();
    }
  }, [status]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, settlementsRes] = await Promise.all([
        fetch('/api/payments/ach-settlement/stats'),
        fetch('/api/payments/ach-settlement'),
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (settlementsRes.ok) {
        const settlementsData = await settlementsRes.json();
        setSettlements(settlementsData);
      }
    } catch (error) {
      console.error('Error fetching ACH data:', error);
      toast.error('Failed to load ACH settlement data');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessSettlement = async (settlementId: string) => {
    try {
      setProcessing(settlementId);
      const response = await fetch(`/api/payments/ach-settlement/${settlementId}/process`, {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Settlement processed: ${result.processedCount} successful, ${result.failedCount} failed`);
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to process settlement');
      }
    } catch (error) {
      console.error('Error processing settlement:', error);
      toast.error('Failed to process settlement');
    } finally {
      setProcessing(null);
    }
  };

  const handleGenerateDemo = async () => {
    try {
      const response = await fetch('/api/payments/ach-settlement/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 5 }),
      });

      if (response.ok) {
        toast.success('Demo settlements generated successfully');
        setShowDemoDialog(false);
        fetchData();
      } else {
        toast.error('Failed to generate demo settlements');
      }
    } catch (error) {
      console.error('Error generating demo:', error);
      toast.error('Failed to generate demo settlements');
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      PROCESSING: 'bg-blue-100 text-blue-800',
      COMPLETED: 'bg-green-100 text-green-800',
      FAILED: 'bg-red-100 text-red-800',
      CANCELLED: 'bg-gray-100 text-gray-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">ACH Settlement</h1>
          <p className="text-muted-foreground mt-1">
            <Badge variant="outline" className="mr-2">Demo Mode</Badge>
            Manage ACH batch processing and settlements
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showDemoDialog} onOpenChange={setShowDemoDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Generate Demo Data
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate Demo Settlements</DialogTitle>
                <DialogDescription>
                  This will create 5 sample ACH settlement batches with demo transactions for testing.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setShowDemoDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleGenerateDemo}>
                  Generate
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Settlements</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSettlements}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.completedSettlements}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pendingSettlements}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.failedSettlements}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Processed</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${(stats.totalProcessedAmount / 100).toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Settlements List */}
      <Card>
        <CardHeader>
          <CardTitle>Settlement Batches</CardTitle>
          <CardDescription>
            View and manage your ACH settlement batches
          </CardDescription>
        </CardHeader>
        <CardContent>
          {settlements.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No settlements yet</h3>
              <p className="text-muted-foreground mb-4">
                Generate demo data to see how ACH settlements work
              </p>
              <Button onClick={() => setShowDemoDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Generate Demo Data
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {settlements.map((settlement) => (
                <div
                  key={settlement.id}
                  className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold">{settlement.batchId}</h3>
                        <Badge className={getStatusBadge(settlement.status)}>
                          {settlement.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Settlement Date</p>
                          <p className="font-medium">
                            {new Date(settlement.settlementDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Total Amount</p>
                          <p className="font-medium">
                            ${(settlement.totalAmount / 100).toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Transactions</p>
                          <p className="font-medium">{settlement.transactionCount}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Bank</p>
                          <p className="font-medium">
                            {settlement.bankName || 'N/A'} {settlement.accountLast4 && `****${settlement.accountLast4}`}
                          </p>
                        </div>
                      </div>
                      {settlement.status === 'COMPLETED' && (
                        <div className="mt-2 text-sm">
                          <span className="text-green-600">✓ {settlement.successCount} successful</span>
                          {settlement.failedCount > 0 && (
                            <span className="text-red-600 ml-4">✗ {settlement.failedCount} failed</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {settlement.status === 'PENDING' && (
                        <Button
                          size="sm"
                          onClick={() => handleProcessSettlement(settlement.id)}
                          disabled={processing === settlement.id}
                        >
                          {processing === settlement.id ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <ArrowRight className="h-4 w-4 mr-2" />
                              Process
                            </>
                          )}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedSettlement(settlement)}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settlement Detail Dialog */}
      {selectedSettlement && (
        <Dialog open={!!selectedSettlement} onOpenChange={() => setSelectedSettlement(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Settlement Details: {selectedSettlement.batchId}</DialogTitle>
              <DialogDescription>
                View detailed information about this settlement batch
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={getStatusBadge(selectedSettlement.status)}>
                    {selectedSettlement.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Settlement Date</p>
                  <p className="font-medium">
                    {new Date(selectedSettlement.settlementDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="font-medium text-lg">
                    ${(selectedSettlement.totalAmount / 100).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Processing Fee</p>
                  <p className="font-medium">
                    ${(selectedSettlement.processingFee / 100).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Net Amount</p>
                  <p className="font-medium text-lg text-green-600">
                    ${(selectedSettlement.netAmount / 100).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Transactions</p>
                  <p className="font-medium">
                    {selectedSettlement.transactionCount} total
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Transactions Summary</h4>
                <div className="border rounded-lg p-4 bg-muted/50">
                  <p className="text-sm">
                    Total transactions: {selectedSettlement.transactions?.length || 0}
                  </p>
                  {selectedSettlement.status === 'COMPLETED' && (
                    <>
                      <p className="text-sm text-green-600">
                        ✓ Successful: {selectedSettlement.successCount}
                      </p>
                      {selectedSettlement.failedCount > 0 && (
                        <p className="text-sm text-red-600">
                          ✗ Failed: {selectedSettlement.failedCount}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
