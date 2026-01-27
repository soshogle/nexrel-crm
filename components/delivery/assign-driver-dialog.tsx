
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { User, Car, Star } from 'lucide-react';

interface AssignDriverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any;
  onSuccess: () => void;
}

interface Driver {
  id: string;
  name: string;
  phone: string;
  vehicleType: string;
  vehicleColor: string | null;
  vehicleModel: string | null;
  rating: number;
  isAvailable: boolean;
  status: string;
}

export function AssignDriverDialog({
  open,
  onOpenChange,
  order,
  onSuccess,
}: AssignDriverDialogProps) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (open) {
      fetchAvailableDrivers();
    }
  }, [open]);

  const fetchAvailableDrivers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/delivery/drivers?isActive=true&isAvailable=true');
      if (!response.ok) throw new Error('Failed to fetch drivers');

      const data = await response.json();
      setDrivers(data);
    } catch (error: any) {
      console.error('Error fetching drivers:', error);
      toast.error('Failed to load available drivers');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedDriverId) {
      toast.error('Please select a driver');
      return;
    }

    try {
      setAssigning(true);

      const response = await fetch('/api/delivery/orders/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          driverId: selectedDriverId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to assign driver');
      }

      toast.success('Driver assigned successfully!');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error assigning driver:', error);
      toast.error(error.message || 'Failed to assign driver');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign Driver</DialogTitle>
          <DialogDescription>
            Select an available driver for this delivery order
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : drivers.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No available drivers found. Please check back later or add new drivers.
          </div>
        ) : (
          <>
            <RadioGroup value={selectedDriverId} onValueChange={setSelectedDriverId}>
              <div className="space-y-3">
                {drivers.map((driver) => (
                  <div
                    key={driver.id}
                    className={`flex items-center space-x-3 rounded-lg border p-4 ${
                      selectedDriverId === driver.id ? 'border-primary bg-primary/5' : ''
                    }`}
                  >
                    <RadioGroupItem value={driver.id} id={driver.id} />
                    <Label
                      htmlFor={driver.id}
                      className="flex flex-1 cursor-pointer items-center justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                          <User className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{driver.name}</span>
                            <Badge variant="outline" className="gap-1">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              {Number(driver.rating).toFixed(1)}
                            </Badge>
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                            <Car className="h-3 w-3" />
                            <span className="capitalize">
                              {driver.vehicleType.toLowerCase()}
                              {driver.vehicleColor && ` • ${driver.vehicleColor}`}
                              {driver.vehicleModel && ` ${driver.vehicleModel}`}
                            </span>
                          </div>
                          <div className="mt-1 text-sm text-muted-foreground">{driver.phone}</div>
                        </div>
                      </div>
                      {driver.status === 'AVAILABLE' && (
                        <Badge variant="secondary" className="bg-green-500/10 text-green-700">
                          Available
                        </Badge>
                      )}
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={assigning}
              >
                Cancel
              </Button>
              <Button onClick={handleAssign} disabled={!selectedDriverId || assigning}>
                {assigning ? 'Assigning...' : 'Assign Driver'}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
