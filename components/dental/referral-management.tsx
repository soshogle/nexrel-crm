/**
 * Referral Management Component
 * Tracks incoming and outgoing referral letters/reports.
 * Integrates with existing /api/referrals system and document uploads.
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
import {
  ArrowDownLeft,
  ArrowUpRight,
  FileText,
  Plus,
  Search,
  Upload,
  Loader2,
  User,
  Building2,
  Calendar,
  Phone,
  Mail,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';

type ReferralDirection = 'incoming' | 'outgoing';

interface ReferralRecord {
  id: string;
  direction: ReferralDirection;
  referringDoctor: string;
  referringClinic: string;
  patientName: string;
  leadId?: string;
  reason: string;
  status: 'PENDING' | 'ACCEPTED' | 'COMPLETED' | 'DECLINED';
  documentIds: string[];
  createdAt: string;
  notes?: string;
  contactPhone?: string;
  contactEmail?: string;
}

interface ReferralManagementProps {
  leadId?: string;
  compact?: boolean;
}

export function ReferralManagement({ leadId, compact = false }: ReferralManagementProps) {
  const [tab, setTab] = useState<ReferralDirection>('incoming');
  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    direction: 'incoming' as ReferralDirection,
    referringDoctor: '',
    referringClinic: '',
    reason: '',
    notes: '',
    contactPhone: '',
    contactEmail: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchReferrals = useCallback(async () => {
    try {
      setLoading(true);
      const params = leadId ? `?leadId=${leadId}` : '';
      const res = await fetch(`/api/referrals${params}`);
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data?.referrals) ? data.referrals : Array.isArray(data) ? data : [];
        const mapped: ReferralRecord[] = items.map((r: any) => ({
          id: r.id,
          direction: r.direction || (r.type === 'OUTGOING' ? 'outgoing' : 'incoming'),
          referringDoctor: r.referringDoctor || r.referrerName || r.sourceName || '',
          referringClinic: r.referringClinic || r.sourceClinic || '',
          patientName: r.patientName || r.leadName || '',
          leadId: r.leadId,
          reason: r.reason || r.notes || '',
          status: r.status || 'PENDING',
          documentIds: r.documentIds || [],
          createdAt: r.createdAt || new Date().toISOString(),
          notes: r.notes,
          contactPhone: r.contactPhone || r.phone,
          contactEmail: r.contactEmail || r.email,
        }));
        setReferrals(mapped);
      }
    } catch (err) {
      console.error('Error fetching referrals:', err);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => { fetchReferrals(); }, [fetchReferrals]);

  const filtered = referrals
    .filter(r => r.direction === tab)
    .filter(r => {
      if (!search) return true;
      const s = search.toLowerCase();
      return (
        r.referringDoctor.toLowerCase().includes(s) ||
        r.referringClinic.toLowerCase().includes(s) ||
        r.patientName.toLowerCase().includes(s) ||
        r.reason.toLowerCase().includes(s)
      );
    });

  const handleSubmit = async () => {
    if (!formData.referringDoctor.trim() || !formData.reason.trim()) {
      toast.error('Doctor name and reason are required');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          leadId,
          type: formData.direction === 'outgoing' ? 'OUTGOING' : 'INCOMING',
          status: 'PENDING',
        }),
      });
      if (res.ok) {
        toast.success('Referral created');
        setShowForm(false);
        setFormData({
          direction: 'incoming',
          referringDoctor: '',
          referringClinic: '',
          reason: '',
          notes: '',
          contactPhone: '',
          contactEmail: '',
        });
        fetchReferrals();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to create referral');
      }
    } catch (err: any) {
      toast.error('Failed: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const statusConfig = {
    PENDING: { color: 'bg-amber-100 text-amber-700', icon: Clock },
    ACCEPTED: { color: 'bg-blue-100 text-blue-700', icon: CheckCircle2 },
    COMPLETED: { color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
    DECLINED: { color: 'bg-red-100 text-red-700', icon: AlertCircle },
  };

  if (compact) {
    const incoming = referrals.filter(r => r.direction === 'incoming');
    const outgoing = referrals.filter(r => r.direction === 'outgoing');
    const pending = referrals.filter(r => r.status === 'PENDING');
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded">
          <div className="flex items-center gap-1.5">
            <ArrowDownLeft className="w-3 h-3 text-blue-600" />
            <span className="text-xs text-gray-700">Incoming</span>
          </div>
          <Badge variant="outline" className="text-xs">{incoming.length}</Badge>
        </div>
        <div className="flex items-center justify-between p-2 bg-purple-50 border border-purple-200 rounded">
          <div className="flex items-center gap-1.5">
            <ArrowUpRight className="w-3 h-3 text-purple-600" />
            <span className="text-xs text-gray-700">Outgoing</span>
          </div>
          <Badge variant="outline" className="text-xs">{outgoing.length}</Badge>
        </div>
        {pending.length > 0 && (
          <div className="flex items-center justify-between p-2 bg-amber-50 border border-amber-200 rounded">
            <span className="text-xs text-gray-700">Pending Review</span>
            <Badge className="bg-amber-100 text-amber-700 text-xs">{pending.length}</Badge>
          </div>
        )}
        <Button size="sm" variant="outline" className="w-full text-xs">
          <Plus className="w-3 h-3 mr-1" /> New Referral
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tabs + Actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setTab('incoming')}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium flex items-center gap-1 transition-colors ${tab === 'incoming' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            <ArrowDownLeft className="w-3 h-3" />
            Incoming ({referrals.filter(r => r.direction === 'incoming').length})
          </button>
          <button
            onClick={() => setTab('outgoing')}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium flex items-center gap-1 transition-colors ${tab === 'outgoing' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            <ArrowUpRight className="w-3 h-3" />
            Outgoing ({referrals.filter(r => r.direction === 'outgoing').length})
          </button>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-7 w-40 pl-7 text-xs"
            />
          </div>
          <Button size="sm" onClick={() => setShowForm(true)} className="text-xs h-7">
            <Plus className="w-3 h-3 mr-1" /> New Referral
          </Button>
        </div>
      </div>

      {/* New Referral Form */}
      {showForm && (
        <div className="border border-purple-200 rounded-lg p-4 bg-purple-50/50 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">New Referral</span>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)} className="h-6 text-xs">Cancel</Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Direction</Label>
              <Select value={formData.direction} onValueChange={v => setFormData(p => ({ ...p, direction: v as ReferralDirection }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="incoming">Incoming (from another provider)</SelectItem>
                  <SelectItem value="outgoing">Outgoing (to another provider)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Doctor Name *</Label>
              <Input className="h-8 text-xs" value={formData.referringDoctor} onChange={e => setFormData(p => ({ ...p, referringDoctor: e.target.value }))} placeholder="Dr. name" />
            </div>
            <div>
              <Label className="text-xs">Clinic / Practice</Label>
              <Input className="h-8 text-xs" value={formData.referringClinic} onChange={e => setFormData(p => ({ ...p, referringClinic: e.target.value }))} placeholder="Clinic name" />
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <Input className="h-8 text-xs" value={formData.contactPhone} onChange={e => setFormData(p => ({ ...p, contactPhone: e.target.value }))} placeholder="(xxx) xxx-xxxx" />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input className="h-8 text-xs" value={formData.contactEmail} onChange={e => setFormData(p => ({ ...p, contactEmail: e.target.value }))} placeholder="email@clinic.com" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Reason for Referral *</Label>
            <Textarea className="text-xs" rows={2} value={formData.reason} onChange={e => setFormData(p => ({ ...p, reason: e.target.value }))} placeholder="Reason for referral..." />
          </div>
          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea className="text-xs" rows={2} value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} placeholder="Additional notes..." />
          </div>
          <Button size="sm" onClick={handleSubmit} disabled={submitting} className="w-full">
            {submitting ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Plus className="w-3 h-3 mr-1" />}
            Create Referral
          </Button>
        </div>
      )}

      {/* Referral List */}
      {loading ? (
        <div className="text-center py-8">
          <Loader2 className="w-6 h-6 text-purple-400 animate-spin mx-auto mb-2" />
          <p className="text-xs text-gray-400">Loading referrals...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
          <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500 font-medium">No {tab} referrals</p>
          <p className="text-xs text-gray-400 mt-1">
            {tab === 'incoming' ? 'Referrals from general dentists, oral surgeons, ENTs' : 'Referrals to specialists or other providers'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(ref => {
            const sc = statusConfig[ref.status];
            const Icon = sc.icon;
            return (
              <div key={ref.id} className="border border-gray-200 rounded-lg p-3 hover:border-purple-300 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span className="text-sm font-medium truncate">{ref.referringDoctor}</span>
                      <Badge className={`${sc.color} text-[10px] flex-shrink-0`}>
                        <Icon className="w-2.5 h-2.5 mr-0.5" />{ref.status}
                      </Badge>
                    </div>
                    {ref.referringClinic && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                        <Building2 className="w-3 h-3" />{ref.referringClinic}
                      </div>
                    )}
                    <p className="text-xs text-gray-600 line-clamp-2">{ref.reason}</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <div className="flex items-center gap-1 text-[10px] text-gray-400">
                      <Calendar className="w-2.5 h-2.5" />
                      {new Date(ref.createdAt).toLocaleDateString()}
                    </div>
                    <div className="flex gap-1 mt-1.5">
                      {ref.contactPhone && (
                        <a href={`tel:${ref.contactPhone}`} className="text-blue-500 hover:text-blue-700">
                          <Phone className="w-3 h-3" />
                        </a>
                      )}
                      {ref.contactEmail && (
                        <a href={`mailto:${ref.contactEmail}`} className="text-blue-500 hover:text-blue-700">
                          <Mail className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
