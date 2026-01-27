
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  RefreshCw,
  Plus,
  CreditCard,
  Calendar
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface BnplStats {
  totalApplications: number;
  activeApplications: number;
  completedApplications: number;
  defaultedApplications: number;
  totalFinanced: number;
  totalPaid: number;
  remainingBalance: number;
}

interface BnplApplication {
  id: string;
  purchaseAmount: number;
  downPayment: number;
  financedAmount: number;
  status: string;
  installmentCount: number;
  installmentAmount: number;
  totalRepayment: number;
  paidInstallments: number;
  remainingBalance: number;
  totalPaid: number;
  merchantName?: string;
  productDescription?: string;
  nextPaymentDate?: string;
  createdAt: string;
  installments: Array<{
    id: string;
    installmentNumber: number;
    status: string;
    dueDate: string;
    amount: number;
  }>;
}

export default function BnplPage() {
  const { data: session, status } = useSession() || {};
  const [stats, setStats] = useState<BnplStats | null>(null);
  const [applications, setApplications] = useState<BnplApplication[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<BnplApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDemoDialog, setShowDemoDialog] = useState(false);
  const [payingInstallment, setPayingInstallment] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchData();
    }
  }, [status]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, applicationsRes] = await Promise.all([
        fetch('/api/payments/bnpl/stats'),
        fetch('/api/payments/bnpl'),
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (applicationsRes.ok) {
        const applicationsData = await applicationsRes.json();
        setApplications(applicationsData);
      }
    } catch (error) {
      console.error('Error fetching BNPL data:', error);
      toast.error('Failed to load BNPL data');
    } finally {
      setLoading(false);
    }
  };

  const handlePayInstallment = async (installmentId: string) => {
    try {
      setPayingInstallment(installmentId);
      const response = await fetch(`/api/payments/bnpl/installments/${installmentId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod: 'Demo Card ****1234',
        }),
      });

      if (response.ok) {
        toast.success('Installment paid successfully');
        fetchData();
        if (selectedApplication) {
          const updatedApp = await fetch(`/api/payments/bnpl/${selectedApplication.id}`).then(r => r.json());
          setSelectedApplication(updatedApp);
        }
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to process payment');
      }
    } catch (error) {
      console.error('Error paying installment:', error);
      toast.error('Failed to process payment');
    } finally {
      setPayingInstallment(null);
    }
  };

  const handleGenerateDemo = async () => {
    try {
      const response = await fetch('/api/payments/bnpl/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 3 }),
      });

      if (response.ok) {
        toast.success('Demo BNPL applications generated successfully');
        setShowDemoDialog(false);
        fetchData();
      } else {
        toast.error('Failed to generate demo applications');
      }
    } catch (error) {
      console.error('Error generating demo:', error);
      toast.error('Failed to generate demo applications');
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-blue-100 text-blue-800',
      ACTIVE: 'bg-green-100 text-green-800',
      COMPLETED: 'bg-gray-100 text-gray-800',
      DEFAULTED: 'bg-red-100 text-red-800',
      CANCELLED: 'bg-gray-100 text-gray-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getInstallmentStatusBadge = (status: string) => {
    const colors = {
      SCHEDULED: 'bg-blue-100 text-blue-800',
      PENDING: 'bg-yellow-100 text-yellow-800',
      PAID: 'bg-green-100 text-green-800',
      OVERDUE: 'bg-red-100 text-red-800',
      FAILED: 'bg-red-100 text-red-800',
      WAIVED: 'bg-gray-100 text-gray-800',
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
          <h1 className="text-3xl font-bold">Buy Now, Pay Later</h1>
          <p className="text-muted-foreground mt-1">
            <Badge variant="outline" className="mr-2">Demo Mode</Badge>
            Manage BNPL financing applications and installments
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
                <DialogTitle>Generate Demo Applications</DialogTitle>
                <DialogDescription>
                  This will create 3 sample BNPL applications with payment schedules for testing.
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalApplications}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Plans</CardTitle>
              <Clock className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.activeApplications}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Financed</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${(stats.totalFinanced / 100).toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Remaining Balance</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${(stats.remainingBalance / 100).toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Applications List */}
      <Card>
        <CardHeader>
          <CardTitle>BNPL Applications</CardTitle>
          <CardDescription>
            View and manage your Buy Now, Pay Later financing
          </CardDescription>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No BNPL applications yet</h3>
              <p className="text-muted-foreground mb-4">
                Generate demo data to see how BNPL financing works
              </p>
              <Button onClick={() => setShowDemoDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Generate Demo Data
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {applications.map((application) => (
                <div
                  key={application.id}
                  className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold">
                          {application.merchantName || 'Purchase'} - {application.productDescription || 'Item'}
                        </h3>
                        <Badge className={getStatusBadge(application.status)}>
                          {application.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Purchase Amount</p>
                          <p className="font-medium">
                            ${(application.purchaseAmount / 100).toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Installments</p>
                          <p className="font-medium">
                            {application.paidInstallments}/{application.installmentCount}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Remaining Balance</p>
                          <p className="font-medium text-orange-600">
                            ${(application.remainingBalance / 100).toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Next Payment</p>
                          <p className="font-medium">
                            {application.nextPaymentDate 
                              ? new Date(application.nextPaymentDate).toLocaleDateString()
                              : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedApplication(application)}
                    >
                      View Details
                    </Button>
                  </div>
                  {application.status === 'ACTIVE' && (
                    <div className="mt-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Payment Progress</span>
                        <span className="font-medium">
                          {Math.round((application.paidInstallments / application.installmentCount) * 100)}%
                        </span>
                      </div>
                      <Progress 
                        value={(application.paidInstallments / application.installmentCount) * 100} 
                        className="h-2"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Application Detail Dialog */}
      {selectedApplication && (
        <Dialog open={!!selectedApplication} onOpenChange={() => setSelectedApplication(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                BNPL Application Details
              </DialogTitle>
              <DialogDescription>
                {selectedApplication.merchantName} - {selectedApplication.productDescription}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              {/* Application Summary */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={getStatusBadge(selectedApplication.status)}>
                    {selectedApplication.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Purchase Amount</p>
                  <p className="font-medium text-lg">
                    ${(selectedApplication.purchaseAmount / 100).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Down Payment</p>
                  <p className="font-medium">
                    ${(selectedApplication.downPayment / 100).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Financed Amount</p>
                  <p className="font-medium">
                    ${(selectedApplication.financedAmount / 100).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Paid</p>
                  <p className="font-medium text-green-600">
                    ${(selectedApplication.totalPaid / 100).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Remaining Balance</p>
                  <p className="font-medium text-orange-600">
                    ${(selectedApplication.remainingBalance / 100).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Payment Schedule */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Payment Schedule
                </h4>
                <div className="space-y-2">
                  {selectedApplication.installments?.map((installment) => (
                    <div
                      key={installment.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-center min-w-[60px]">
                          <p className="text-xs text-muted-foreground">Payment</p>
                          <p className="font-semibold text-lg">#{installment.installmentNumber}</p>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={getInstallmentStatusBadge(installment.status)} variant="outline">
                              {installment.status}
                            </Badge>
                            <p className="text-sm text-muted-foreground">
                              Due: {new Date(installment.dueDate).toLocaleDateString()}
                            </p>
                          </div>
                          <p className="font-medium">
                            ${(installment.amount / 100).toFixed(2)}
                          </p>
                        </div>
                      </div>
                      {installment.status === 'SCHEDULED' && (
                        <Button
                          size="sm"
                          onClick={() => handlePayInstallment(installment.id)}
                          disabled={payingInstallment === installment.id}
                        >
                          {payingInstallment === installment.id ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Pay Now
                            </>
                          )}
                        </Button>
                      )}
                      {installment.status === 'PAID' && (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
