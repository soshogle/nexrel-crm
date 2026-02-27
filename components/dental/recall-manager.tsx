'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Loader2,
  Plus,
  Clock,
  AlertTriangle,
  CheckCircle2,
  CalendarClock,
  Bell,
  RefreshCw,
} from 'lucide-react';

interface RecallManagerProps {
  leadId?: string;
  clinicId?: string;
  compact?: boolean;
  showAllPatients?: boolean;
}

interface Recall {
  id: string;
  leadId: string;
  recallType: string;
  intervalWeeks: number;
  status: string;
  lastVisitDate: string | null;
  nextDueDate: string;
  daysOverdue: number;
  daysUntilDue: number;
  autoSchedule: boolean;
  preferredDay: string | null;
  preferredTime: string | null;
  remindersSent: number;
  notes: string | null;
  lead?: { contactPerson: string | null; phone: string | null; email: string | null };
}

const STATUS_CONFIG: Record<string, { color: string; icon: typeof Clock }> = {
  ACTIVE: { color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  OVERDUE: { color: 'bg-red-100 text-red-800', icon: AlertTriangle },
  SCHEDULED: { color: 'bg-blue-100 text-blue-800', icon: CalendarClock },
  COMPLETED: { color: 'bg-gray-100 text-gray-700', icon: CheckCircle2 },
  INACTIVE: { color: 'bg-gray-100 text-gray-500', icon: Clock },
};

const RECALL_TYPES = [
  { value: 'Ortho Check', label: 'Ortho Check' },
  { value: 'Cleaning', label: 'Cleaning / Prophylaxis' },
  { value: 'Perio Maintenance', label: 'Perio Maintenance' },
  { value: 'Retainer Check', label: 'Retainer Check' },
  { value: 'Exam', label: 'Regular Exam' },
  { value: 'X-Ray', label: 'X-Ray (Annual)' },
  { value: 'Fluoride', label: 'Fluoride Treatment' },
  { value: 'Custom', label: 'Custom' },
];

const INTERVAL_PRESETS = [
  { weeks: 4, label: '4 weeks' },
  { weeks: 6, label: '6 weeks' },
  { weeks: 8, label: '8 weeks' },
  { weeks: 13, label: '3 months' },
  { weeks: 26, label: '6 months' },
  { weeks: 52, label: '12 months' },
];

export function RecallManager({ leadId, clinicId, compact = false, showAllPatients = false }: RecallManagerProps) {
  const [recalls, setRecalls] = useState<Recall[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const fetchRecalls = useCallback(async () => {
    try {
      let url = '/api/dental/recalls?';
      if (leadId) url += `leadId=${leadId}&`;
      if (clinicId) url += `clinicId=${clinicId}&`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setRecalls(data.recalls);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [leadId, clinicId]);

  useEffect(() => { fetchRecalls(); }, [fetchRecalls]);

  const markVisited = async (recall: Recall) => {
    try {
      const res = await fetch('/api/dental/recalls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: recall.id,
          lastVisitDate: new Date().toISOString(),
          intervalWeeks: recall.intervalWeeks,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Recall updated — next due in ${recall.intervalWeeks} weeks`);
        fetchRecalls();
      }
    } catch {
      toast.error('Failed to update recall');
    }
  };

  if (loading) {
    return (
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    const overdue = recalls.filter(r => r.status === 'OVERDUE').length;
    const upcoming = recalls.filter(r => r.status === 'ACTIVE' && r.daysUntilDue <= 14).length;

    return (
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardHeader className="pb-2 px-4 pt-3">
          <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
            <CalendarClock className="h-3.5 w-3.5 text-purple-600" />
            Recalls
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {recalls.length === 0 ? (
            <p className="text-xs text-gray-400">No recalls set</p>
          ) : (
            <div className="space-y-1.5">
              {overdue > 0 && (
                <div className="flex items-center gap-1.5 text-xs">
                  <AlertTriangle className="h-3 w-3 text-red-500" />
                  <span className="text-red-600 font-medium">{overdue} overdue</span>
                </div>
              )}
              {upcoming > 0 && (
                <div className="flex items-center gap-1.5 text-xs">
                  <Bell className="h-3 w-3 text-amber-500" />
                  <span className="text-amber-600">{upcoming} due soon</span>
                </div>
              )}
              {recalls.slice(0, 2).map(r => (
                <div key={r.id} className="flex items-center justify-between text-[10px]">
                  <span className="text-gray-600">{r.recallType}</span>
                  <span className={r.daysOverdue > 0 ? 'text-red-500 font-medium' : 'text-gray-400'}>
                    {r.daysOverdue > 0
                      ? `${r.daysOverdue}d overdue`
                      : `in ${r.daysUntilDue}d`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Full mode
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Recall Schedule</h3>
        <Button size="sm" onClick={() => setShowCreate(true)} className="bg-purple-600 hover:bg-purple-700">
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Recall
        </Button>
      </div>

      {recalls.length === 0 ? (
        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardContent className="py-8 text-center text-gray-400 text-sm">
            No recalls configured
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {recalls.map(recall => {
            const cfg = STATUS_CONFIG[recall.status] || STATUS_CONFIG.ACTIVE;
            const Icon = cfg.icon;
            return (
              <Card key={recall.id} className="bg-white border border-gray-200 shadow-sm">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-gray-500" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {recall.recallType}
                          {showAllPatients && recall.lead?.contactPerson && (
                            <span className="text-gray-500 font-normal ml-1">— {recall.lead.contactPerson}</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          Every {INTERVAL_PRESETS.find(p => p.weeks === recall.intervalWeeks)?.label || `${recall.intervalWeeks} weeks`}
                          {recall.autoSchedule && <span className="ml-1 text-purple-500">(auto-schedule)</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className={`text-xs font-medium ${recall.daysOverdue > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                          {recall.daysOverdue > 0
                            ? `${recall.daysOverdue} days overdue`
                            : `Due in ${recall.daysUntilDue} days`}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {new Date(recall.nextDueDate).toLocaleDateString('en-CA')}
                        </div>
                      </div>
                      <Badge className={`text-[10px] ${cfg.color}`}>{recall.status}</Badge>
                      {(recall.status === 'ACTIVE' || recall.status === 'OVERDUE') && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => markVisited(recall)}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" /> Visited
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CreateRecallDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        leadId={leadId}
        clinicId={clinicId}
        onCreated={() => { setShowCreate(false); fetchRecalls(); }}
      />
    </div>
  );
}

function CreateRecallDialog({ open, onClose, leadId, clinicId, onCreated }: {
  open: boolean;
  onClose: () => void;
  leadId?: string;
  clinicId?: string;
  onCreated: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    recallType: 'Ortho Check',
    intervalWeeks: '6',
    lastVisitDate: new Date().toISOString().slice(0, 10),
    autoSchedule: false,
    preferredDay: '',
    preferredTime: '',
    notes: '',
  });

  const handleSubmit = async () => {
    if (!leadId || !clinicId) {
      toast.error('Patient and clinic are required');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/dental/recalls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          clinicId,
          recallType: form.recallType,
          intervalWeeks: parseInt(form.intervalWeeks),
          lastVisitDate: form.lastVisitDate || null,
          autoSchedule: form.autoSchedule,
          preferredDay: form.preferredDay || null,
          preferredTime: form.preferredTime || null,
          notes: form.notes || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Recall created');
        onCreated();
      } else {
        toast.error(data.error || 'Failed to create recall');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Recall Schedule</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Recall Type</Label>
            <Select value={form.recallType} onValueChange={v => setForm(p => ({ ...p, recallType: v }))}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {RECALL_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Interval</Label>
            <Select value={form.intervalWeeks} onValueChange={v => setForm(p => ({ ...p, intervalWeeks: v }))}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {INTERVAL_PRESETS.map(p => (
                  <SelectItem key={p.weeks} value={String(p.weeks)}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Last Visit Date</Label>
            <Input type="date" value={form.lastVisitDate} onChange={e => setForm(p => ({ ...p, lastVisitDate: e.target.value }))} className="h-8 text-sm" />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Auto-schedule when due</Label>
            <Switch checked={form.autoSchedule} onCheckedChange={v => setForm(p => ({ ...p, autoSchedule: v }))} />
          </div>
          {form.autoSchedule && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Preferred Day</Label>
                <Select value={form.preferredDay} onValueChange={v => setForm(p => ({ ...p, preferredDay: v }))}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Any" /></SelectTrigger>
                  <SelectContent>
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(d => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Preferred Time</Label>
                <Input type="time" value={form.preferredTime} onChange={e => setForm(p => ({ ...p, preferredTime: e.target.value }))} className="h-8 text-sm" />
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="h-8 text-sm">Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving} className="h-8 text-sm bg-purple-600 hover:bg-purple-700">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
            Create Recall
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
