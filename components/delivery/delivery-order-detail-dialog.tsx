
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { MapPin, User, Phone, Mail, DollarSign, Clock, Package, ExternalLink, Copy, Navigation } from 'lucide-react';
import { SimulateDriverDialog } from './simulate-driver-dialog';

interface DeliveryOrderDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any;
  onUpdate: () => void;
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

export function DeliveryOrderDetailDialog({
  open,
  onOpenChange,
  order,
  onUpdate,
}: DeliveryOrderDetailDialogProps) {
  const [loading, setLoading] = useState(false);
  const [newStatus, setNewStatus] = useState(order.status);
  const [showSimulator, setShowSimulator] = useState(false);

  const handleUpdateStatus = async () => {
    if (newStatus === order.status) return;

    try {
      setLoading(true);

      const updateData: any = { status: newStatus };

      // Add timestamps based on status
      if (newStatus === 'PICKED_UP' && !order.actualPickupTime) {
        updateData.actualPickupTime = new Date().toISOString();
      } else if (newStatus === 'DELIVERED' && !order.actualDeliveryTime) {
        updateData.actualDeliveryTime = new Date().toISOString();
      }

      const response = await fetch(`/api/delivery/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) throw new Error('Failed to update order');

      toast.success('Order status updated successfully');
      onUpdate();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating order:', error);
      toast.error('Failed to update order status');
    } finally {
      setLoading(false);
    }
  };

  const copyTrackingLink = () => {
    const trackingUrl = `${window.location.origin}/track/${order.trackingCode}`;
    navigator.clipboard.writeText(trackingUrl);
    toast.success('Tracking link copied to clipboard!');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Delivery Order Details</DialogTitle>
          <DialogDescription>
            Order #{order.orderNumber || order.trackingCode.substring(0, 8)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status and Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Order Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge className={statusColors[order.status]}>{statusLabels[order.status]}</Badge>
                <Button size="sm" variant="outline" onClick={copyTrackingLink}>
                  Copy Tracking Link
                </Button>
              </div>

              <div className="flex gap-2">
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="ASSIGNED">Assigned</SelectItem>
                    <SelectItem value="PICKED_UP">Picked Up</SelectItem>
                    <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                    <SelectItem value="DELIVERED">Delivered</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleUpdateStatus} disabled={loading || newStatus === order.status}>
                  {loading ? 'Updating...' : 'Update Status'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{order.customerName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{order.customerPhone}</span>
              </div>
              {order.customerEmail && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{order.customerEmail}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Addresses */}
          <Card>
            <CardHeader>
              <CardTitle>Delivery Addresses</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="mb-1 flex items-center gap-2 text-sm font-medium">
                  <MapPin className="h-4 w-4 text-green-500" />
                  Pickup Location
                </div>
                <p className="text-sm text-muted-foreground">{order.pickupAddress}</p>
              </div>
              <div>
                <div className="mb-1 flex items-center gap-2 text-sm font-medium">
                  <MapPin className="h-4 w-4 text-red-500" />
                  Delivery Location
                </div>
                <p className="text-sm text-muted-foreground">{order.deliveryAddress}</p>
              </div>
              {order.deliveryInstructions && (
                <div>
                  <div className="mb-1 text-sm font-medium">Delivery Instructions</div>
                  <p className="text-sm text-muted-foreground">{order.deliveryInstructions}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Driver Information */}
          {order.driver && (
            <Card>
              <CardHeader>
                <CardTitle>Driver Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{order.driver.name}</span>
                  <Badge variant="secondary">⭐ {Number(order.driver.rating).toFixed(1)}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{order.driver.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="capitalize">{order.driver.vehicleType.toLowerCase()}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Financial Details */}
          <Card>
            <CardHeader>
              <CardTitle>Financial Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Order Value:</span>
                <span className="font-medium">${Number(order.orderValue).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery Fee:</span>
                <span className="font-medium">${Number(order.deliveryFee).toFixed(2)}</span>
              </div>
              {order.commissionAmount && (
                <>
                  <div className="flex justify-between border-t pt-3">
                    <span className="text-muted-foreground">Platform Commission (27.5%):</span>
                    <span className="font-medium text-green-600">
                      ${Number(order.commissionAmount).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Driver Earnings (75%):</span>
                    <span className="font-medium">${Number(order.driverEarnings).toFixed(2)}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Timestamps */}
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Created:</span>
                <span>{new Date(order.createdAt).toLocaleString()}</span>
              </div>
              {order.actualPickupTime && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Picked Up:</span>
                  <span>{new Date(order.actualPickupTime).toLocaleString()}</span>
                </div>
              )}
              {order.actualDeliveryTime && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Delivered:</span>
                  <span>{new Date(order.actualDeliveryTime).toLocaleString()}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tracking & Simulator Actions */}
        <div className="flex items-center gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const trackingUrl = `${window.location.origin}/track/${order.trackingCode}`;
              navigator.clipboard.writeText(trackingUrl);
              toast.success('Tracking link copied to clipboard!');
            }}
            className="flex-1"
          >
            <Copy className="mr-2 h-4 w-4" />
            Copy Tracking Link
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              window.open(`/track/${order.trackingCode}`, '_blank');
            }}
            className="flex-1"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Open Tracking Page
          </Button>
          {order.driver && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSimulator(true)}
              className="flex-1"
            >
              <Navigation className="mr-2 h-4 w-4" />
              Simulate Driver
            </Button>
          )}
        </div>
      </DialogContent>

      {/* Simulator Dialog */}
      <SimulateDriverDialog
        open={showSimulator}
        onOpenChange={setShowSimulator}
        deliveryOrderId={order.id}
        onSimulated={onUpdate}
      />
    </Dialog>
  );
}
