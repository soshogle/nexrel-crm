
'use client';

/**
 * Billing Upgrade Card
 * Shows current plan and upgrade options
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { CreditCard, Loader2, Check, X } from 'lucide-react';
import { SUBSCRIPTION_PLANS } from '@/lib/payments/stripe-subscription-service';

type SubscriptionTier = 'FREE' | 'PRO' | 'ENTERPRISE';

interface Subscription {
  tier: SubscriptionTier;
  status: string;
  plan: {
    name: string;
    price: number;
    features: Record<string, any>;
  };
}

export default function BillingUpgradeCard() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/billing/subscription');
      if (!response.ok) {
        throw new Error('Failed to fetch subscription');
      }

      const data = await response.json();
      setSubscription(data);
    } catch (error: any) {
      console.error('Failed to fetch subscription:', error);
      toast.error(error.message || 'Failed to fetch subscription');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (tier: 'PRO' | 'ENTERPRISE') => {
    setUpgrading(true);
    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const data = await response.json();
      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (error: any) {
      console.error('Failed to upgrade:', error);
      toast.error(error.message || 'Failed to start upgrade process');
      setUpgrading(false);
    }
  };

  const handleManageBilling = async () => {
    setUpgrading(true);
    try {
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to create portal session');
      }

      const data = await response.json();
      // Redirect to Stripe Customer Portal
      window.location.href = data.url;
    } catch (error: any) {
      console.error('Failed to open billing portal:', error);
      toast.error(error.message || 'Failed to open billing portal');
      setUpgrading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!subscription) {
    return null;
  }

  const currentTier = subscription.tier;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>Manage your subscription</CardDescription>
            </div>
            <Badge className="text-lg px-4 py-2">
              {subscription.plan.name}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Your Features:</h4>
              <ul className="space-y-2">
                {Object.entries(subscription.plan.features).map(([key, value]) => {
                  if (typeof value === 'boolean') {
                    return (
                      <li key={key} className="flex items-center gap-2">
                        {value ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <X className="h-4 w-4 text-red-600" />
                        )}
                        <span className="text-sm capitalize">
                          {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                        </span>
                      </li>
                    );
                  }
                  return (
                    <li key={key} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm capitalize">
                        {key.replace(/([A-Z])/g, ' $1').toLowerCase()}: {value === -1 ? 'Unlimited' : value}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            {currentTier !== 'FREE' && (
              <Button onClick={handleManageBilling} disabled={upgrading} className="w-full">
                <CreditCard className="h-4 w-4 mr-2" />
                Manage Billing
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upgrade Options */}
      {currentTier !== 'ENTERPRISE' && (
        <div className="grid gap-4 md:grid-cols-2">
          {currentTier === 'FREE' && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Pro Plan</CardTitle>
                  <CardDescription>$79/month</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm">5,000 contacts</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm">5 voice agents</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm">1,000 voice minutes/month</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Priority support</span>
                    </li>
                  </ul>
                  <Button
                    onClick={() => handleUpgrade('PRO')}
                    disabled={upgrading}
                    className="w-full"
                  >
                    Upgrade to Pro
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Enterprise Plan</CardTitle>
                  <CardDescription>$299/month</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Unlimited contacts</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Unlimited voice agents</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm">10,000 voice minutes/month</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Dedicated support</span>
                    </li>
                  </ul>
                  <Button
                    onClick={() => handleUpgrade('ENTERPRISE')}
                    disabled={upgrading}
                    className="w-full"
                  >
                    Upgrade to Enterprise
                  </Button>
                </CardContent>
              </Card>
            </>
          )}

          {currentTier === 'PRO' && (
            <Card>
              <CardHeader>
                <CardTitle>Enterprise Plan</CardTitle>
                <CardDescription>$299/month</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Unlimited contacts</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Unlimited voice agents</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm">10,000 voice minutes/month</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Dedicated support</span>
                  </li>
                </ul>
                <Button
                  onClick={() => handleUpgrade('ENTERPRISE')}
                  disabled={upgrading}
                  className="w-full"
                >
                  Upgrade to Enterprise
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
