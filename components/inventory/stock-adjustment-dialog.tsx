
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, TrendingUp, TrendingDown, Package } from 'lucide-react';
import { toast } from 'sonner';

interface StockAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  item?: {
    id: string;
    name: string;
    sku: string;
    quantity: number;
    unit?: string;
  };
  locations: any[];
}

export default function StockAdjustmentDialog({
  open,
  onOpenChange,
  onSuccess,
  item,
  locations,
}: StockAdjustmentDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    type: 'ADJUSTMENT',
    quantity: '',
    fromLocationId: '',
    toLocationId: '',
    unitCost: '',
    reason: '',
    reference: '',
    notes: '',
  });

  const adjustmentTypes = [
    { value: 'PURCHASE', label: 'Purchase (Add Stock)', icon: TrendingUp, color: 'text-green-500' },
    { value: 'SALE', label: 'Sale (Remove Stock)', icon: TrendingDown, color: 'text-red-500' },
    { value: 'RETURN', label: 'Return (Add Stock)', icon: TrendingUp, color: 'text-blue-500' },
    { value: 'DAMAGE', label: 'Damage/Loss (Remove)', icon: TrendingDown, color: 'text-orange-500' },
    { value: 'TRANSFER', label: 'Transfer Location', icon: Package, color: 'text-purple-500' },
    { value: 'ADJUSTMENT', label: 'Manual Adjustment', icon: Package, color: 'text-gray-500' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!item) {
      toast.error('No item selected');
      return;
    }

    if (!formData.quantity) {
      toast.error('Quantity is required');
      return;
    }

    const qty = parseFloat(formData.quantity);
    if (isNaN(qty)) {
      toast.error('Please enter a valid quantity');
      return;
    }

    // For transfers, require both locations
    if (formData.type === 'TRANSFER' && (!formData.fromLocationId || !formData.toLocationId)) {
      toast.error('Both from and to locations are required for transfers');
      return;
    }

    setIsSubmitting(true);

    try {
      // Determine if this is adding or removing stock
      const isAddingStock = ['PURCHASE', 'RETURN', 'INITIAL'].includes(formData.type);
      const adjustmentQuantity = isAddingStock ? Math.abs(qty) : -Math.abs(qty);

      const response = await fetch('/api/general-inventory/adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: item.id,
          type: formData.type,
          quantity: adjustmentQuantity,
          fromLocationId: formData.fromLocationId || null,
          toLocationId: formData.toLocationId || null,
          unitCost: formData.unitCost ? parseFloat(formData.unitCost) : null,
          reason: formData.reason || null,
          reference: formData.reference || null,
          notes: formData.notes || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create adjustment');
      }

      toast.success('Stock adjustment created successfully');
      onSuccess();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        type: 'ADJUSTMENT',
        quantity: '',
        fromLocationId: '',
        toLocationId: '',
        unitCost: '',
        reason: '',
        reference: '',
        notes: '',
      });
    } catch (error: any) {
      console.error('Error creating adjustment:', error);
      toast.error(error.message || 'Failed to create adjustment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedType = adjustmentTypes.find(t => t.value === formData.type);
  const Icon = selectedType?.icon || Package;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${selectedType?.color || ''}`} />
            Stock Adjustment
          </DialogTitle>
          <DialogDescription>
            {item ? (
              <>
                Adjust stock for <strong>{item.name}</strong> (SKU: {item.sku})
                <br />
                Current stock: <strong>{item.quantity} {item.unit || 'pieces'}</strong>
              </>
            ) : (
              'Select an item to adjust stock'
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Adjustment Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Adjustment Type *</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {adjustmentTypes.map((type) => {
                  const TypeIcon = type.icon;
                  return (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <TypeIcon className={`h-4 w-4 ${type.color}`} />
                        <span>{type.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity *</Label>
            <Input
              id="quantity"
              type="number"
              step="0.01"
              min="0"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              placeholder="Enter quantity"
              required
            />
            <p className="text-xs text-gray-400">
              {['PURCHASE', 'RETURN', 'INITIAL'].includes(formData.type)
                ? '✅ This will ADD to current stock'
                : '⚠️ This will REMOVE from current stock'}
            </p>
          </div>

          {/* Locations (for transfers) */}
          {formData.type === 'TRANSFER' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fromLocation">From Location *</Label>
                <Select
                  value={formData.fromLocationId}
                  onValueChange={(value) => setFormData({ ...formData, fromLocationId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="toLocation">To Location *</Label>
                <Select
                  value={formData.toLocationId}
                  onValueChange={(value) => setFormData({ ...formData, toLocationId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Unit Cost (for purchases) */}
          {formData.type === 'PURCHASE' && (
            <div className="space-y-2">
              <Label htmlFor="unitCost">Unit Cost</Label>
              <Input
                id="unitCost"
                type="number"
                step="0.01"
                min="0"
                value={formData.unitCost}
                onChange={(e) => setFormData({ ...formData, unitCost: e.target.value })}
                placeholder="0.00"
              />
              {formData.unitCost && formData.quantity && (
                <p className="text-xs text-gray-400">
                  Total cost: ${(parseFloat(formData.unitCost) * parseFloat(formData.quantity)).toFixed(2)}
                </p>
              )}
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Input
              id="reason"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="e.g., New shipment, Customer return, etc."
            />
          </div>

          {/* Reference */}
          <div className="space-y-2">
            <Label htmlFor="reference">Reference Number</Label>
            <Input
              id="reference"
              value={formData.reference}
              onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              placeholder="e.g., PO-12345, INV-67890"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes"
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !item}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Create Adjustment'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
