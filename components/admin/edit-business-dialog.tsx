/**
 * Edit Business Dialog
 * Allows admins to modify user settings, features, and subscription
 */

'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Save } from 'lucide-react';
import { getAllFeatures } from '@/lib/industry-menu-config';

interface User {
  id: string;
  name: string | null;
  email: string;
  industry: string | null;
  accountStatus: string;
  subscriptionTier: string;
  suspendedReason: string | null;
  featureCount: number;
}

interface EditBusinessDialogProps {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function EditBusinessDialog({
  user,
  open,
  onOpenChange,
  onSuccess,
}: EditBusinessDialogProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  // Basic Info State
  const [industry, setIndustry] = useState(user.industry || '');
  const [accountStatus, setAccountStatus] = useState(user.accountStatus);
  const [suspendedReason, setSuspendedReason] = useState(user.suspendedReason || '');

  // Features State
  const [features, setFeatures] = useState<Record<string, boolean>>({});
  const [featuresLoading, setFeaturesLoading] = useState(true);

  // Subscription State
  const [subscriptionTier, setSubscriptionTier] = useState(user.subscriptionTier);
  const [subscriptionStatus, setSubscriptionStatus] = useState('ACTIVE');
  const [basePriceUSD, setBasePriceUSD] = useState('0');

  useEffect(() => {
    if (open) {
      fetchFeatureToggles();
    }
  }, [open, user.id]);

  const fetchFeatureToggles = async () => {
    try {
      setFeaturesLoading(true);
      const response = await fetch(`/api/admin/users/${user.id}/features`);
      if (!response.ok) throw new Error('Failed to fetch features');

      const data = await response.json();
      
      // Convert array to object for easier management
      const featuresMap: Record<string, boolean> = {};
      data.featureToggles.forEach((toggle: any) => {
        featuresMap[toggle.feature] = toggle.enabled;
      });
      
      setFeatures(featuresMap);
    } catch (error: any) {
      console.error('Failed to fetch features:', error);
    } finally {
      setFeaturesLoading(false);
    }
  };

  const handleSaveBasic = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          industry,
          accountStatus,
          suspendedReason: accountStatus === 'SUSPENDED' ? suspendedReason : null,
        }),
      });

      if (!response.ok) throw new Error('Failed to update user');

      toast.success('Basic info updated successfully');
      onSuccess();
    } catch (error: any) {
      toast.error('Failed to update user', {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFeatures = async () => {
    try {
      setLoading(true);
      
      // Convert features object to array
      const featuresArray = Object.entries(features).map(([feature, enabled]) => ({
        feature,
        enabled,
      }));

      const response = await fetch(`/api/admin/users/${user.id}/features`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ features: featuresArray }),
      });

      if (!response.ok) throw new Error('Failed to update features');

      toast.success('Features updated successfully');
      onSuccess();
    } catch (error: any) {
      toast.error('Failed to update features', {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSubscription = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/users/${user.id}/subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier: subscriptionTier,
          status: subscriptionStatus,
          basePriceUSD: parseFloat(basePriceUSD),
        }),
      });

      if (!response.ok) throw new Error('Failed to update subscription');

      toast.success('Subscription updated successfully');
      onSuccess();
    } catch (error: any) {
      toast.error('Failed to update subscription', {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const allFeatures = getAllFeatures();
  const groupedFeatures = allFeatures.reduce((acc, feature) => {
    if (!acc[feature.category]) {
      acc[feature.category] = [];
    }
    acc[feature.category].push(feature);
    return acc;
  }, {} as Record<string, typeof allFeatures>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Business: {user.name || user.email}</DialogTitle>
          <DialogDescription>
            Manage business settings, features, and subscription
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="features">Features ({user.featureCount})</TabsTrigger>
            <TabsTrigger value="subscription">Subscription</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="space-y-2">
              <Label>Industry</Label>
              <Select value={industry} onValueChange={setIndustry}>
                <SelectTrigger>
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACCOUNTING">Accounting</SelectItem>
                  <SelectItem value="RESTAURANT">Restaurant</SelectItem>
                  <SelectItem value="SPORTS_CLUB">Sports Club</SelectItem>
                  <SelectItem value="CONSTRUCTION">Construction</SelectItem>
                  <SelectItem value="LAW">Law</SelectItem>
                  <SelectItem value="DENTIST">Dentist</SelectItem>
                  <SelectItem value="MEDICAL">Medical</SelectItem>
                  <SelectItem value="MEDICAL_SPA">Medical Spa</SelectItem>
                  <SelectItem value="OPTOMETRIST">Optometrist</SelectItem>
                  <SelectItem value="HEALTH_CLINIC">Health Clinic</SelectItem>
                  <SelectItem value="REAL_ESTATE">Real Estate</SelectItem>
                  <SelectItem value="HOSPITAL">Hospital</SelectItem>
                  <SelectItem value="TECHNOLOGY">Technology</SelectItem>
                  <SelectItem value="ORTHODONTIST">Orthodontist</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Account Status</Label>
              <Select value={accountStatus} onValueChange={setAccountStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="TRIAL">Trial</SelectItem>
                  <SelectItem value="SUSPENDED">Suspended</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  <SelectItem value="DISABLED">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {accountStatus === 'SUSPENDED' && (
              <div className="space-y-2">
                <Label>Suspension Reason</Label>
                <Textarea
                  value={suspendedReason}
                  onChange={(e) => setSuspendedReason(e.target.value)}
                  placeholder="Explain why this account is suspended..."
                  rows={3}
                />
              </div>
            )}

            <Button onClick={handleSaveBasic} disabled={loading} className="w-full">
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Save className="h-4 w-4 mr-2" />
              Save Basic Info
            </Button>
          </TabsContent>

          <TabsContent value="features" className="space-y-4">
            {featuresLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <>
                <div className="space-y-6">
                  {Object.entries(groupedFeatures).map(([category, categoryFeatures]) => (
                    <div key={category} className="space-y-3">
                      <h4 className="font-semibold text-sm text-muted-foreground">
                        {category}
                      </h4>
                      <div className="space-y-2">
                        {categoryFeatures.map((feature) => (
                          <div key={feature.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={feature.id}
                              checked={features[feature.id] || false}
                              onCheckedChange={(checked) => {
                                setFeatures((prev) => ({
                                  ...prev,
                                  [feature.id]: checked as boolean,
                                }));
                              }}
                            />
                            <Label htmlFor={feature.id} className="cursor-pointer">
                              {feature.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <Button onClick={handleSaveFeatures} disabled={loading} className="w-full">
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Save className="h-4 w-4 mr-2" />
                  Save Features
                </Button>
              </>
            )}
          </TabsContent>

          <TabsContent value="subscription" className="space-y-4">
            <div className="space-y-2">
              <Label>Subscription Tier</Label>
              <Select value={subscriptionTier} onValueChange={setSubscriptionTier}>
                <SelectTrigger>
                  <SelectValue placeholder="Select tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FREE">Free</SelectItem>
                  <SelectItem value="PRO">Pro</SelectItem>
                  <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Subscription Status</Label>
              <Select value={subscriptionStatus} onValueChange={setSubscriptionStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="TRIALING">Trialing</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  <SelectItem value="PAST_DUE">Past Due</SelectItem>
                  <SelectItem value="INCOMPLETE">Incomplete</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Base Price (USD/month)</Label>
              <Input
                type="number"
                value={basePriceUSD}
                onChange={(e) => setBasePriceUSD(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
              <p className="text-sm text-muted-foreground">
                Set monthly base price for this user (0 for free tier)
              </p>
            </div>

            <Button onClick={handleSaveSubscription} disabled={loading} className="w-full">
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Save className="h-4 w-4 mr-2" />
              Save Subscription
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
