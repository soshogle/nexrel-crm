
'use client';

/**
 * Admin Subscription Manager Component
 * Manage user subscriptions and billing
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { CreditCard, DollarSign, Users, Activity } from 'lucide-react';

type SubscriptionTier = 'FREE' | 'PRO' | 'ENTERPRISE';

interface Subscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  status: string;
  monthlyMinutes: number;
  minutesUsed: number;
  overage: number;
  basePriceUSD: number;
  totalChargesUSD: number;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  user: {
    id: string;
    email: string;
    name?: string;
    businessName?: string;
  };
}

interface Props {
  subscription: Subscription;
  onUpdate: () => void;
}

export default function SubscriptionManager({ subscription, onUpdate }: Props) {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>(subscription.tier);
  const [isUpdating, setIsUpdating] = useState(false);

  const getTierColor = (tier: SubscriptionTier) => {
    switch (tier) {
      case 'FREE':
        return 'bg-gray-100 text-gray-800';
      case 'PRO':
        return 'bg-blue-100 text-blue-800';
      case 'ENTERPRISE':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'TRIALING':
        return 'bg-yellow-100 text-yellow-800';
      case 'PAST_DUE':
        return 'bg-red-100 text-red-800';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleUpdateTier = async () => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/admin/users/${subscription.userId}/subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upgrade',
          tier: selectedTier,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update subscription');
      }

      toast.success('Subscription updated successfully');
      setIsDialogOpen(false);
      onUpdate();
    } catch (error: any) {
      console.error('Failed to update subscription:', error);
      toast.error(error.message || 'Failed to update subscription');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelSubscription = async (immediate: boolean) => {
    if (!confirm(`Are you sure you want to ${immediate ? 'immediately' : 'schedule'} cancel this subscription?`)) {
      return;
    }

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/admin/users/${subscription.userId}/subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cancel',
          immediate,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel subscription');
      }

      toast.success(immediate ? 'Subscription cancelled immediately' : 'Subscription scheduled for cancellation');
      onUpdate();
    } catch (error: any) {
      console.error('Failed to cancel subscription:', error);
      toast.error(error.message || 'Failed to cancel subscription');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleResetUsage = async () => {
    if (!confirm('Are you sure you want to reset this user\'s usage?')) {
      return;
    }

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/admin/users/${subscription.userId}/subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset-usage',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reset usage');
      }

      toast.success('Usage reset successfully');
      onUpdate();
    } catch (error: any) {
      console.error('Failed to reset usage:', error);
      toast.error(error.message || 'Failed to reset usage');
    } finally {
      setIsUpdating(false);
    }
  };

  const usagePercentage = (subscription.minutesUsed / subscription.monthlyMinutes) * 100;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Plan</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subscription.tier}</div>
            <Badge className={`mt-2 ${getTierColor(subscription.tier)}`}>
              {subscription.tier}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subscription.status}</div>
            <Badge className={`mt-2 ${getStatusColor(subscription.status)}`}>
              {subscription.status}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Charge</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${subscription.totalChargesUSD.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Base: ${subscription.basePriceUSD} + Overage: ${(subscription.overage * 0.15).toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Voice Minutes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {subscription.minutesUsed.toFixed(0)} / {subscription.monthlyMinutes}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className={`h-2 rounded-full ${
                  usagePercentage > 100 ? 'bg-red-500' : usagePercentage > 80 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(usagePercentage, 100)}%` }}
              />
            </div>
            {subscription.overage > 0 && (
              <p className="text-xs text-red-600 mt-1">
                Overage: {subscription.overage.toFixed(0)} minutes
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2">
        <Button onClick={() => setIsDialogOpen(true)}>
          Change Plan
        </Button>
        <Button variant="outline" onClick={handleResetUsage} disabled={isUpdating}>
          Reset Usage
        </Button>
        <Button variant="outline" onClick={() => handleCancelSubscription(false)} disabled={isUpdating}>
          Schedule Cancellation
        </Button>
        <Button variant="destructive" onClick={() => handleCancelSubscription(true)} disabled={isUpdating}>
          Cancel Immediately
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Subscription Plan</DialogTitle>
            <DialogDescription>
              Update {subscription.user.businessName || subscription.user.email}'s subscription tier.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Select Plan</label>
              <Select value={selectedTier} onValueChange={(value) => setSelectedTier(value as SubscriptionTier)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FREE">Free - $0/month</SelectItem>
                  <SelectItem value="PRO">Pro - $79/month</SelectItem>
                  <SelectItem value="ENTERPRISE">Enterprise - $299/month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateTier} disabled={isUpdating}>
              {isUpdating ? 'Updating...' : 'Update Plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
