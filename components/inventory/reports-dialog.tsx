
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  AlertTriangle,
  BarChart3,
  Download,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';

interface ReportsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ReportsDialog({ open, onOpenChange }: ReportsDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [reports, setReports] = useState<any>(null);

  useEffect(() => {
    if (open) {
      fetchReports();
    }
  }, [open]);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/general-inventory/reports?type=all');
      const data = await response.json();
      
      if (response.ok) {
        setReports(data.reports);
      } else {
        toast.error(data.error || 'Failed to load reports');
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Failed to load reports');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const exportReport = (reportName: string, data: any) => {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportName}-${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`${reportName} exported`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Inventory Reports & Analytics
          </DialogTitle>
          <DialogDescription>
            Comprehensive reports on stock movements, valuations, and performance
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : reports ? (
          <Tabs defaultValue="valuation" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="valuation">Valuation</TabsTrigger>
              <TabsTrigger value="stock-movement">Stock Movement</TabsTrigger>
              <TabsTrigger value="low-stock">Low Stock Alerts</TabsTrigger>
              <TabsTrigger value="category">Category Performance</TabsTrigger>
            </TabsList>

            {/* Valuation Report */}
            <TabsContent value="valuation" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Inventory Valuation</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportReport('inventory-valuation', reports.valuation)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Cost Value</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-2xl font-bold">
                        {formatCurrency(reports.valuation.totalCostValue)}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Selling Value</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-500" />
                      <span className="text-2xl font-bold text-green-600">
                        {formatCurrency(reports.valuation.totalSellingValue)}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Potential Profit</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span className="text-2xl font-bold text-green-600">
                        {formatCurrency(reports.valuation.potentialProfit)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {reports.valuation.profitMargin.toFixed(1)}% margin
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Top Value Items */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Top 10 Items by Value</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {reports.valuation.topValueItems.map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{formatCurrency(item.costValue)}</p>
                          <p className="text-xs text-muted-foreground">{item.quantity} units</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Stock Movement Report */}
            <TabsContent value="stock-movement" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Stock Movement History</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportReport('stock-movement', reports.stockMovement)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {Object.entries(reports.stockMovement.byType).map(([type, data]: [string, any]) => (
                  <Card key={type}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">{type}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold">{data.count}</span>
                        <span className="text-muted-foreground">movements</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Total: {data.totalQuantity} units
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Recent Movements */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recent Movements (Last 20)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {reports.stockMovement.recentMovements.map((mov: any) => (
                      <div key={mov.id} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex-1">
                          <p className="font-medium">{mov.itemName}</p>
                          <p className="text-xs text-muted-foreground">
                            {mov.reason || 'No reason specified'}
                          </p>
                        </div>
                        <div className="text-center px-4">
                          <Badge variant={mov.type === 'PURCHASE' || mov.type === 'RETURN' ? 'default' : 'secondary'}>
                            {mov.type}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(mov.date), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${mov.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {mov.quantity > 0 ? '+' : ''}{mov.quantity}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {mov.quantityBefore} → {mov.quantityAfter}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Low Stock Report */}
            <TabsContent value="low-stock" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Low Stock Alerts</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportReport('low-stock-alerts', reports.lowStock)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      <span className="text-2xl font-bold text-red-600">
                        {reports.lowStock.outOfStock}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Critical Stock</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      <span className="text-2xl font-bold text-orange-600">
                        {reports.lowStock.criticalStock}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <span className="text-2xl font-bold text-yellow-600">
                        {reports.lowStock.lowStock}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Low Stock Items */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Items Requiring Attention</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {reports.lowStock.items.map((item: any) => (
                      <div key={item.id} className="flex items-center gap-4 p-3 border rounded">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{item.name}</p>
                            <Badge variant={
                              item.status === 'OUT_OF_STOCK' ? 'destructive' :
                              item.status === 'CRITICAL' ? 'default' : 'secondary'
                            }>
                              {item.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            SKU: {item.sku} | {item.category} | {item.supplier}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{item.quantity} units</p>
                          <p className="text-xs text-muted-foreground">
                            Reorder at {item.reorderLevel} (Qty: {item.reorderQuantity})
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Category Performance */}
            <TabsContent value="category" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Category Performance</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportReport('category-performance', reports.categoryPerformance)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>

              <div className="space-y-3">
                {reports.categoryPerformance.map((cat: any, idx: number) => (
                  <Card key={idx}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{cat.categoryName}</CardTitle>
                        <Badge variant="outline">{cat.totalItems} items</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Quantity</p>
                          <p className="font-bold">{cat.totalQuantity}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Cost Value</p>
                          <p className="font-bold">{formatCurrency(cat.totalCostValue)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Selling Value</p>
                          <p className="font-bold text-green-600">
                            {formatCurrency(cat.totalSellingValue)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Profit Potential</p>
                          <p className="font-bold text-green-600">
                            {formatCurrency(cat.potentialProfit)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
