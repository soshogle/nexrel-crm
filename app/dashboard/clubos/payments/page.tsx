
'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, DollarSign, Receipt, CreditCard, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import RegistrationPaymentForm from '@/components/clubos/registration-payment-form';
import PaymentHistoryList from '@/components/clubos/payment-history-list';

interface Registration {
  id: string;
  status: string;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  member: {
    firstName: string;
    lastName: string;
  };
  program: {
    name: string;
  };
  division?: {
    name: string;
  };
}

export default function ClubOSPaymentsPage() {
  const { data: session } = useSession() || {};
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch registrations with outstanding balances
        const regResponse = await fetch('/api/clubos/registrations');
        if (!regResponse.ok) throw new Error('Failed to fetch registrations');
        const regData = await regResponse.json();
        
        // Filter registrations with balances
        const withBalance = (regData.registrations || []).filter(
          (r: Registration) => r.balanceDue > 0
        );
        setRegistrations(withBalance);

        // Fetch payment statistics
        const statsResponse = await fetch('/api/clubos/payments/statistics');
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats(statsData);
        }
      } catch (error: any) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load payment information');
      } finally {
        setIsLoading(false);
      }
    };

    if (session?.user) {
      fetchData();
    }
  }, [session]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-7xl py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Payments</h1>
        <p className="text-muted-foreground">
          Manage registration payments and view payment history
        </p>
      </div>

      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${(stats.totalRevenue / 100).toFixed(2)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPayments}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingPayments}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed Payments</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.failedPayments}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="outstanding" className="space-y-4">
        <TabsList>
          <TabsTrigger value="outstanding">Outstanding Balances</TabsTrigger>
          <TabsTrigger value="history">Payment History</TabsTrigger>
        </TabsList>

        <TabsContent value="outstanding" className="space-y-4">
          {registrations.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <DollarSign className="h-12 w-12 mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No outstanding balances</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Select Registration to Pay</CardTitle>
                    <CardDescription>Choose a registration with an outstanding balance</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {registrations.map((registration) => (
                      <div
                        key={registration.id}
                        onClick={() => setSelectedRegistration(registration)}
                        className={`p-4 border rounded-lg cursor-pointer transition-all hover:border-primary ${
                          selectedRegistration?.id === registration.id
                            ? 'border-primary bg-accent'
                            : ''
                        }`}
                      >
                        <div className="space-y-1">
                          <p className="font-medium">
                            {registration.member.firstName} {registration.member.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {registration.program.name}
                            {registration.division && ` - ${registration.division.name}`}
                          </p>
                          <p className="text-lg font-bold text-primary">
                            Balance Due: ${(registration.balanceDue / 100).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              <div>
                {selectedRegistration ? (
                  <RegistrationPaymentForm
                    registration={selectedRegistration}
                    onSuccess={() => {
                      toast.success('Payment successful!');
                      setSelectedRegistration(null);
                      // Refresh data
                      window.location.reload();
                    }}
                  />
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <CreditCard className="h-12 w-12 mb-4 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground">Select a registration to make a payment</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="history">
          <PaymentHistoryList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
