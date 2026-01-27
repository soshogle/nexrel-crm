
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { Navigation, Play, Pause, RotateCcw } from 'lucide-react';

interface SimulateDriverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deliveryOrderId: string;
  onSimulated?: () => void;
}

export function SimulateDriverDialog({
  open,
  onOpenChange,
  deliveryOrderId,
  onSimulated,
}: SimulateDriverDialogProps) {
  const [progress, setProgress] = useState([0]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);

  const simulateLocation = async (progressValue: number) => {
    try {
      const res = await fetch('/api/delivery/simulate-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deliveryOrderId,
          progress: progressValue,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to simulate location');
      }

      return data;
    } catch (error) {
      console.error('Simulation error:', error);
      throw error;
    }
  };

  const handleSimulate = async () => {
    try {
      await simulateLocation(progress[0] / 100);
      toast.success('Location updated!');
      onSimulated?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update location');
    }
  };

  const startAutoSimulation = () => {
    if (isSimulating) {
      // Stop simulation
      if (intervalId) {
        clearInterval(intervalId);
        setIntervalId(null);
      }
      setIsSimulating(false);
      toast.info('Auto-simulation stopped');
    } else {
      // Start simulation
      setIsSimulating(true);
      toast.success('Auto-simulation started');

      const id = setInterval(async () => {
        setProgress((prev) => {
          const newProgress = prev[0] + 5;
          if (newProgress >= 100) {
            clearInterval(id);
            setIsSimulating(false);
            toast.success('Delivery completed!');
            return [100];
          }

          // Simulate location at new progress
          simulateLocation(newProgress / 100)
            .then(() => {
              onSimulated?.();
            })
            .catch((error) => {
              console.error('Auto-simulation error:', error);
              clearInterval(id);
              setIsSimulating(false);
            });

          return [newProgress];
        });
      }, 3000); // Update every 3 seconds

      setIntervalId(id);
    }
  };

  const resetSimulation = () => {
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
    setIsSimulating(false);
    setProgress([0]);
    toast.info('Simulation reset');
  };

  const handleClose = () => {
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
    setIsSimulating(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Navigation className="mr-2 h-5 w-5" />
            Simulate Driver Location
          </DialogTitle>
          <DialogDescription>
            Test the real-time tracking by simulating driver movement from pickup to delivery location.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Delivery Progress: {progress[0]}%</Label>
              <Slider
                value={progress}
                onValueChange={setProgress}
                max={100}
                step={1}
                disabled={isSimulating}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                0% = At pickup location, 100% = At delivery location
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={handleSimulate} disabled={isSimulating} className="flex-1">
                <Navigation className="mr-2 h-4 w-4" />
                Update Location
              </Button>
              <Button
                onClick={startAutoSimulation}
                variant={isSimulating ? 'destructive' : 'default'}
                className="flex-1"
              >
                {isSimulating ? (
                  <>
                    <Pause className="mr-2 h-4 w-4" />
                    Stop Auto
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Auto Simulate
                  </>
                )}
              </Button>
              <Button onClick={resetSimulation} variant="outline" size="icon">
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-4 space-y-2">
            <h4 className="font-medium text-sm">How it works:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Use the slider to manually set driver position</li>
              <li>• Click "Update Location" to simulate single update</li>
              <li>• Click "Auto Simulate" for continuous movement</li>
              <li>• Open tracking page to see real-time updates</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
