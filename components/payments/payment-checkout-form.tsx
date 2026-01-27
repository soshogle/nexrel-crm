
'use client';

/**
 * Payment Checkout Form Component
 * Handles payment processing with Soshogle Pay
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CreditCard, Wallet, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

interface PaymentCheckoutFormProps {
  amount?: number;
  description?: string;
  onSuccess?: (paymentIntent: any) => void;
  onCancel?: () => void;
}

export function PaymentCheckoutForm({
  amount: initialAmount,
  description,
  onSuccess,
  onCancel,
}: PaymentCheckoutFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState(initialAmount?.toString() || '');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'wallet' | 'bnpl'>('card');
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState('');
  const [walletBalance, setWalletBalance] = useState(0);

  // Load payment methods and wallet on mount
  useState(() => {
    loadPaymentData();
  });

  const loadPaymentData = async () => {
    try {
      // Load saved payment methods
      const methodsRes = await fetch('/api/payments/soshogle/payment-methods');
      if (methodsRes.ok) {
        const data = await methodsRes.json();
        setPaymentMethods(data.methods || []);
        
        // Set default method if available
        const defaultMethod = data.methods?.find((m: any) => m.isDefault);
        if (defaultMethod) {
          setSelectedMethodId(defaultMethod.id);
        }
      }

      // Load wallet balance
      const walletRes = await fetch('/api/payments/soshogle/wallet');
      if (walletRes.ok) {
        const data = await walletRes.json();
        setWalletBalance(data.wallet?.balance || 0);
      }
    } catch (error) {
      console.error('Error loading payment data:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const amountValue = parseFloat(amount);
    if (!amountValue || amountValue <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setLoading(true);

    try {
      if (paymentMethod === 'wallet') {
        await handleWalletPayment(amountValue);
      } else if (paymentMethod === 'card') {
        await handleCardPayment(amountValue);
      } else if (paymentMethod === 'bnpl') {
        await handleBNPLPayment(amountValue);
      }
    } catch (error: any) {
      toast.error(error.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCardPayment = async (amountValue: number) => {
    // Convert to cents
    const amountInCents = Math.round(amountValue * 100);

    // Create payment intent
    const intentRes = await fetch('/api/payments/soshogle/intents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: amountInCents,
        currency: 'USD',
        description: description || 'Payment',
        paymentMethodId: selectedMethodId || undefined,
      }),
    });

    if (!intentRes.ok) {
      const error = await intentRes.json();
      throw new Error(error.error || 'Failed to create payment intent');
    }

    const { paymentIntent } = await intentRes.json();

    // Confirm payment
    if (selectedMethodId) {
      const confirmRes = await fetch(
        `/api/payments/soshogle/intents/${paymentIntent.id}/confirm`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentMethodId: selectedMethodId }),
        }
      );

      if (!confirmRes.ok) {
        const error = await confirmRes.json();
        throw new Error(error.error || 'Payment confirmation failed');
      }

      const { paymentIntent: confirmedIntent } = await confirmRes.json();
      
      toast.success('Payment successful!');
      onSuccess?.(confirmedIntent);
      router.push('/dashboard/payments/success');
    } else {
      toast.info('Please add a payment method to continue');
      router.push('/dashboard/settings?tab=payment-methods');
    }
  };

  const handleWalletPayment = async (amountValue: number) => {
    if (walletBalance < amountValue) {
      throw new Error('Insufficient wallet balance');
    }

    const res = await fetch('/api/payments/soshogle/wallet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: amountValue,
        type: 'debit',
        description: description || 'Payment from wallet',
      }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Wallet payment failed');
    }

    toast.success('Payment successful!');
    onSuccess?.({ method: 'wallet', amount: amountValue });
    router.push('/dashboard/payments/success');
  };

  const handleBNPLPayment = async (amountValue: number) => {
    toast.info('BNPL financing is coming soon!');
    // Future implementation for Buy Now Pay Later
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Checkout
        </CardTitle>
        <CardDescription>
          {description || 'Complete your payment securely'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Amount Input */}
          {!initialAmount && (
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (USD)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="pl-9"
                  required
                />
              </div>
            </div>
          )}

          {initialAmount && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Amount to pay</p>
              <p className="text-2xl font-bold">${initialAmount.toFixed(2)}</p>
            </div>
          )}

          {/* Payment Method Selection */}
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select
              value={paymentMethod}
              onValueChange={(value: any) => setPaymentMethod(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="card">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    <span>Credit/Debit Card</span>
                  </div>
                </SelectItem>
                <SelectItem value="wallet">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    <span>Wallet (Balance: ${walletBalance.toFixed(2)})</span>
                  </div>
                </SelectItem>
                <SelectItem value="bnpl">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    <span>Buy Now Pay Later</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Saved Payment Methods */}
          {paymentMethod === 'card' && paymentMethods.length > 0 && (
            <div className="space-y-2">
              <Label>Saved Cards</Label>
              <Select value={selectedMethodId} onValueChange={setSelectedMethodId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a card" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.id} value={method.id}>
                      {method.brand} •••• {method.last4}
                      {method.isDefault && ' (Default)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Pay ${parseFloat(amount || initialAmount?.toString() || '0').toFixed(2)}
                </>
              )}
            </Button>
            
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={loading}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
