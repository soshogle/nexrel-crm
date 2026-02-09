/**
 * Stock Dashboard Component
 * Displays stock status, alerts, and analytics for a website
 */

'use client';

import { useState, useEffect } from 'react';
import { Package, AlertTriangle, TrendingUp, TrendingDown, Activity, RefreshCw, Brain, Settings, BarChart3, ShoppingBag } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import Link from 'next/link';
import { StockSettings } from './stock-settings';
import { EnhancedAnalytics } from './enhanced-analytics';
import { ProductManagement } from './product-management';

interface StockDashboardProps {
  websiteId: string;
}

export function StockDashboard({ websiteId }: StockDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [stockStatus, setStockStatus] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, [websiteId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statusRes, analyticsRes, predictionsRes, alertsRes] = await Promise.all([
        fetch(`/api/websites/${websiteId}/stock`),
        fetch(`/api/websites/${websiteId}/analytics`),
        fetch(`/api/websites/${websiteId}/restocking/predict`),
        fetch(`/api/websites/${websiteId}/stock/alerts`),
      ]);

      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setStockStatus(statusData.status);
      }

      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        setAnalytics(analyticsData.analytics);
      }

      if (predictionsRes.ok) {
        const predictionsData = await predictionsRes.json();
        setPredictions(predictionsData.predictions || []);
      }

      if (alertsRes.ok) {
        const alertsData = await alertsRes.json();
        setAlerts(alertsData.alerts);
      }
    } catch (error) {
      console.error('Error fetching stock data:', error);
      toast.error('Failed to load stock data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const healthScore = stockStatus?.healthScore || 0;
  const healthColor = healthScore >= 80 ? 'text-green-600' : healthScore >= 60 ? 'text-yellow-600' : 'text-red-600';

  return (
    <Tabs defaultValue="overview" className="space-y-6">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="products">Products</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-6">
      {/* Health Score Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Inventory Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Overall Health Score</span>
              <span className={`text-2xl font-bold ${healthColor}`}>{healthScore}</span>
            </div>
            <Progress value={healthScore} className="h-2" />
            {stockStatus?.summary && (
              <div className="grid grid-cols-4 gap-4 mt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{stockStatus.summary.total}</div>
                  <div className="text-xs text-muted-foreground">Total Products</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{stockStatus.summary.inStock}</div>
                  <div className="text-xs text-muted-foreground">In Stock</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{stockStatus.summary.lowStock}</div>
                  <div className="text-xs text-muted-foreground">Low Stock</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{stockStatus.summary.outOfStock}</div>
                  <div className="text-xs text-muted-foreground">Out of Stock</div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      {alerts && alerts.productsNeedingRestock && alerts.productsNeedingRestock.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Products Needing Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.productsNeedingRestock.slice(0, 5).map((product: any) => (
                <div key={product.id} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <div className="font-medium">{product.name}</div>
                    <div className="text-sm text-muted-foreground">SKU: {product.sku} • Stock: {product.currentStock}</div>
                  </div>
                  <Badge variant={product.status === 'OUT_OF_STOCK' ? 'destructive' : 'warning'}>
                    {product.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analytics */}
      {analytics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Sales Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Total Revenue</div>
                <div className="text-2xl font-bold">${(analytics.sales?.totalRevenue / 100).toFixed(2)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Total Orders</div>
                <div className="text-2xl font-bold">{analytics.sales?.totalOrders}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Avg Order Value</div>
                <div className="text-2xl font-bold">${(analytics.sales?.averageOrderValue / 100).toFixed(2)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Predictions */}
      {predictions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Restocking Predictions
            </CardTitle>
            <CardDescription>Predictions based on sales trends</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {predictions.slice(0, 5).map((prediction: any) => (
                <div key={prediction.productId} className="p-3 border rounded">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">{prediction.productName}</div>
                    <Badge variant={
                      prediction.urgency === 'CRITICAL' ? 'destructive' :
                      prediction.urgency === 'HIGH' ? 'default' :
                      prediction.urgency === 'MEDIUM' ? 'secondary' : 'outline'
                    }>
                      {prediction.urgency}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>Current Stock: {prediction.currentStock} units</div>
                    <div>Predicted Days Until Out: {prediction.predictedDaysUntilOutOfStock}</div>
                    <div>Recommended Order: {prediction.recommendedOrderQuantity} units</div>
                    <div className="text-xs mt-2">{prediction.reasoning}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        <Button onClick={fetchData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
      </TabsContent>

      <TabsContent value="products">
        <ProductManagement websiteId={websiteId} />
      </TabsContent>

      <TabsContent value="analytics">
        <EnhancedAnalytics websiteId={websiteId} />
      </TabsContent>

      <TabsContent value="settings">
        <StockSettings websiteId={websiteId} />
      </TabsContent>
    </Tabs>
  );
}
