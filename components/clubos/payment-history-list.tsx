
'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Receipt, Download, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface Payment {
  id: string;
  amount: number;
  paymentMethod: string;
  status: string;
  description: string | null;
  paidAt: string | null;
  createdAt: string;
  stripeReceiptUrl: string | null;
  registration?: {
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
  };
}

interface PaymentHistoryProps {
  registrationId?: string;
  householdId?: string;
}

export default function PaymentHistoryList({ registrationId, householdId }: PaymentHistoryProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPayments = async () => {
    try {
      const params = new URLSearchParams();
      if (registrationId) params.append('registrationId', registrationId);
      if (householdId) params.append('householdId', householdId);

      const response = await fetch(`/api/clubos/payments?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch payments');
      }

      const data = await response.json();
      setPayments(data.payments || []);
    } catch (error: any) {
      console.error('Error fetching payments:', error);
      toast.error('Failed to load payment history');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [registrationId, householdId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-500';
      case 'PENDING':
        return 'bg-yellow-500';
      case 'PROCESSING':
        return 'bg-blue-500';
      case 'FAILED':
        return 'bg-red-500';
      case 'REFUNDED':
      case 'PARTIALLY_REFUNDED':
        return 'bg-gray-500';
      default:
        return 'bg-gray-400';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>View all payment transactions</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={fetchPayments}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No payment history found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(payment.status)}>
                      {payment.status}
                    </Badge>
                    <span className="font-medium">${(payment.amount / 100).toFixed(2)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {payment.description || 'Payment'}
                  </p>
                  {payment.registration && (
                    <p className="text-sm text-muted-foreground">
                      {payment.registration.member.firstName} {payment.registration.member.lastName} -{' '}
                      {payment.registration.program.name}
                      {payment.registration.division && ` (${payment.registration.division.name})`}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {payment.paidAt
                      ? `Paid on ${format(new Date(payment.paidAt), 'MMM d, yyyy h:mm a')}`
                      : `Created on ${format(new Date(payment.createdAt), 'MMM d, yyyy h:mm a')}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Payment Method: {payment.paymentMethod.replace('_', ' ')}
                  </p>
                </div>
                {payment.stripeReceiptUrl && payment.status === 'PAID' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                  >
                    <a href={payment.stripeReceiptUrl} target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4 mr-2" />
                      Receipt
                    </a>
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
