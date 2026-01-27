'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Phone } from 'lucide-react';
import { toast } from 'sonner';

interface VoiceAgent {
  id: string;
  name: string;
  businessName: string;
}

interface MakeCallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCallInitiated?: () => void;
  // Pre-filled data
  defaultName?: string;
  defaultPhone?: string;
  defaultPurpose?: string;
  leadId?: string;
  contactId?: string;
  appointmentId?: string;
}

export function MakeCallDialog({
  open,
  onOpenChange,
  onCallInitiated,
  defaultName = '',
  defaultPhone = '',
  defaultPurpose = '',
  leadId,
  contactId,
  appointmentId,
}: MakeCallDialogProps) {
  const [formData, setFormData] = useState({
    voiceAgentId: '',
    name: defaultName,
    phoneNumber: defaultPhone,
    purpose: defaultPurpose,
    notes: '',
    leadId: leadId || '',
  });

  const [agents, setAgents] = useState<VoiceAgent[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState('');

  // Update form when props change
  useEffect(() => {
    if (open) {
      setFormData(prev => ({
        ...prev,
        name: defaultName,
        phoneNumber: defaultPhone,
        purpose: defaultPurpose,
        leadId: leadId || '',
      }));
      fetchAgents();
    }
  }, [open, defaultName, defaultPhone, defaultPurpose, leadId]);

  const fetchAgents = async () => {
    setLoadingData(true);
    try {
      const response = await fetch('/api/voice-agents');
      if (response.ok) {
        const data = await response.json();
        // Filter for outbound or both type agents
        const outboundAgents = data.filter((a: any) => a.type === 'OUTBOUND' || a.type === 'BOTH');
        setAgents(outboundAgents);
        
        // Auto-select first agent if only one available
        if (outboundAgents.length === 1) {
          setFormData(prev => ({ ...prev, voiceAgentId: outboundAgents[0].id }));
        }
      }
    } catch (err) {
      console.error('Failed to fetch agents:', err);
      toast.error('Failed to load voice agents');
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (!formData.voiceAgentId) {
      setError('Please select a voice agent');
      setLoading(false);
      return;
    }

    if (!formData.name || !formData.phoneNumber) {
      setError('Please provide contact name and phone number');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/outbound-calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          immediate: true, // Always call immediately from this dialog
          maxAttempts: 3,
        }),
      });

      if (response.ok) {
        toast.success('Call initiated successfully!');
        if (onCallInitiated) {
          onCallInitiated();
        }
        onOpenChange(false);
        // Reset form
        setFormData({
          voiceAgentId: '',
          name: '',
          phoneNumber: '',
          purpose: '',
          notes: '',
          leadId: '',
        });
      } else {
        const errorData = await response.json();
        const errorMsg = errorData.error || 'Failed to initiate call';
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err: any) {
      console.error('Error initiating call:', err);
      const errorMsg = err.message || 'Failed to initiate call';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-purple-500" />
            Make Voice AI Call
          </DialogTitle>
          <DialogDescription>
            Place an outbound call using your AI voice agent
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="voiceAgentId">Select Voice Agent *</Label>
            <Select
              value={formData.voiceAgentId}
              onValueChange={(value) => setFormData({ ...formData, voiceAgentId: value })}
              disabled={loadingData}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose an agent..." />
              </SelectTrigger>
              <SelectContent>
                {agents.length > 0 ? (
                  agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-agent" disabled>
                    No voice agents configured
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {agents.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Configure voice agents in the Admin section
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="name">Contact Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="John Doe"
              required
            />
          </div>

          <div>
            <Label htmlFor="phoneNumber">Phone Number *</Label>
            <Input
              id="phoneNumber"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              placeholder="+1 (555) 123-4567"
              required
            />
          </div>

          <div>
            <Label htmlFor="purpose">Call Purpose (Optional)</Label>
            <Input
              id="purpose"
              value={formData.purpose}
              onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              placeholder="e.g., Follow-up, Reminder, Sales"
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional context for this call..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !agents.length}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Calling...
                </>
              ) : (
                <>
                  <Phone className="mr-2 h-4 w-4" />
                  Call Now
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
