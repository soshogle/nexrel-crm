
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Plus, Search, Eye, User, MapPin, DollarSign, ExternalLink, Copy, Navigation } from 'lucide-react';
import { CreateDeliveryOrderDialog } from './create-delivery-order-dialog';
import { DeliveryOrderDetailDialog } from './delivery-order-detail-dialog';
import { AssignDriverDialog } from './assign-driver-dialog';

interface DeliveryOrder {
  id: string;
  orderNumber: string | null;
  orderValue: number;
  pickupAddress: string;
  deliveryAddress: string;
  customerName: string;
  customerPhone: string;
  status: string;
  deliveryFee: number;
  commissionAmount: number | null;
  driverEarnings: number | null;
  trackingCode: string;
  driver: {
    id: string;
    name: string;
    phone: string;
    vehicleType: string;
    rating: number;
  } | null;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-500',
  ASSIGNED: 'bg-blue-500',
  PICKED_UP: 'bg-purple-500',
  IN_TRANSIT: 'bg-indigo-500',
  DELIVERED: 'bg-green-500',
  CANCELLED: 'bg-red-500',
  FAILED: 'bg-gray-500',
};

const statusLabels: Record<string, string> = {
  PENDING: 'Pending',
  ASSIGNED: 'Assigned',
  PICKED_UP: 'Picked Up',
  IN_TRANSIT: 'In Transit',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  FAILED: 'Failed',
};

export function DeliveryOrdersList() {
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<DeliveryOrder | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showAssignDriverDialog, setShowAssignDriverDialog] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await fetch(`/api/delivery/orders?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch orders');

      const data = await response.json();
      setOrders(data);
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load delivery orders');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (order: DeliveryOrder) => {
    setSelectedOrder(order);
    setShowDetailDialog(true);
  };

  const handleAssignDriver = (order: DeliveryOrder) => {
    setSelectedOrder(order);
    setShowAssignDriverDialog(true);
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerPhone.includes(searchQuery) ||
      order.trackingCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.orderNumber && order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === 'PENDING').length,
    inProgress: orders.filter((o) =>
      ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'].includes(o.status)
    ).length,
    delivered: orders.filter((o) => o.status === 'DELIVERED').length,
    totalRevenue: orders
      .filter((o) => o.status === 'DELIVERED')
      .reduce((sum, o) => sum + Number(o.orderValue), 0),
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Orders</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending</CardDescription>
            <CardTitle className="text-3xl text-yellow-600">{stats.pending}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>In Progress</CardDescription>
            <CardTitle className="text-3xl text-blue-600">{stats.inProgress}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Delivered</CardDescription>
            <CardTitle className="text-3xl text-green-600">{stats.delivered}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Revenue</CardDescription>
            <CardTitle className="text-3xl">${stats.totalRevenue.toFixed(2)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Delivery Orders</CardTitle>
              <CardDescription>Manage and track all delivery orders</CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Order
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-4 flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by customer, phone, tracking code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="ASSIGNED">Assigned</SelectItem>
                <SelectItem value="PICKED_UP">Picked Up</SelectItem>
                <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                <SelectItem value="DELIVERED">Delivered</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No delivery orders found
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Addresses</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        {order.orderNumber || order.trackingCode.substring(0, 8)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{order.customerName}</div>
                          <div className="text-sm text-muted-foreground">{order.customerPhone}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-start gap-1">
                            <MapPin className="mt-0.5 h-3 w-3 text-green-500" />
                            <span className="line-clamp-1">{order.pickupAddress}</span>
                          </div>
                          <div className="flex items-start gap-1">
                            <MapPin className="mt-0.5 h-3 w-3 text-red-500" />
                            <span className="line-clamp-1">{order.deliveryAddress}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {order.driver ? (
                          <div>
                            <div className="font-medium">{order.driver.name}</div>
                            <div className="text-sm text-muted-foreground">
                              ⭐ {Number(order.driver.rating).toFixed(1)}
                            </div>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAssignDriver(order)}
                            disabled={order.status !== 'PENDING'}
                          >
                            <User className="mr-1 h-3 w-3" />
                            Assign
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[order.status] || 'bg-gray-500'}>
                          {statusLabels[order.status] || order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">${Number(order.orderValue).toFixed(2)}</div>
                          <div className="text-sm text-muted-foreground">
                            +${Number(order.deliveryFee).toFixed(2)} fee
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {order.commissionAmount ? (
                          <div className="text-sm">
                            <div className="font-medium text-green-600">
                              ${Number(order.commissionAmount).toFixed(2)}
                            </div>
                            <div className="text-muted-foreground">
                              Driver: ${Number(order.driverEarnings).toFixed(2)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleViewDetails(order)}
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              const trackingUrl = `${window.location.origin}/track/${order.trackingCode}`;
                              navigator.clipboard.writeText(trackingUrl);
                              toast.success('Tracking link copied!');
                            }}
                            title="Copy Tracking Link"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              window.open(`/track/${order.trackingCode}`, '_blank');
                            }}
                            title="Open Tracking Page"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <CreateDeliveryOrderDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={fetchOrders}
      />

      {selectedOrder && (
        <>
          <DeliveryOrderDetailDialog
            open={showDetailDialog}
            onOpenChange={setShowDetailDialog}
            order={selectedOrder}
            onUpdate={fetchOrders}
          />
          <AssignDriverDialog
            open={showAssignDriverDialog}
            onOpenChange={setShowAssignDriverDialog}
            order={selectedOrder}
            onSuccess={fetchOrders}
          />
        </>
      )}
    </div>
  );
}
