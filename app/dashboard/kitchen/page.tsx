
'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  ChefHat,
  Clock,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Settings,
  Play,
  Pause,
  SkipForward,
} from 'lucide-react';
import { toast } from 'sonner';

export default function KitchenPage() {
  const [activeTab, setActiveTab] = useState('active-orders');
  const [stations, setStations] = useState([]);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadKitchenData();
    // Refresh every 10 seconds
    const interval = setInterval(loadKitchenData, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadKitchenData = async () => {
    try {
      // Load stations
      const stationsRes = await fetch('/api/kitchen/stations');
      if (stationsRes.ok) {
        const data = await stationsRes.json();
        setStations(data);
      }

      // Load active orders
      const ordersRes = await fetch('/api/kitchen/orders/active');
      if (ordersRes.ok) {
        const data = await ordersRes.json();
        setActiveOrders(data.orders || []);
      }

      setLoading(false);
    } catch (error) {
      console.error('Failed to load kitchen data:', error);
      toast.error('Failed to load kitchen data');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-500';
      case 'PREPARING':
        return 'bg-blue-500';
      case 'READY':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'destructive';
      case 'HIGH':
        return 'default';
      case 'NORMAL':
        return 'secondary';
      case 'LOW':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const handleItemAction = async (itemId: string, action: string) => {
    try {
      let endpoint = '';
      if (action === 'bump') {
        endpoint = `/api/kitchen/items/${itemId}/bump`;
      } else {
        endpoint = `/api/kitchen/items/${itemId}/status`;
      }

      const res = await fetch(endpoint, {
        method: action === 'bump' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: action === 'start' ? 'PREPARING' : action === 'ready' ? 'READY' : undefined,
          staffName: 'Kitchen Staff',
        }),
      });

      if (res.ok) {
        toast.success(`Item ${action}ed successfully`);
        loadKitchenData();
      } else {
        throw new Error('Action failed');
      }
    } catch (error) {
      console.error('Item action error:', error);
      toast.error(`Failed to ${action} item`);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ChefHat className="h-8 w-8" />
            Kitchen Display System
          </h1>
          <p className="text-muted-foreground">Manage orders and kitchen stations</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadKitchenData}>
            <Clock className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={() => setActiveTab('stations')}>
            <Settings className="h-4 w-4 mr-2" />
            Stations
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
            <Flame className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeOrders.length}</div>
            <p className="text-xs text-muted-foreground">Currently in kitchen</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Items</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeOrders.reduce((sum, order) => sum + (order.pendingItems || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">Not started</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Preparing</CardTitle>
            <Flame className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeOrders.reduce((sum, order) => sum + (order.preparingItems || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">Being cooked</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ready</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeOrders.reduce((sum, order) => sum + (order.readyItems || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">For pickup</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="active-orders">
            <Flame className="h-4 w-4 mr-2" />
            Active Orders
          </TabsTrigger>
          <TabsTrigger value="stations">
            <Settings className="h-4 w-4 mr-2" />
            Stations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active-orders" className="space-y-4 mt-6">
          {loading ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Loading orders...
              </CardContent>
            </Card>
          ) : activeOrders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ChefHat className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">No Active Orders</p>
                <p className="text-sm text-muted-foreground">
                  Orders from the POS will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {activeOrders.map((order) => (
                <Card key={order.id} className="border-2">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-xl">Order #{order.orderNumber}</CardTitle>
                        <CardDescription>
                          {order.orderType} {order.tableNumber && `• Table ${order.tableNumber}`}
                          {order.customerName && `• ${order.customerName}`}
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="text-xs">
                          {new Date(order.createdAt).toLocaleTimeString()}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {order.totalItems} items
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {order.items.map((item: any) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              variant={getPriorityColor(item.priority)}
                              className="text-xs"
                            >
                              {item.priority}
                            </Badge>
                            <span className={`w-2 h-2 rounded-full ${getStatusColor(item.status)}`} />
                            <span className="font-medium">
                              {item.quantity}x {item.itemName}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="font-medium">{item.station.displayName}</span>
                            {item.modifiers && (
                              <span className="text-xs">• Mods: {item.modifiers}</span>
                            )}
                            {item.specialNotes && (
                              <span className="text-xs text-orange-600">• {item.specialNotes}</span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Expected: {item.expectedTime}min • 
                            {item.startedAt ? (
                              <span className="ml-1">
                                Started {new Date(item.startedAt).toLocaleTimeString()}
                              </span>
                            ) : (
                              <span className="ml-1">Received {new Date(item.receivedAt).toLocaleTimeString()}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.status === 'PENDING' && (
                            <Button
                              size="sm"
                              onClick={() => handleItemAction(item.id, 'start')}
                            >
                              <Play className="h-3 w-3 mr-1" />
                              Start
                            </Button>
                          )}
                          {item.status === 'PREPARING' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleItemAction(item.id, 'ready')}
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Ready
                            </Button>
                          )}
                          {item.status === 'READY' && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleItemAction(item.id, 'bump')}
                            >
                              <SkipForward className="h-3 w-3 mr-1" />
                              Bump
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="stations" className="space-y-4 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Kitchen Stations</h3>
            <Button>
              <Settings className="h-4 w-4 mr-2" />
              Add Station
            </Button>
          </div>

          {stations.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Settings className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">No Kitchen Stations</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Set up stations like Grill, Fryer, Salad to organize your kitchen
                </p>
                <Button>Create First Station</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {stations.map((station: any) => (
                <Card key={station.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{station.displayName}</CardTitle>
                      {station.isActive ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                    <CardDescription>{station.name}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Active Items:</span>
                        <span className="font-medium">{station._count?.kitchenItems || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Default Prep Time:</span>
                        <span className="font-medium">{station.defaultPrepTime} min</span>
                      </div>
                      {station.maxCapacity && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Max Capacity:</span>
                          <span className="font-medium">{station.maxCapacity}</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        View Items
                      </Button>
                    </div>
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
            <ChefHat className="h-6 w-6 text-blue-600 dark:text-blue-400 mt-1" />
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Kitchen Display System Active
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Orders from your POS system will automatically appear here. Track preparation 
                status, manage kitchen stations, and ensure timely service. Use the bump screen 
                to mark items complete when they're picked up.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
