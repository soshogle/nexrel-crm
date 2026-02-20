'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Workflow, PhoneCall, Phone, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PROFESSIONAL_EMPLOYEE_CONFIGS, PROFESSIONAL_EMPLOYEE_TYPES } from '@/lib/professional-ai-employees/config';

interface SetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProvisionRefresh: () => void;
}

export function SetupDialog({ open, onOpenChange, onProvisionRefresh }: SetupDialogProps) {
  const router = useRouter();
  const [setupForm, setSetupForm] = useState({
    professionalType: '' as string,
    customName: '',
    selectedTwilioPhone: '' as string,
    useCase: 'workflow' as 'workflow' | 'oneoff',
    contactName: '',
    contactPhone: '',
  });
  const [provisionedProfessionalAgents, setProvisionedProfessionalAgents] = useState<Array<{ id: string; employeeType: string; name: string; twilioPhoneNumber?: string | null }>>([]);
  const [twilioOwnedNumbers, setTwilioOwnedNumbers] = useState<Array<{ phoneNumber: string; friendlyName?: string }>>([]);
  const [setupSubmitting, setSetupSubmitting] = useState(false);

  const fetchProvisionedProfessionalAgents = async () => {
    try {
      const res = await fetch('/api/professional-ai-employees/provision');
      if (res.ok) {
        const data = await res.json();
        setProvisionedProfessionalAgents(data.agents || []);
      }
    } catch (e) {
      console.error('Failed to fetch professional agents', e);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (isOpen) {
      fetchProvisionedProfessionalAgents();
      fetch('/api/twilio/phone-numbers/owned').then((r) => r.ok ? r.json() : {}).then((d) => setTwilioOwnedNumbers(d.numbers || []));
    }
  };

  const handleSubmit = async () => {
    if (!setupForm.professionalType) {
      toast.error('Please select a professional AI employee');
      return;
    }
    if (setupForm.useCase === 'workflow') {
      onOpenChange(false);
      toast.success('Opening Workflows...');
      router.push(`/dashboard/ai-employees?tab=workflows&agent=${setupForm.professionalType}`);
      return;
    }
    if (setupForm.useCase === 'oneoff') {
      if (!setupForm.selectedTwilioPhone) {
        toast.error('Please select a Twilio phone number');
        return;
      }
      if (!setupForm.contactName || !setupForm.contactPhone) {
        toast.error('Please enter contact name and phone');
        return;
      }
      setSetupSubmitting(true);
      try {
        const agent = provisionedProfessionalAgents.find((a) => a.employeeType === setupForm.professionalType);
        const needsAssign = !agent?.twilioPhoneNumber || agent.twilioPhoneNumber !== setupForm.selectedTwilioPhone;
        if (needsAssign) {
          const assignRes = await fetch('/api/professional-ai-employees/assign-phone', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              employeeType: setupForm.professionalType,
              phoneNumber: setupForm.selectedTwilioPhone,
            }),
          });
          const assignData = await assignRes.json().catch(() => ({}));
          if (!assignRes.ok) throw new Error(assignData.error || 'Failed to assign phone to agent');
          toast.success('Phone assigned. Initiating call...');
          onProvisionRefresh();
        }
        const res = await fetch('/api/professional-ai-employees/one-off-call', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employeeType: setupForm.professionalType,
            contactName: setupForm.contactName,
            contactPhone: setupForm.contactPhone,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to initiate call');
        toast.success(data.message || 'Call initiated!');
        onOpenChange(false);
        setSetupForm({ professionalType: '', customName: '', selectedTwilioPhone: '', useCase: 'workflow', contactName: '', contactPhone: '' });
      } catch (e: any) {
        toast.error(e.message || 'Failed to initiate call');
      } finally {
        setSetupSubmitting(false);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Setup Professional AI
          </DialogTitle>
          <DialogDescription>
            Select a professional AI employee, assign a name and phone (if needed), then choose how to use it
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Professional AI Employee *</Label>
            <select
              value={setupForm.professionalType}
              onChange={(e) => {
                const config = Object.values(PROFESSIONAL_EMPLOYEE_CONFIGS).find(c => c.type === e.target.value);
                setSetupForm({
                  ...setupForm,
                  professionalType: e.target.value,
                  customName: config?.name || '',
                });
              }}
              className="w-full p-2 border rounded bg-background"
            >
              <option value="">Select a professional...</option>
              {PROFESSIONAL_EMPLOYEE_TYPES.map((type) => {
                const config = PROFESSIONAL_EMPLOYEE_CONFIGS[type];
                return (
                  <option key={type} value={type}>
                    {config?.title || type}
                  </option>
                );
              })}
            </select>
          </div>
          
          <div className="space-y-2">
            <Label>Name (optional)</Label>
            <Input
              placeholder="e.g., Sarah"
              value={setupForm.customName}
              onChange={(e) => setSetupForm({ ...setupForm, customName: e.target.value })}
            />
          </div>
          
          <div className="space-y-2">
            <Label>How do you want to use this?</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSetupForm({ ...setupForm, useCase: 'workflow' })}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  setupForm.useCase === 'workflow'
                    ? 'border-primary bg-primary/10'
                    : 'border-muted hover:border-muted-foreground/50'
                }`}
              >
                <Workflow className="h-5 w-5 mb-2" />
                <p className="font-medium text-sm">Workflow or Campaign</p>
                <p className="text-xs text-muted-foreground">Use in automated workflows</p>
              </button>
              <button
                type="button"
                onClick={() => setSetupForm({ ...setupForm, useCase: 'oneoff' })}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  setupForm.useCase === 'oneoff'
                    ? 'border-primary bg-primary/10'
                    : 'border-muted hover:border-muted-foreground/50'
                }`}
              >
                <PhoneCall className="h-5 w-5 mb-2" />
                <p className="font-medium text-sm">One-off Call</p>
                <p className="text-xs text-muted-foreground">Make a call to someone now</p>
              </button>
            </div>
          </div>
          
          {setupForm.useCase === 'oneoff' && (
            <div className="space-y-3 p-4 rounded-lg bg-muted/50 border">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Phone className="h-4 w-4" />
                  Select Twilio Phone Number *
                </Label>
                <select
                  value={setupForm.selectedTwilioPhone}
                  onChange={(e) => setSetupForm({ ...setupForm, selectedTwilioPhone: e.target.value })}
                  className="w-full p-2 border rounded bg-background"
                  required
                >
                  <option value="">Select a phone number...</option>
                  {twilioOwnedNumbers.map((n) => (
                    <option key={n.phoneNumber} value={n.phoneNumber}>
                      📞 {n.phoneNumber} {n.friendlyName ? `(${n.friendlyName})` : ''}
                    </option>
                  ))}
                  {twilioOwnedNumbers.length === 0 && (
                    <option disabled>No phone numbers found. Purchase one in Settings.</option>
                  )}
                </select>
                <p className="text-xs text-muted-foreground">
                  Required. Select from your Twilio account. The system will assign it to this agent in ElevenLabs.
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Who should we call?</p>
                <Input
                  placeholder="Contact name"
                  value={setupForm.contactName}
                  onChange={(e) => setSetupForm({ ...setupForm, contactName: e.target.value })}
                />
                <Input
                  placeholder="Phone number (e.g. +1 555 123 4567)"
                  value={setupForm.contactPhone}
                  onChange={(e) => setSetupForm({ ...setupForm, contactPhone: e.target.value })}
                />
              </div>
            </div>
          )}
        </div>
        
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!setupForm.professionalType || (setupForm.useCase === 'oneoff' && (!setupForm.selectedTwilioPhone || !setupForm.contactName || !setupForm.contactPhone)) || setupSubmitting}
          >
            {setupSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {setupForm.useCase === 'workflow' ? 'Open Workflows' : 'Make Call'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
