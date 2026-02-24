/**
 * Connect Phone Dialog
 * Reusable popup to connect a phone number to any call-capable agent.
 * Used by Voice Agents and AI Employees (Industry, RE, Professional).
 */

'use client';

import { useState, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Phone, Loader2, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';

export type ConnectPhoneAgentSource = 'voice' | 'industry' | 're' | 'professional';

export interface ConnectPhoneAgentConfig {
  source: ConnectPhoneAgentSource;
  agentId?: string;
  agentName: string;
  industry?: string;
  employeeType?: string;
  currentPhone?: string;
}

interface ConnectPhoneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: ConnectPhoneAgentConfig;
  onSuccess?: () => void;
  onPurchaseClick?: () => void;
}

export function ConnectPhoneDialog({
  open,
  onOpenChange,
  agent,
  onSuccess,
  onPurchaseClick,
}: ConnectPhoneDialogProps) {
  const [numbers, setNumbers] = useState<Array<{ phoneNumber: string; friendlyName?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [selectedNumber, setSelectedNumber] = useState<string>(agent.currentPhone || '');

  useEffect(() => {
    if (open) {
      setSelectedNumber(agent.currentPhone || '');
      setLoading(true);
      fetch('/api/twilio/phone-numbers/owned?platformPool=true')
        .then((r) => (r.ok ? r.json() : { numbers: [] }))
        .then((d) => setNumbers(d.numbers || []))
        .catch(() => setNumbers([]))
        .finally(() => setLoading(false));
    }
  }, [open, agent.currentPhone]);

  const handleConnect = async () => {
    if (!selectedNumber?.trim()) {
      toast.error('Please select a phone number');
      return;
    }
    const formatted = selectedNumber.trim().startsWith('+')
      ? selectedNumber.trim()
      : selectedNumber.replace(/\D/g, '').length === 10
        ? '+1' + selectedNumber.replace(/\D/g, '')
        : '+' + selectedNumber.replace(/\D/g, '');

    setConnecting(true);
    try {
      let res: Response;
      if (agent.source === 'voice' && agent.agentId) {
        res = await fetch(`/api/voice-agents/${agent.agentId}/update-phone`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phoneNumber: formatted }),
        });
      } else if (agent.source === 'industry' && agent.industry && agent.employeeType) {
        res = await fetch('/api/industry-ai-employees/assign-phone', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            industry: agent.industry,
            employeeType: agent.employeeType,
            phoneNumber: formatted,
          }),
        });
      } else if (agent.source === 're' && agent.employeeType) {
        res = await fetch('/api/real-estate/ai-employees/assign-phone', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employeeType: agent.employeeType,
            phoneNumber: formatted,
          }),
        });
      } else if (agent.source === 'professional' && agent.employeeType) {
        res = await fetch('/api/professional-ai-employees/assign-phone', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employeeType: agent.employeeType,
            phoneNumber: formatted,
          }),
        });
      } else {
        toast.error('Invalid agent configuration');
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (res.ok && (data.phoneNumber || data.id || data.success !== false)) {
        toast.success('Phone number connected successfully');
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(data.error || data.message || 'Failed to connect phone');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to connect phone');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Connect Phone Number
          </DialogTitle>
          <DialogDescription>
            Assign a phone number to {agent.agentName}. The system will import it into Soshogle Voice AI and connect it to this agent.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Phone Number</Label>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading numbers...
              </div>
            ) : (
              <Select value={selectedNumber || ''} onValueChange={setSelectedNumber}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a phone number..." />
                </SelectTrigger>
                <SelectContent>
                  {numbers.map((n) => (
                    <SelectItem key={n.phoneNumber} value={n.phoneNumber}>
                      📞 {n.phoneNumber} {n.friendlyName && n.friendlyName !== n.phoneNumber ? `(${n.friendlyName})` : ''}
                    </SelectItem>
                  ))}
                  {numbers.length === 0 && (
                    <SelectItem value="__none__" disabled>
                      No phone numbers found
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            )}
          </div>
          {numbers.length === 0 && !loading && (
            <p className="text-sm text-amber-600 dark:text-amber-500">
              Purchase a number first or add one to your Soshogle Call account.
            </p>
          )}
        </div>
        <DialogFooter>
          {onPurchaseClick && (
            <Button type="button" variant="outline" onClick={onPurchaseClick} className="gap-2">
              <ShoppingCart className="h-4 w-4" />
              Buy Number
            </Button>
          )}
          <Button
            onClick={handleConnect}
            disabled={connecting || !selectedNumber?.trim() || loading}
            className="gap-2"
          >
            {connecting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Phone className="h-4 w-4" />
                Connect
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
