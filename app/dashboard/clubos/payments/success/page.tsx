
'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2, ArrowRight } from 'lucide-react';

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const registrationId = searchParams?.get('registrationId');
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    // Simulate verification delay
    const timer = setTimeout(() => {
      setIsVerifying(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (isVerifying) {
    return (
      <div className="container max-w-2xl py-16">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
            <p className="text-lg text-muted-foreground">Verifying your payment...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-16">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <CheckCircle2 className="h-24 w-24 text-green-500" />
          </div>
          <CardTitle className="text-center text-3xl">Payment Successful!</CardTitle>
          <CardDescription className="text-center text-lg">
            Thank you for your payment. Your registration has been updated.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-accent rounded-lg p-6 space-y-2">
            <p className="text-sm text-muted-foreground">What happens next?</p>
            <ul className="space-y-2 text-sm">
              <li>✓ You will receive a confirmation email with your receipt</li>
              <li>✓ Your registration status will be updated automatically</li>
              <li>✓ If fully paid, your registration will be activated</li>
            </ul>
          </div>

          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard/clubos/payments')}
              className="flex-1"
            >
              View Payments
            </Button>
            <Button
              onClick={() => router.push('/dashboard/clubos/register')}
              className="flex-1"
            >
              Back to Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
