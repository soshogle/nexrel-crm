/**
 * Lab Order Form Component
 * Create new lab orders for dental procedures
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface LabOrderFormProps {
  leadId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function LabOrderForm({ leadId, onSuccess, onCancel }: LabOrderFormProps) {
  const [formData, setFormData] = useState({
    labName: '',
    labContact: '',
    orderType: '',
    description: '',
    instructions: '',
    cost: '',
    deliveryDate: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  const orderTypes = [
    'Crown',
    'Bridge',
    'Denture',
    'Partial Denture',
    'Implant Crown',
    'Veneer',
    'Inlay/Onlay',
    'Night Guard',
    'Retainer',
    'Other',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.labName.trim() || !formData.orderType) {
      toast.error('Lab name and order type are required');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/dental/lab-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          labName: formData.labName,
          labContact: formData.labContact || null,
          orderType: formData.orderType,
          description: formData.description || null,
          instructions: formData.instructions || null,
          cost: formData.cost ? parseFloat(formData.cost) : null,
          deliveryDate: formData.deliveryDate ? new Date(formData.deliveryDate).toISOString() : null,
          notes: formData.notes || null,
          status: 'PENDING',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Lab order created: ${data.order?.orderNumber || 'Success'}`);
        onSuccess?.();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create lab order');
      }
    } catch (error: any) {
      toast.error('Failed to create lab order: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="labName">Lab Name *</Label>
          <Input
            id="labName"
            value={formData.labName}
            onChange={(e) => setFormData({ ...formData, labName: e.target.value })}
            required
            placeholder="Enter lab name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="labContact">Lab Contact</Label>
          <Input
            id="labContact"
            value={formData.labContact}
            onChange={(e) => setFormData({ ...formData, labContact: e.target.value })}
            placeholder="Phone or email"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="orderType">Order Type *</Label>
        <Select
          value={formData.orderType}
          onValueChange={(value) => setFormData({ ...formData, orderType: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select order type" />
          </SelectTrigger>
          <SelectContent>
            {orderTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe the lab work needed"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="instructions">Special Instructions</Label>
        <Textarea
          id="instructions"
          value={formData.instructions}
          onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
          placeholder="Any special instructions for the lab"
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="cost">Estimated Cost</Label>
          <Input
            id="cost"
            type="number"
            step="0.01"
            value={formData.cost}
            onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
            placeholder="0.00"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="deliveryDate">Expected Delivery Date</Label>
          <Input
            id="deliveryDate"
            type="date"
            value={formData.deliveryDate}
            onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
          />
        </div>
      </div>

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

      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            'Create Lab Order'
          )}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
