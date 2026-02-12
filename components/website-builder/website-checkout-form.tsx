'use client';

import { useState, useEffect } from 'react';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Loader2, CreditCard, CheckCircle2, ShoppingCart } from 'lucide-react';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string | null;
}

interface WebsiteCheckoutFormProps {
  websiteId: string;
  websiteName?: string;
  items: CartItem[];
  successUrl?: string;
  onSuccess?: () => void;
}

function CheckoutFormInner({
  websiteId,
  websiteName,
  items,
  clientSecret,
  successUrl,
  onSuccess,
}: WebsiteCheckoutFormProps & { clientSecret: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: successUrl || `${window.location.origin}/order-status/pending`,
        },
      });

      if (error) {
        setErrorMessage(error.message || 'Payment failed');
        toast.error(error.message || 'Payment failed');
      } else {
        setPaymentSuccess(true);
        toast.success('Payment successful!');
        onSuccess?.();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred');
      toast.error(err.message || 'An unexpected error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  if (paymentSuccess) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-center">Order Placed!</CardTitle>
          <CardDescription className="text-center">
            Your payment has been processed. You will receive a confirmation email shortly.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Checkout {websiteName && `- ${websiteName}`}
          </CardTitle>
          <CardDescription>Complete your purchase securely</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border p-3 bg-muted/50">
            <p className="text-sm font-medium mb-2">Order Summary</p>
            {items.map((item) => (
              <div key={item.productId} className="flex justify-between text-sm">
                <span>{item.name} × {item.quantity}</span>
                <span>${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div className="flex justify-between font-medium mt-2 pt-2 border-t">
              <span>Total</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Payment</Label>
            <PaymentElement />
          </div>

          {errorMessage && (
            <Alert variant="destructive">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={!stripe || isProcessing}>
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-4 w-4" />
                Pay ${subtotal.toFixed(2)}
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}

export function WebsiteCheckoutForm({
  websiteId,
  websiteName,
  items,
  customerName,
  customerEmail,
  customerPhone,
  successUrl,
  onSuccess,
}: WebsiteCheckoutFormProps & {
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!websiteId || items.length === 0 || !customerEmail) {
      setLoading(false);
      setError('Please provide email and cart items');
      return;
    }

    const createCheckout = async () => {
      try {
        const res = await fetch(`/api/websites/${websiteId}/store/checkout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
            customerName,
            customerEmail,
            customerPhone,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Checkout failed');
        setClientSecret(data.clientSecret);
      } catch (err: any) {
        setError(err.message || 'Failed to create checkout');
        toast.error(err.message || 'Failed to create checkout');
      } finally {
        setLoading(false);
      }
    };

    createCheckout();
  }, [websiteId, JSON.stringify(items), customerEmail, customerName, customerPhone]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 flex flex-col items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">Preparing checkout...</p>
        </CardContent>
      </Card>
    );
  }

  if (error || !clientSecret) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error || 'Could not start checkout'}</AlertDescription>
      </Alert>
    );
  }

  const options: StripeElementsOptions = {
    clientSecret,
    appearance: { theme: 'stripe' },
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      <CheckoutFormInner
        websiteId={websiteId}
        websiteName={websiteName}
        items={items}
        clientSecret={clientSecret}
        successUrl={successUrl}
        onSuccess={onSuccess}
      />
    </Elements>
  );
}
