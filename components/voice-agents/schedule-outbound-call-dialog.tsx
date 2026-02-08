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
import { Switch } from '@/components/ui/switch';

interface VoiceAgent {
  id: string;
  name: string;
  businessName: string;
}

interface Lead {
  id: string;
  businessName: string;
  contactPerson?: string;
  phone?: string;
}

interface ScheduleOutboundCallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCallScheduled: () => void;
  preselectedLeadId?: string;
  preselectedAgentId?: string;
}

export function ScheduleOutboundCallDialog({
  open,
  onOpenChange,
  onCallScheduled,
  preselectedLeadId,
  preselectedAgentId,
}: ScheduleOutboundCallDialogProps) {
  const [formData, setFormData] = useState({
    voiceAgentId: preselectedAgentId || '',
    leadId: preselectedLeadId || '',
    name: '',
    phoneNumber: '',
    purpose: '',
    notes: '',
    maxAttempts: 3,
    immediate: false,
    scheduledFor: '',
  });

  const [agents, setAgents] = useState<VoiceAgent[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      fetchAgentsAndLeads();
    }
  }, [open]);

  useEffect(() => {
    // Auto-fill from selected lead
    if (formData.leadId) {
      const lead = leads.find(l => l.id === formData.leadId);
      if (lead) {
        setFormData(prev => ({
          ...prev,
          name: lead.contactPerson || lead.businessName,
          phoneNumber: lead.phone || prev.phoneNumber,
        }));
      }
    }
  }, [formData.leadId, leads]);

  const fetchAgentsAndLeads = async () => {
    setLoadingData(true);
    try {
      const [agentsRes, leadsRes] = await Promise.all([
        fetch('/api/voice-agents'),
        fetch('/api/leads'),
      ]);

      if (agentsRes.ok) {
        const agentsData = await agentsRes.json();
        // Filter for outbound or both type agents
        setAgents(agentsData.filter((a: any) => a.type === 'OUTBOUND' || a.type === 'BOTH'));
      }

      if (leadsRes.ok) {
        const leadsData = await leadsRes.json();
        setLeads(leadsData.filter((l: any) => l.phone)); // Only leads with phone numbers
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
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
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        onCallScheduled();
        onOpenChange(false);
        // Reset form
        setFormData({
          voiceAgentId: preselectedAgentId || '',
          leadId: preselectedLeadId || '',
          name: '',
          phoneNumber: '',
          purpose: '',
          notes: '',
          maxAttempts: 3,
          immediate: false,
          scheduledFor: '',
        });
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to schedule call');
      }
    } catch (err: any) {
      console.error('Error scheduling call:', err);
      setError(err.message || 'Failed to schedule call');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Schedule Outbound Call
          </DialogTitle>
          <DialogDescription>
            Schedule a future call to be made by your AI voice agent
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="voiceAgentId">Voice Agent *</Label>
            <Select
              value={formData.voiceAgentId}
              onValueChange={(value) => setFormData({ ...formData, voiceAgentId: value })}
              disabled={loadingData}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select agent..." />
              </SelectTrigger>
              <SelectContent>
                {agents.length > 0 ? (
                  agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name} - {agent.businessName}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-agent" disabled>
                    No outbound agents available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="leadId">Link to Lead (Optional)</Label>
            <Select
              value={formData.leadId || '__none__'}
              onValueChange={(value) => setFormData({ ...formData, leadId: value === '__none__' ? '' : value })}
              disabled={loadingData}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select lead or enter manually..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None (Manual Entry)</SelectItem>
                {leads.map((lead) => (
                  <SelectItem key={lead.id} value={lead.id}>
                    {lead.contactPerson || lead.businessName} - {lead.phone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
                placeholder="+14155551234"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="purpose">Call Purpose</Label>
            <Input
              id="purpose"
              value={formData.purpose}
              onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              placeholder="e.g., Follow-up, Appointment reminder, Sales call"
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes about this call..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="maxAttempts">Max Retry Attempts</Label>
              <Input
                id="maxAttempts"
                type="number"
                value={formData.maxAttempts}
                onChange={(e) => setFormData({ ...formData, maxAttempts: parseInt(e.target.value) || 3 })}
                min="1"
                max="10"
              />
            </div>

            {!formData.immediate && (
              <div>
                <Label htmlFor="scheduledFor">Schedule For</Label>
                <Input
                  id="scheduledFor"
                  type="datetime-local"
                  value={formData.scheduledFor}
                  onChange={(e) => setFormData({ ...formData, scheduledFor: e.target.value })}
                />
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2 p-4 border rounded-lg bg-muted/50">
            <Switch
              id="immediate"
              checked={formData.immediate}
              onCheckedChange={(checked) => setFormData({ ...formData, immediate: checked })}
            />
            <Label htmlFor="immediate" className="cursor-pointer">
              Make call immediately (don't schedule)
            </Label>
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
            <Button type="submit" disabled={loading || !agents.length}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {formData.immediate ? 'Calling...' : 'Scheduling...'}
                </>
              ) : (
                <>
                  <Phone className="mr-2 h-4 w-4" />
                  {formData.immediate ? 'Call Now' : 'Schedule Call'}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
