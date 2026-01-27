
'use client';

/**
 * Loyalty Points Card Component
 * Display and manage loyalty rewards
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, Award, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

export function LoyaltyPointsCard() {
  const [loyaltyData, setLoyaltyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLoyaltyPoints();
  }, []);

  const loadLoyaltyPoints = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/payments/soshogle/loyalty');
      if (res.ok) {
        const data = await res.json();
        setLoyaltyData(data.loyaltyPoints || []);
      }
    } catch (error) {
      toast.error('Failed to load loyalty points');
    } finally {
      setLoading(false);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'platinum':
        return 'bg-slate-100 text-slate-800 border-slate-300';
      case 'gold':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'silver':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'bronze':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  const getTierProgress = (points: number): number => {
    // Example tier thresholds
    if (points < 1000) return (points / 1000) * 100;
    if (points < 5000) return ((points - 1000) / 4000) * 100;
    if (points < 10000) return ((points - 5000) / 5000) * 100;
    return 100;
  };

  const getNextTier = (tier: string): string => {
    const tiers = ['bronze', 'silver', 'gold', 'platinum'];
    const currentIndex = tiers.indexOf(tier.toLowerCase());
    if (currentIndex >= 0 && currentIndex < tiers.length - 1) {
      return tiers[currentIndex + 1];
    }
    return 'max';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" />
          Loyalty Rewards
        </CardTitle>
        <CardDescription>Track your rewards and benefits</CardDescription>
      </CardHeader>
      <CardContent>
        {loyaltyData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Award className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>No loyalty programs enrolled</p>
            <p className="text-sm mt-1">Start earning rewards with your first purchase</p>
          </div>
        ) : (
          <div className="space-y-6">
            {loyaltyData.map((loyalty) => (
              <div key={loyalty.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{loyalty.program?.name || 'Soshogle Rewards'}</p>
                    <p className="text-sm text-muted-foreground">
                      {loyalty.program?.description || 'Earn points on every purchase'}
                    </p>
                  </div>
                  <Badge className={getTierColor(loyalty.tier)} variant="outline">
                    {loyalty.tier?.toUpperCase() || 'BRONZE'}
                  </Badge>
                </div>

                <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border">
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-3xl font-bold">{loyalty.points || 0}</span>
                    <span className="text-sm text-muted-foreground">points</span>
                  </div>
                  
                  {getNextTier(loyalty.tier) !== 'max' && (
                    <div className="space-y-1">
                      <Progress value={getTierProgress(loyalty.points)} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        {getNextTier(loyalty.tier).charAt(0).toUpperCase() + 
                         getNextTier(loyalty.tier).slice(1)} tier at next milestone
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  {loyalty.lastEarnedAt && (
                    <div>
                      <p className="text-muted-foreground">Last Earned</p>
                      <p className="font-medium">
                        {new Date(loyalty.lastEarnedAt).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  {loyalty.lastRedeemedAt && (
                    <div>
                      <p className="text-muted-foreground">Last Redeemed</p>
                      <p className="font-medium">
                        {new Date(loyalty.lastRedeemedAt).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>

                {loyalty.program?.benefits && (
                  <div className="pt-3 border-t">
                    <p className="text-sm font-medium mb-2 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Your Benefits
                    </p>
                    <div className="space-y-1">
                      {loyalty.program.benefits.split(',').map((benefit: string, index: number) => (
                        <p key={index} className="text-sm text-muted-foreground">
                          • {benefit.trim()}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
