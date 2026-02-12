'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Loader2 } from 'lucide-react';
import { PreChartPanel } from './pre-chart-panel';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

interface Lead {
  id: string;
  businessName: string;
  contactPerson?: string;
  email?: string;
}

interface NewSessionDialogProps {
  onSessionCreated?: (sessionId: string) => void;
  defaultLeadId?: string;
  defaultPatientName?: string;
  defaultChiefComplaint?: string;
  defaultProfession?: string;
  defaultOpen?: boolean;
}

const PROFESSIONS = [
  { value: 'GENERAL_PRACTICE', label: 'General Practice / Family Medicine' },
  { value: 'DENTIST', label: 'Dentistry' },
  { value: 'ORTHODONTIC', label: 'Orthodontics' },
  { value: 'OPTOMETRIST', label: 'Optometry' },
  { value: 'DERMATOLOGIST', label: 'Dermatology' },
  { value: 'CARDIOLOGIST', label: 'Cardiology' },
  { value: 'PSYCHIATRIST', label: 'Psychiatry' },
  { value: 'PEDIATRICIAN', label: 'Pediatrics' },
  { value: 'ORTHOPEDIC', label: 'Orthopedics' },
  { value: 'PHYSIOTHERAPIST', label: 'Physical Therapy' },
  { value: 'CHIROPRACTOR', label: 'Chiropractic' },
  { value: 'CUSTOM', label: 'Custom Specialty' },
];

