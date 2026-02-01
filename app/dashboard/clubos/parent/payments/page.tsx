
'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, DollarSign, AlertCircle, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import PaymentHistoryList from '@/components/clubos/payment-history-list';
import RegistrationPaymentForm from '@/components/clubos/registration-payment-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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

export default function ParentPaymentsPage() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const fetchRegistrations = async () => {
    try {
      const response = await fetch('/api/clubos/parent/payments/registrations');
      if (!response.ok) {
        throw new Error('Failed to fetch registrations');
      }
      const data = await response.json();
      setRegistrations(data.registrations || []);
    } catch (error: any) {
      console.error('Error fetching registrations:', error);
      toast.error('Failed to load payment information');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMakePayment = (registration: Registration) => {
    setSelectedRegistration(registration);
    setIsPaymentDialogOpen(true);
  };

  const handlePaymentSuccess = () => {
    setIsPaymentDialogOpen(false);
    fetchRegistrations();
    toast.success('Payment successful!');
  };

  const totalBalance = registrations.reduce((sum, reg) => sum + reg.balanceDue, 0);
  const totalPaid = registrations.reduce((sum, reg) => sum + reg.amountPaid, 0);
  const totalAmount = registrations.reduce((sum, reg) => sum + reg.totalAmount, 0);

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
          Manage payments and view transaction history
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Due</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              ${(totalBalance / 100).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Outstanding balance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${(totalPaid / 100).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Payments received
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(totalAmount / 100).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              All registrations
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Outstanding Balances */}
      {registrations.filter((r) => r.balanceDue > 0).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Outstanding Balances</CardTitle>
            <CardDescription>Registrations with pending payments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {registrations
                .filter((reg) => reg.balanceDue > 0)
                .map((reg) => (
                  <div
                    key={reg.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {reg.member.firstName} {reg.member.lastName}
                        </p>
                        <Badge variant="outline">{reg.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{reg.program.name}</p>
                      {reg.division && (
                        <p className="text-xs text-muted-foreground">{reg.division.name}</p>
                      )}
                      <div className="text-sm">
                        <span className="text-muted-foreground">Paid: </span>
                        <span className="font-medium">${(reg.amountPaid / 100).toFixed(2)}</span>
                        <span className="text-muted-foreground"> of ${(reg.totalAmount / 100).toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Balance Due</p>
                        <p className="text-xl font-bold text-orange-600">
                          ${(reg.balanceDue / 100).toFixed(2)}
                        </p>
                      </div>
                      <Button onClick={() => handleMakePayment(reg)}>
                        Pay Now
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      <PaymentHistoryList />

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Make Payment</DialogTitle>
            <DialogDescription>
              Complete your payment securely using Stripe
            </DialogDescription>
          </DialogHeader>
          {selectedRegistration && (
            <RegistrationPaymentForm
              registration={selectedRegistration}
              onSuccess={handlePaymentSuccess}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
