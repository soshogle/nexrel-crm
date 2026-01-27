
'use client';

/**
 * Quick Pay Button Component
 * Fast payment with default payment method
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Zap, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface QuickPayButtonProps {
  amount: number;
  description?: string;
  onSuccess?: () => void;
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'default' | 'sm' | 'lg';
}

export function QuickPayButton({
  amount,
  description,
  onSuccess,
  variant = 'default',
  size = 'default',
}: QuickPayButtonProps) {
  const [open, setOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleQuickPay = async () => {
    setProcessing(true);
    setSuccess(false);

    try {
      const res = await fetch('/api/payments/soshogle/checkout/quick-pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Math.round(amount * 100), // Convert to cents
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Payment failed');
      }

      setSuccess(true);
      toast.success('Payment successful!');
      
      // Wait 1 second to show success state
      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
        onSuccess?.();
      }, 1000);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size}>
          <Zap className="mr-2 h-4 w-4" />
          Quick Pay ${amount.toFixed(2)}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Quick Pay</DialogTitle>
          <DialogDescription>
            {description || 'Process payment with your default payment method'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-6 bg-muted rounded-lg text-center">
            <p className="text-sm text-muted-foreground mb-1">Amount to charge</p>
            <p className="text-4xl font-bold">${amount.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-2">USD</p>
          </div>

          {success ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <p className="text-lg font-semibold text-green-700">Payment Successful!</p>
            </div>
          ) : (
            <div className="flex gap-3">
              <Button
                onClick={handleQuickPay}
                disabled={processing}
                className="flex-1"
              >
                {processing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-4 w-4" />
                    Confirm Payment
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={processing}
              >
                Cancel
              </Button>
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center">
            Payment will be charged to your default payment method
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
