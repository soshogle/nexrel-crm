
'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Package,
  AlertTriangle,
  TrendingDown,
  DollarSign,
  Plus,
  Search,
  Truck,
  ChefHat,
} from 'lucide-react';
import { toast } from 'sonner';

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState('items');
  const [stats, setStats] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadInventoryData();
  }, []);

  const loadInventoryData = async () => {
    try {
      // Load stats
      const statsRes = await fetch('/api/inventory/stats');
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }

      // Load items
      const itemsRes = await fetch('/api/inventory/items');
      if (itemsRes.ok) {
        const data = await itemsRes.json();
        setItems(data);
      }

      // Load suppliers
      const suppliersRes = await fetch('/api/inventory/suppliers?isActive=true');
      if (suppliersRes.ok) {
        const data = await suppliersRes.json();
        setSuppliers(data);
      }

      // Load alerts
      const alertsRes = await fetch('/api/inventory/alerts?isResolved=false');
      if (alertsRes.ok) {
        const data = await alertsRes.json();
        setAlerts(data);
      }

      setLoading(false);
    } catch (error) {
      console.error('Failed to load inventory data:', error);
      toast.error('Failed to load inventory data');
    }
  };

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'OUT_OF_STOCK':
        return 'destructive';
      case 'LOW_STOCK':
        return 'default';
      case 'OK':
        return 'secondary';
      case 'OVERSTOCKED':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'destructive';
      case 'HIGH':
        return 'default';
      case 'MEDIUM':
        return 'secondary';
      case 'LOW':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Package className="h-8 w-8" />
            Inventory Management
          </h1>
          <p className="text-muted-foreground">Track stock, manage suppliers, and monitor alerts</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadInventoryData}>
            <Search className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => toast.info('Add Item dialog coming soon')}>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Items</CardTitle>
              <Package className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalItems}</div>
              <p className="text-xs text-muted-foreground">Active inventory</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.lowStockCount}</div>
              <p className="text-xs text-muted-foreground">Need attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.outOfStockCount}</div>
              <p className="text-xs text-muted-foreground">Critical</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.totalValue}</div>
              <p className="text-xs text-muted-foreground">Inventory value</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="items">
            <Package className="h-4 w-4 mr-2" />
            Items ({items.length})
          </TabsTrigger>
          <TabsTrigger value="suppliers">
            <Truck className="h-4 w-4 mr-2" />
            Suppliers ({suppliers.length})
          </TabsTrigger>
          <TabsTrigger value="alerts">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Alerts ({alerts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="space-y-4 mt-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items by name or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {loading ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Loading items...
              </CardContent>
            </Card>
          ) : filteredItems.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">No Inventory Items</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Start adding items to track your inventory
                </p>
                <Button>Add First Item</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredItems.map((item) => (
                <Card key={item.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{item.name}</CardTitle>
                        <CardDescription>
                          SKU: {item.sku} • {item.category}
                        </CardDescription>
                      </div>
                      <Badge variant={getStockStatusColor(item.stockStatus)}>
                        {item.stockStatus.replace('_', ' ')}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Current Stock</p>
                        <p className="font-medium">
                          {Number(item.currentStock).toFixed(2)} {item.unit}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Minimum Stock</p>
                        <p className="font-medium">
                          {Number(item.minimumStock).toFixed(2)} {item.unit}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Cost Per Unit</p>
                        <p className="font-medium">${Number(item.costPerUnit).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Supplier</p>
                        <p className="font-medium">
                          {item.supplier?.name || 'No supplier'}
                        </p>
                      </div>
                    </div>
                    {item.location && (
                      <div className="mt-3 text-sm text-muted-foreground">
                        Location: {item.location}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-4 mt-6">
          {suppliers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Truck className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">No Suppliers</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Add suppliers to manage your inventory sources
                </p>
                <Button>Add First Supplier</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {suppliers.map((supplier) => (
                <Card key={supplier.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{supplier.name}</CardTitle>
                    {supplier.contactPerson && (
                      <CardDescription>Contact: {supplier.contactPerson}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      {supplier.email && (
                        <div>
                          <span className="text-muted-foreground">Email:</span> {supplier.email}
                        </div>
                      )}
                      {supplier.phone && (
                        <div>
                          <span className="text-muted-foreground">Phone:</span> {supplier.phone}
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="text-muted-foreground">Items:</span>
                        <Badge variant="secondary">{supplier._count.items}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Purchase Orders:</span>
                        <Badge variant="secondary">{supplier._count.purchaseOrders}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4 mt-6">
          {alerts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">No Active Alerts</p>
                <p className="text-sm text-muted-foreground">
                  All inventory items are at healthy stock levels
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {alerts.map((alert) => (
                <Card key={alert.id} className="border-l-4 border-l-red-500">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5" />
                          {alert.inventoryItem.name}
                        </CardTitle>
                        <CardDescription>{alert.message}</CardDescription>
                      </div>
                      <Badge variant={getSeverityColor(alert.severity)}>
                        {alert.severity}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        <span className="text-muted-foreground">Alert Type:</span>{' '}
                        {alert.alertType.replace('_', ' ')}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(alert.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    {alert.inventoryItem && (
                      <div className="mt-3 p-3 bg-secondary/30 rounded-lg text-sm">
                        <div className="flex items-center justify-between">
                          <span>Current Stock:</span>
                          <span className="font-medium">
                            {Number(alert.inventoryItem.currentStock).toFixed(2)}{' '}
                            {alert.inventoryItem.unit}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span>Minimum Stock:</span>
                          <span className="font-medium">
                            {Number(alert.inventoryItem.minimumStock).toFixed(2)}{' '}
                            {alert.inventoryItem.unit}
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Info Box */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Package className="h-6 w-6 text-blue-600 dark:text-blue-400 mt-1" />
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Inventory Management Active
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Track your stock levels, manage suppliers, and receive alerts when items run low. 
                Inventory automatically updates when items are sold through your POS or used in the kitchen.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
