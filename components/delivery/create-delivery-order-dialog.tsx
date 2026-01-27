
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface CreateDeliveryOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateDeliveryOrderDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateDeliveryOrderDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    orderNumber: '',
    orderValue: '',
    pickupAddress: '',
    deliveryAddress: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    deliveryInstructions: '',
    deliveryFee: '5.00',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.orderValue || !formData.pickupAddress || !formData.deliveryAddress ||
        !formData.customerName || !formData.customerPhone || !formData.deliveryFee) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);

      const response = await fetch('/api/delivery/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderNumber: formData.orderNumber || undefined,
          orderValue: parseFloat(formData.orderValue),
          pickupAddress: formData.pickupAddress,
          deliveryAddress: formData.deliveryAddress,
          customerName: formData.customerName,
          customerPhone: formData.customerPhone,
          customerEmail: formData.customerEmail || undefined,
          deliveryInstructions: formData.deliveryInstructions || undefined,
          deliveryFee: parseFloat(formData.deliveryFee),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create delivery order');
      }

      const order = await response.json();
      toast.success('Delivery order created successfully!', {
        description: `Tracking code: ${order.trackingCode}`,
      });

      setFormData({
        orderNumber: '',
        orderValue: '',
        pickupAddress: '',
        deliveryAddress: '',
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        deliveryInstructions: '',
        deliveryFee: '5.00',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating order:', error);
      toast.error(error.message || 'Failed to create delivery order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Delivery Order</DialogTitle>
          <DialogDescription>
            Enter the delivery details to create a new order
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Order Details */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="orderNumber">Order Number (Optional)</Label>
              <Input
                id="orderNumber"
                value={formData.orderNumber}
                onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
                placeholder="ORDER-12345"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="orderValue">
                Order Value <span className="text-red-500">*</span>
              </Label>
              <Input
                id="orderValue"
                type="number"
                step="0.01"
                min="0"
                value={formData.orderValue}
                onChange={(e) => setFormData({ ...formData, orderValue: e.target.value })}
                placeholder="45.50"
                required
              />
            </div>
          </div>

          {/* Addresses */}
          <div className="space-y-2">
            <Label htmlFor="pickupAddress">
              Pickup Address <span className="text-red-500">*</span>
            </Label>
            <Input
              id="pickupAddress"
              value={formData.pickupAddress}
              onChange={(e) => setFormData({ ...formData, pickupAddress: e.target.value })}
              placeholder="123 Restaurant St, Miami, FL"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="deliveryAddress">
              Delivery Address <span className="text-red-500">*</span>
            </Label>
            <Input
              id="deliveryAddress"
              value={formData.deliveryAddress}
              onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
              placeholder="456 Customer Ave, Miami, FL"
              required
            />
          </div>

          {/* Customer Details */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="customerName">
                Customer Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="customerName"
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                placeholder="John Doe"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerPhone">
                Customer Phone <span className="text-red-500">*</span>
              </Label>
              <Input
                id="customerPhone"
                type="tel"
                value={formData.customerPhone}
                onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                placeholder="+15551234567"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customerEmail">Customer Email</Label>
            <Input
              id="customerEmail"
              type="email"
              value={formData.customerEmail}
              onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
              placeholder="john@example.com"
            />
          </div>

          {/* Delivery Instructions */}
          <div className="space-y-2">
            <Label htmlFor="deliveryInstructions">Delivery Instructions</Label>
            <Textarea
              id="deliveryInstructions"
              value={formData.deliveryInstructions}
              onChange={(e) => setFormData({ ...formData, deliveryInstructions: e.target.value })}
              placeholder="Ring doorbell, leave at door, etc."
              rows={3}
            />
          </div>

          {/* Delivery Fee */}
          <div className="space-y-2">
            <Label htmlFor="deliveryFee">
              Delivery Fee <span className="text-red-500">*</span>
            </Label>
            <Input
              id="deliveryFee"
              type="number"
              step="0.01"
              min="0"
              value={formData.deliveryFee}
              onChange={(e) => setFormData({ ...formData, deliveryFee: e.target.value })}
              placeholder="5.00"
              required
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Order'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
