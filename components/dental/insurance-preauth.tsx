/**
 * Insurance Pre-Authorization Workflow
 * Submit → Track Status → Receive Response flow for ortho treatment pre-auth.
 * Integrates with existing insurance claims system.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import {
  Shield,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  Upload,
  ArrowRight,
  Loader2,
  Calendar,
  DollarSign,
  Send,
  Eye,
  ChevronDown,
  ChevronUp,
  Paperclip,
} from 'lucide-react';

type PreAuthStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'INFO_REQUESTED' | 'APPROVED' | 'DENIED' | 'APPEALED';

interface PreAuthRecord {
  id: string;
  insuranceProvider: string;
  policyNumber: string;
  treatmentType: string;
  estimatedCost: number;
  status: PreAuthStatus;
  submittedAt?: string;
  responseAt?: string;
  approvedAmount?: number;
  denialReason?: string;
  narrative: string;
  attachmentIds: string[];
  createdAt: string;
  notes?: string;
}

interface InsurancePreAuthProps {
  leadId?: string;
  compact?: boolean;
}

const STATUS_PIPELINE: PreAuthStatus[] = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'INFO_REQUESTED', 'APPROVED'];

const statusConfig: Record<PreAuthStatus, { label: string; color: string; icon: any; bg: string }> = {
  DRAFT: { label: 'Draft', color: 'text-gray-600', icon: FileText, bg: 'bg-gray-100' },
  SUBMITTED: { label: 'Submitted', color: 'text-blue-600', icon: Send, bg: 'bg-blue-100' },
  UNDER_REVIEW: { label: 'Under Review', color: 'text-amber-600', icon: Clock, bg: 'bg-amber-100' },
  INFO_REQUESTED: { label: 'Info Requested', color: 'text-orange-600', icon: AlertCircle, bg: 'bg-orange-100' },
  APPROVED: { label: 'Approved', color: 'text-green-600', icon: CheckCircle2, bg: 'bg-green-100' },
  DENIED: { label: 'Denied', color: 'text-red-600', icon: XCircle, bg: 'bg-red-100' },
  APPEALED: { label: 'Appealed', color: 'text-purple-600', icon: ArrowRight, bg: 'bg-purple-100' },
};

export function InsurancePreAuth({ leadId, compact = false }: InsurancePreAuthProps) {
  const { data: session } = useSession();
  const [preAuths, setPreAuths] = useState<PreAuthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    insuranceProvider: '',
    policyNumber: '',
    treatmentType: '',
    estimatedCost: '',
    narrative: '',
    notes: '',
  });

  const TREATMENT_TYPES = [
    'Comprehensive Orthodontics (Braces)',
    'Invisalign / Clear Aligners',
    'Palatal Expander',
    'Retainer Fabrication',
    'Surgical Orthodontics',
    'Phase I / Interceptive Treatment',
    'Phase II Treatment',
    'Herbst Appliance',
    'Space Maintainer',
    'Other',
  ];

  const INSURANCE_PROVIDERS = [
    'RAMQ',
    'Sun Life',
    'Manulife',
    'Great-West Life',
    'Blue Cross',
    'Desjardins Insurance',
    'Industrial Alliance',
    'Green Shield',
    'SSQ Insurance',
    'Other',
  ];

  const fetchPreAuths = useCallback(async () => {
    try {
      setLoading(true);
      const params = leadId ? `?leadId=${leadId}&type=preauth` : '?type=preauth';
      const res = await fetch(`/api/dental/ramq/claims${params}`);
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data) ? data : Array.isArray(data?.claims) ? data.claims : [];
        const mapped: PreAuthRecord[] = items
          .filter((c: any) => c.claimType === 'PREAUTH' || c.type === 'PREAUTH')
          .map((c: any) => ({
            id: c.id,
            insuranceProvider: c.provider || c.insuranceProvider || 'Unknown',
            policyNumber: c.policyNumber || '',
            treatmentType: c.treatmentType || c.description || '',
            estimatedCost: c.amount || c.estimatedCost || 0,
            status: c.status || 'DRAFT',
            submittedAt: c.submittedAt,
            responseAt: c.responseAt || c.processedAt,
            approvedAmount: c.approvedAmount,
            denialReason: c.denialReason,
            narrative: c.narrative || c.notes || '',
            attachmentIds: c.attachmentIds || [],
            createdAt: c.createdAt || new Date().toISOString(),
            notes: c.notes,
          }));
        setPreAuths(mapped);
      }
    } catch (err) {
      console.error('Error fetching pre-auths:', err);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => { fetchPreAuths(); }, [fetchPreAuths]);

  const handleSubmit = async () => {
    if (!formData.insuranceProvider || !formData.treatmentType) {
      toast.error('Insurance provider and treatment type are required');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/dental/ramq/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session?.user?.id || '',
          leadId,
          claimType: 'PREAUTH',
          type: 'PREAUTH',
          provider: formData.insuranceProvider,
          policyNumber: formData.policyNumber,
          treatmentType: formData.treatmentType,
          description: formData.treatmentType,
          amount: formData.estimatedCost ? parseFloat(formData.estimatedCost) : 0,
          estimatedCost: formData.estimatedCost ? parseFloat(formData.estimatedCost) : 0,
          narrative: formData.narrative,
          notes: formData.notes,
          status: 'DRAFT',
        }),
      });
      if (res.ok) {
        toast.success('Pre-authorization created');
        setShowForm(false);
        setFormData({ insuranceProvider: '', policyNumber: '', treatmentType: '', estimatedCost: '', narrative: '', notes: '' });
        fetchPreAuths();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to create pre-auth');
      }
    } catch (err: any) {
      toast.error('Failed: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (id: string, newStatus: PreAuthStatus) => {
    try {
      const res = await fetch(`/api/dental/ramq/claims/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          ...(newStatus === 'SUBMITTED' ? { submittedAt: new Date().toISOString() } : {}),
        }),
      });
      if (res.ok) {
        toast.success(`Status updated to ${statusConfig[newStatus].label}`);
        fetchPreAuths();
      }
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  if (compact) {
    const pending = preAuths.filter(p => !['APPROVED', 'DENIED'].includes(p.status));
    const approved = preAuths.filter(p => p.status === 'APPROVED');
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between p-2 bg-amber-50 border border-amber-200 rounded">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-amber-600" />
            <span className="text-xs text-gray-700">Pending Pre-Auth</span>
          </div>
          <Badge className="bg-amber-100 text-amber-700 text-xs">{pending.length}</Badge>
        </div>
        <div className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-green-600" />
            <span className="text-xs text-gray-700">Approved</span>
          </div>
          <Badge className="bg-green-100 text-green-700 text-xs">{approved.length}</Badge>
        </div>
        <Button size="sm" variant="outline" className="w-full text-xs">
          <Shield className="w-3 h-3 mr-1" /> New Pre-Auth
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-purple-600" />
          <span className="text-sm font-semibold">Pre-Authorization Workflow</span>
          <Badge variant="outline" className="text-xs">{preAuths.length} total</Badge>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)} className="text-xs h-7">
          <Plus className="w-3 h-3 mr-1" /> New Pre-Auth
        </Button>
      </div>

      {/* Status Pipeline */}
      <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-2 overflow-x-auto">
        {STATUS_PIPELINE.map((status, i) => {
          const sc = statusConfig[status];
          const Icon = sc.icon;
          const count = preAuths.filter(p => p.status === status).length;
          return (
            <div key={status} className="flex items-center">
              {i > 0 && <ArrowRight className="w-3 h-3 text-gray-300 mx-1 flex-shrink-0" />}
              <div className={`flex items-center gap-1 px-2 py-1 rounded-md ${sc.bg} flex-shrink-0`}>
                <Icon className={`w-3 h-3 ${sc.color}`} />
                <span className={`text-[10px] font-medium ${sc.color}`}>{sc.label}</span>
                {count > 0 && (
                  <span className={`text-[9px] font-bold ${sc.color} bg-white/50 rounded-full w-4 h-4 flex items-center justify-center`}>
                    {count}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* New Pre-Auth Form */}
      {showForm && (
        <div className="border border-purple-200 rounded-lg p-4 bg-purple-50/50 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">New Pre-Authorization Request</span>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)} className="h-6 text-xs">Cancel</Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Insurance Provider *</Label>
              <Select value={formData.insuranceProvider} onValueChange={v => setFormData(p => ({ ...p, insuranceProvider: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select provider" /></SelectTrigger>
                <SelectContent>
                  {INSURANCE_PROVIDERS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Policy Number</Label>
              <Input className="h-8 text-xs" value={formData.policyNumber} onChange={e => setFormData(p => ({ ...p, policyNumber: e.target.value }))} placeholder="Policy #" />
            </div>
            <div>
              <Label className="text-xs">Treatment Type *</Label>
              <Select value={formData.treatmentType} onValueChange={v => setFormData(p => ({ ...p, treatmentType: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select treatment" /></SelectTrigger>
                <SelectContent>
                  {TREATMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Estimated Cost</Label>
              <Input className="h-8 text-xs" type="number" step="0.01" value={formData.estimatedCost} onChange={e => setFormData(p => ({ ...p, estimatedCost: e.target.value }))} placeholder="$0.00" />
            </div>
          </div>

          <div>
            <Label className="text-xs">Clinical Narrative (required by insurer)</Label>
            <Textarea className="text-xs" rows={3} value={formData.narrative} onChange={e => setFormData(p => ({ ...p, narrative: e.target.value }))}
              placeholder="Describe the clinical necessity, diagnosis, treatment objectives, and expected duration..." />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded p-2">
            <p className="text-[10px] text-blue-700 font-medium mb-1">Required Attachments for Pre-Auth:</p>
            <div className="grid grid-cols-2 gap-1">
              {['Panoramic X-ray', 'Cephalometric X-ray', 'Intraoral Photos (5 views)', 'Treatment Plan Document'].map(item => (
                <div key={item} className="flex items-center gap-1 text-[10px] text-blue-600">
                  <Paperclip className="w-2.5 h-2.5" />{item}
                </div>
              ))}
            </div>
          </div>

          <Button size="sm" onClick={handleSubmit} disabled={submitting} className="w-full">
            {submitting ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <FileText className="w-3 h-3 mr-1" />}
            Create Pre-Authorization
          </Button>
        </div>
      )}

      {/* Pre-Auth List */}
      {loading ? (
        <div className="text-center py-8">
          <Loader2 className="w-6 h-6 text-purple-400 animate-spin mx-auto mb-2" />
        </div>
      ) : preAuths.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
          <Shield className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500 font-medium">No Pre-Authorizations</p>
          <p className="text-xs text-gray-400 mt-1">Create a pre-auth request to submit to insurance before starting treatment</p>
        </div>
      ) : (
        <div className="space-y-2">
          {preAuths.map(pa => {
            const sc = statusConfig[pa.status];
            const Icon = sc.icon;
            const expanded = expandedId === pa.id;
            return (
              <div key={pa.id} className="border border-gray-200 rounded-lg overflow-hidden hover:border-purple-300 transition-colors">
                <div
                  className="p-3 cursor-pointer flex items-center justify-between"
                  onClick={() => setExpandedId(expanded ? null : pa.id)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-8 h-8 rounded-lg ${sc.bg} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-4 h-4 ${sc.color}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{pa.treatmentType}</span>
                        <Badge className={`${sc.bg} ${sc.color} text-[10px]`}>{sc.label}</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-gray-500">
                        <span>{pa.insuranceProvider}</span>
                        {pa.policyNumber && <span>#{pa.policyNumber}</span>}
                        <span>${pa.estimatedCost.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400">{new Date(pa.createdAt).toLocaleDateString()}</span>
                    {expanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                  </div>
                </div>

                {expanded && (
                  <div className="border-t border-gray-100 p-3 bg-gray-50/50 space-y-3">
                    {pa.narrative && (
                      <div>
                        <p className="text-[10px] font-medium text-gray-500 mb-0.5">Clinical Narrative</p>
                        <p className="text-xs text-gray-700">{pa.narrative}</p>
                      </div>
                    )}
                    {pa.approvedAmount !== undefined && pa.status === 'APPROVED' && (
                      <div className="bg-green-50 border border-green-200 rounded p-2">
                        <p className="text-xs text-green-700">
                          <CheckCircle2 className="w-3 h-3 inline mr-1" />
                          Approved: ${pa.approvedAmount.toLocaleString()}
                        </p>
                      </div>
                    )}
                    {pa.denialReason && pa.status === 'DENIED' && (
                      <div className="bg-red-50 border border-red-200 rounded p-2">
                        <p className="text-xs text-red-700">
                          <XCircle className="w-3 h-3 inline mr-1" />
                          Denial Reason: {pa.denialReason}
                        </p>
                      </div>
                    )}
                    <div className="flex gap-2 flex-wrap">
                      {pa.status === 'DRAFT' && (
                        <Button size="sm" className="text-xs h-7 bg-blue-600 hover:bg-blue-700" onClick={() => handleStatusUpdate(pa.id, 'SUBMITTED')}>
                          <Send className="w-3 h-3 mr-1" /> Submit to Insurance
                        </Button>
                      )}
                      {pa.status === 'DENIED' && (
                        <Button size="sm" className="text-xs h-7 bg-purple-600 hover:bg-purple-700" onClick={() => handleStatusUpdate(pa.id, 'APPEALED')}>
                          <ArrowRight className="w-3 h-3 mr-1" /> File Appeal
                        </Button>
                      )}
                      {pa.status === 'INFO_REQUESTED' && (
                        <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleStatusUpdate(pa.id, 'SUBMITTED')}>
                          <Upload className="w-3 h-3 mr-1" /> Resubmit with Info
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
