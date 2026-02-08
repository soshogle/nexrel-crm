/**
 * Lab Order Form Component
 * Create new lab orders for dental procedures
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Loader2, Send, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';

interface LabSystem {
  id: string;
  name: string;
  supportsElectronicSubmission: boolean;
  supportsStatusTracking: boolean;
  supportsTrackingNumbers: boolean;
}

interface LabOrderFormProps {
  leadId: string;
  orderId?: string; // For editing existing orders
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function LabOrderForm({ leadId, orderId, onSuccess, onCancel }: LabOrderFormProps) {
  const [formData, setFormData] = useState({
    labSystem: '',
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
  const [submitting, setSubmitting] = useState(false);
  const [labSystems, setLabSystems] = useState<LabSystem[]>([]);
  const [selectedLabSystem, setSelectedLabSystem] = useState<LabSystem | null>(null);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(orderId || null);

  const orderTypes = [
    'CROWN',
    'BRIDGE',
    'DENTURE',
    'IMPLANT',
    'ORTHODONTIC',
    'RETAINER',
    'NIGHT_GUARD',
    'OTHER',
  ];

  const orderTypeLabels: Record<string, string> = {
    'CROWN': 'Crown',
    'BRIDGE': 'Bridge',
    'DENTURE': 'Denture',
    'IMPLANT': 'Implant',
    'ORTHODONTIC': 'Orthodontic',
    'RETAINER': 'Retainer',
    'NIGHT_GUARD': 'Night Guard',
    'OTHER': 'Other',
  };

  // Fetch supported lab systems
  useEffect(() => {
    fetchLabSystems();
  }, []);

  // Update selected lab system when labSystem changes
  useEffect(() => {
    if (formData.labSystem) {
      const system = labSystems.find(s => s.id === formData.labSystem);
      setSelectedLabSystem(system || null);
      
      // Auto-fill lab name if system is selected
      if (system && !formData.labName) {
        setFormData(prev => ({ ...prev, labName: system.name }));
      }
    } else {
      setSelectedLabSystem(null);
    }
  }, [formData.labSystem, labSystems]);

  const fetchLabSystems = async () => {
    try {
      const response = await fetch('/api/integrations/lab-orders/systems');
      if (response.ok) {
        const data = await response.json();
        setLabSystems(data.systems || []);
      }
    } catch (error) {
      console.error('Error fetching lab systems:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.labName.trim() || !formData.orderType) {
      toast.error('Lab name and order type are required');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/dental/lab-orders', {
        method: orderId ? 'POST' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: orderId,
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
        const newOrderId = data.order?.id;
        setCreatedOrderId(newOrderId);
        toast.success(`Lab order ${orderId ? 'updated' : 'created'}: ${data.order?.orderNumber || 'Success'}`);
        
        // Don't call onSuccess yet if we can submit to lab
        if (!selectedLabSystem?.supportsElectronicSubmission) {
          onSuccess?.();
        }
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

  const handleSubmitToLab = async () => {
    if (!createdOrderId || !formData.labSystem) {
      toast.error('Please create the lab order first');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/integrations/lab-orders/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: createdOrderId,
          labSystem: formData.labSystem,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Order submitted to ${selectedLabSystem?.name}!${data.trackingNumber ? ` Tracking: ${data.trackingNumber}` : ''}`);
        onSuccess?.();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to submit order to lab');
      }
    } catch (error: any) {
      toast.error('Failed to submit order to lab: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Lab System Selection */}
      <div className="space-y-2">
        <Label htmlFor="labSystem">Lab System</Label>
        <Select
          value={formData.labSystem}
          onValueChange={(value) => setFormData({ ...formData, labSystem: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select lab system (optional)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Manual Entry / Other Lab</SelectItem>
            {labSystems.map((system) => (
              <SelectItem key={system.id} value={system.id}>
                {system.name}
                {system.supportsElectronicSubmission && (
                  <span className="ml-2 text-xs text-green-600">✓ Electronic</span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedLabSystem?.supportsElectronicSubmission && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700 text-sm">
              This lab supports electronic submission. You can submit the order directly after creating it.
            </AlertDescription>
          </Alert>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="labName">Lab Name *</Label>
          <Input
            id="labName"
            value={formData.labName}
            onChange={(e) => setFormData({ ...formData, labName: e.target.value })}
            required
            placeholder="Enter lab name"
            disabled={!!selectedLabSystem} // Disable if lab system selected
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
                {orderTypeLabels[type] || type}
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

      <div className="flex flex-col gap-2 pt-4">
        <div className="flex gap-2">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {orderId ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              orderId ? 'Update Lab Order' : 'Create Lab Order'
            )}
          </Button>
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>

        {/* Submit to Lab Button - Shows after order is created and lab system supports it */}
        {createdOrderId && selectedLabSystem?.supportsElectronicSubmission && (
          <Button
            type="button"
            onClick={handleSubmitToLab}
            disabled={submitting}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting to {selectedLabSystem.name}...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Submit to {selectedLabSystem.name}
              </>
            )}
          </Button>
        )}

        {/* Info Alert for labs without electronic submission */}
        {createdOrderId && formData.labSystem && !selectedLabSystem?.supportsElectronicSubmission && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              This lab system doesn't support electronic submission. Please submit manually or contact the lab directly.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </form>
  );
}
