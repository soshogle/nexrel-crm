
'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DeliveryOrdersList } from '@/components/delivery/delivery-orders-list';
import { DriversList } from '@/components/delivery/drivers-list';
import { Package, Users, TrendingUp } from 'lucide-react';

interface DeliveryAnalytics {
  totalOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  totalCommission: number;
  averageOrderValue: number;
  deliveryRate: number;
}

export default function DeliveryPage() {
  const [activeTab, setActiveTab] = useState('orders');
  const [analytics, setAnalytics] = useState<DeliveryAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setAnalyticsLoading(true);
        setAnalyticsError(null);
        const res = await fetch('/api/delivery/analytics?period=month');
        if (!res.ok) {
          throw new Error('Failed to load delivery analytics');
        }
        const data = await res.json();
        setAnalytics(data);
      } catch (error: any) {
        setAnalyticsError(error?.message || 'Failed to load analytics');
      } finally {
        setAnalyticsLoading(false);
      }
    };
    loadAnalytics();
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Delivery Management</h1>
        <p className="text-muted-foreground">
          Manage delivery orders, drivers, and track performance
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="orders" className="gap-2">
            <Package className="h-4 w-4" />
            Orders
          </TabsTrigger>
          <TabsTrigger value="drivers" className="gap-2">
            <Users className="h-4 w-4" />
            Drivers
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Orders Tab */}
        <TabsContent value="orders" className="space-y-6">
          <DeliveryOrdersList />
        </TabsContent>

        {/* Drivers Tab */}
        <TabsContent value="drivers" className="space-y-6">
          <DriversList />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          {analyticsError ? (
            <Card>
              <CardHeader>
                <CardTitle>Delivery Analytics</CardTitle>
                <CardDescription>Performance metrics and insights</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-red-600">{analyticsError}</div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analyticsLoading ? '...' : (analytics?.totalOrders ?? 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">Last 30 days</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Delivered</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analyticsLoading ? '...' : (analytics?.deliveredOrders ?? 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {analyticsLoading ? '...' : `${(analytics?.deliveryRate ?? 0).toFixed(1)}% success rate`}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analyticsLoading ? '...' : `$${(analytics?.totalRevenue ?? 0).toFixed(2)}`}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Avg order: {analyticsLoading ? '...' : `$${(analytics?.averageOrderValue ?? 0).toFixed(2)}`}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Commission</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analyticsLoading ? '...' : `$${(analytics?.totalCommission ?? 0).toFixed(2)}`}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Cancelled: {analyticsLoading ? '...' : (analytics?.cancelledOrders ?? 0)}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
          {!analyticsLoading && !analyticsError && analytics && analytics.totalOrders === 0 && (
            <Card>
              <CardContent>
                <div className="py-6 text-sm text-muted-foreground">
                  No delivery activity in the selected period yet.
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