export function NewSessionDialog({
  onSessionCreated,
  defaultLeadId,
  defaultPatientName,
  defaultChiefComplaint,
  defaultProfession,
  defaultOpen = false,
}: NewSessionDialogProps) {
  const tPlaceholders = useTranslations('placeholders');
  const tToasts = useTranslations('toasts.general');
  const [open, setOpen] = useState(defaultOpen);
  const [isLoading, setIsLoading] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [searchQuery, setSearchQuery] = useState(defaultPatientName || '');
  const [isSearching, setIsSearching] = useState(false);

  const [formData, setFormData] = useState({
    leadId: defaultLeadId || '',
    patientName: defaultPatientName || '',
    profession: (defaultProfession as any) || 'GENERAL_PRACTICE',
    customProfession: '',
    chiefComplaint: defaultChiefComplaint || '',
    consultantName: '',
  });

  useEffect(() => {
    if (defaultOpen || defaultLeadId || defaultPatientName) {
      setFormData((prev) => ({
        ...prev,
        leadId: defaultLeadId || prev.leadId,
        patientName: defaultPatientName || prev.patientName,
        chiefComplaint: defaultChiefComplaint ?? prev.chiefComplaint,
        ...(defaultProfession && { profession: defaultProfession as any }),
      }));
      setSearchQuery(defaultPatientName || '');
      if (defaultOpen) setOpen(true);
    }
  }, [defaultOpen, defaultLeadId, defaultPatientName, defaultChiefComplaint, defaultProfession]);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchLeads();
    } else {
      setLeads([]);
    }
  }, [searchQuery]);

  const searchLeads = async () => {
    setIsSearching(true);
    try {
      const response = await fetch(`/api/leads?search=${encodeURIComponent(searchQuery)}&limit=10`);
      if (response.ok) {
        const data = await response.json();
        setLeads(data.leads || []);
      }
    } catch (error) {
      console.error('Error searching leads:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.consultantName.trim()) {
      toast.error(tToasts('consultantNameRequired'));
      return;
    }

    // Ensure patient name is set (either from lead or manual entry)
    if (!formData.leadId && !formData.patientName.trim()) {
      toast.error('Please select a patient or enter a name');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/docpen/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: formData.leadId || undefined,
          patientName: formData.patientName || undefined,
          profession: formData.profession,
          customProfession: formData.profession === 'CUSTOM' ? formData.customProfession : undefined,
          chiefComplaint: formData.chiefComplaint || undefined,
          consultantName: formData.consultantName,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create session');
      }

      const data = await response.json();
      toast.success(tToasts('sessionCreated'));
      setOpen(false);
      resetForm();
      onSessionCreated?.(data.session.id);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create session');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      leadId: '',
      patientName: '',
      profession: 'GENERAL_PRACTICE',
      customProfession: '',
      chiefComplaint: '',
      consultantName: '',
    });
    setSearchQuery('');
    setLeads([]);
  };

  const selectLead = (lead: Lead) => {
    setFormData(prev => ({
      ...prev,
      leadId: lead.id,
      patientName: lead.contactPerson || lead.businessName,
    }));
    setSearchQuery(lead.contactPerson || lead.businessName);
    setLeads([]);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Session
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Start New Consultation</DialogTitle>
          <DialogDescription>
            Create a new clinical session for ambient recording and SOAP note generation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Consultant Name */}
          <div className="space-y-2">
            <Label htmlFor="consultantName">Consultant Name *</Label>
            <Input
              id="consultantName"
              value={formData.consultantName}
              onChange={(e) => setFormData(prev => ({ ...prev, consultantName: e.target.value }))}
              placeholder="Dr. John Smith"
              required
            />
            <p className="text-xs text-muted-foreground">
              Name of the consultant who will sign off on the notes approval
            </p>
          </div>

          {/* Patient Search */}
          <div className="space-y-2">
            <Label>Patient</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (e.target.value === '') {
                    setFormData(prev => ({ ...prev, leadId: '', patientName: '' }));
                  }
                }}
                placeholder={tPlaceholders('input.searchClients')}
                className="pl-9"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
              )}
            </div>
            
            {/* Walk-in option - always visible */}
            {searchQuery.length === 0 && !formData.leadId && (
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted border rounded-md mt-1 flex items-center justify-between"
                onClick={() => {
                  setFormData(prev => ({ ...prev, leadId: '', patientName: 'Walk-in' }));
                  setSearchQuery('Walk-in');
                }}
              >
                <span className="font-medium">Walk-in</span>
                <span className="text-xs text-muted-foreground">Click to select</span>
              </button>
            )}

            {/* Search results */}
            {leads.length > 0 && (
              <div className="border rounded-md mt-1 max-h-40 overflow-y-auto">
                {!formData.leadId && (
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center justify-between border-b font-medium"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, leadId: '', patientName: 'Walk-in' }));
                      setSearchQuery('Walk-in');
                      setLeads([]);
                    }}
                  >
                    <span>Walk-in</span>
                    <span className="text-xs text-muted-foreground">Click to select</span>
                  </button>
                )}
                {leads.map((lead) => (
                  <button
                    key={lead.id}
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center justify-between"
                    onClick={() => selectLead(lead)}
                  >
                    <span>{lead.contactPerson || lead.businessName}</span>
                    {lead.email && (
                      <span className="text-xs text-muted-foreground">{lead.email}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
            
            {/* Manual entry option when no results */}
            {!formData.leadId && searchQuery.length >= 2 && leads.length === 0 && searchQuery !== 'Walk-in' && (
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted border rounded-md mt-1"
                onClick={() => {
                  setFormData(prev => ({ ...prev, patientName: searchQuery }));
                }}
              >
                Use "{searchQuery}" as patient name
              </button>
            )}

            {/* Show selected patient */}
            {formData.patientName && (
              <div className="mt-2 px-3 py-2 bg-muted rounded-md text-sm">
                <span className="text-muted-foreground">Selected: </span>
                <span className="font-medium">{formData.patientName}</span>
                {formData.leadId && (
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, leadId: '', patientName: '' }));
                      setSearchQuery('');
                    }}
                    className="ml-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Profession */}
          <div className="space-y-2">
            <Label>Specialty / Profession</Label>
            <Select
              value={formData.profession}
              onValueChange={(value) => setFormData(prev => ({ ...prev, profession: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROFESSIONS.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Profession */}
          {formData.profession === 'CUSTOM' && (
            <div className="space-y-2">
              <Label htmlFor="customProfession">Custom Specialty Name</Label>
              <Input
                id="customProfession"
                value={formData.customProfession}
                onChange={(e) => setFormData(prev => ({ ...prev, customProfession: e.target.value }))}
                placeholder={tPlaceholders('input.customProfession')}
              />
            </div>
          )}

          {/* Chief Complaint */}
          <div className="space-y-2">
            <Label htmlFor="chiefComplaint">Chief Complaint (Optional)</Label>
            <Textarea
              id="chiefComplaint"
              value={formData.chiefComplaint}
              onChange={(e) => setFormData(prev => ({ ...prev, chiefComplaint: e.target.value }))}
              placeholder={tPlaceholders('input.chiefComplaint')}
              rows={2}
            />
          </div>

          {/* Pre-Chart (when patient selected) */}
          {formData.leadId && (
            <PreChartPanel leadId={formData.leadId} />
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Start Session'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
