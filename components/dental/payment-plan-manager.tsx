'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  DollarSign,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  CreditCard,
} from 'lucide-react';

interface PaymentPlanManagerProps {
  leadId: string;
  clinicId?: string;
  compact?: boolean;
}

interface Installment {
  number: number;
  dueDate: string;
  amount: number;
  status: 'pending' | 'paid' | 'overdue';
  paidAt: string | null;
}

interface PaymentPlan {
  id: string;
  planName: string;
  totalAmount: number;
  downPayment: number;
  numberOfPayments: number;
  paymentAmount: number;
  paymentFrequency: string;
  interestRate: number;
  currency: string;
  status: string;
  startDate: string;
  nextPaymentDate: string | null;
  installments: Installment[] | null;
  notes: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-blue-100 text-blue-800',
  PAUSED: 'bg-yellow-100 text-yellow-800',
  DEFAULTED: 'bg-red-100 text-red-800',
  DRAFT: 'bg-gray-100 text-gray-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

function daysBetween(d1: Date, d2: Date) {
  return Math.ceil((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
}

export function PaymentPlanManager({ leadId, clinicId, compact = false }: PaymentPlanManagerProps) {
  const [plans, setPlans] = useState<PaymentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<PaymentPlan | null>(null);
  const [recording, setRecording] = useState<string | null>(null);

  const fetchPlans = useCallback(async () => {
    if (!leadId) return;
    try {
      const res = await fetch(`/api/dental/payment-plans?leadId=${leadId}`);
      const data = await res.json();
      if (data.success) setPlans(data.plans);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const recordPayment = async (planId: string, installmentNumber: number) => {
    setRecording(`${planId}-${installmentNumber}`);
    try {
      const res = await fetch('/api/dental/payment-plans', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, installmentNumber }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Payment recorded');
        fetchPlans();
      } else {
        toast.error(data.error || 'Failed to record payment');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setRecording(null);
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

  const activePlan = plans.find(p => p.status === 'ACTIVE');

  if (compact) {
    if (!activePlan) {
      return (
        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardHeader className="pb-2 px-4 pt-3">
            <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5 text-purple-600" />
              Payment Plan
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-xs text-gray-400">No active payment plan</p>
          </CardContent>
        </Card>
      );
    }

    const installments = activePlan.installments || [];
    const paid = installments.filter(i => i.status === 'paid').length;
    const total = installments.length;
    const paidAmount = installments.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0) + activePlan.downPayment;
    const pct = total > 0 ? Math.round((paid / total) * 100) : 0;
    const next = activePlan.nextPaymentDate ? new Date(activePlan.nextPaymentDate) : null;
    const daysUntil = next ? daysBetween(next, new Date()) : null;

    return (
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardHeader className="pb-2 px-4 pt-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5 text-purple-600" />
              Payment Plan
            </CardTitle>
            <Badge className={`text-[10px] ${STATUS_COLORS[activePlan.status] || ''}`}>{activePlan.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-2">
          <p className="text-xs font-medium text-gray-700">{activePlan.planName}</p>
          <div className="flex justify-between text-[10px] text-gray-500">
            <span>{formatCurrency(paidAmount)} of {formatCurrency(activePlan.totalAmount)}</span>
            <span>{paid}/{total} payments</span>
          </div>
          <Progress value={pct} className="h-1.5" />
          {daysUntil !== null && (
            <p className="text-[10px] text-gray-500">
              Next: {formatCurrency(activePlan.paymentAmount)} in {daysUntil} days
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // Full mode
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Payment Plans</h3>
        <Button size="sm" onClick={() => setShowCreate(true)} className="bg-purple-600 hover:bg-purple-700">
          <Plus className="h-3.5 w-3.5 mr-1" /> New Plan
        </Button>
      </div>

      {plans.length === 0 ? (
        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardContent className="py-8 text-center text-gray-400 text-sm">
            No payment plans yet
          </CardContent>
        </Card>
      ) : (
        plans.map(plan => {
          const installments = plan.installments || [];
          const paid = installments.filter(i => i.status === 'paid').length;
          const paidAmount = installments.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0) + plan.downPayment;
          const pct = installments.length > 0 ? Math.round((paid / installments.length) * 100) : 0;

          return (
            <Card key={plan.id} className="bg-white border border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setShowDetail(plan)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-gray-900">{plan.planName}</h4>
                  <Badge className={`text-[10px] ${STATUS_COLORS[plan.status] || ''}`}>{plan.status}</Badge>
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs text-gray-600 mb-2">
                  <div><DollarSign className="h-3 w-3 inline mr-0.5" />{formatCurrency(plan.totalAmount)}</div>
                  <div><Calendar className="h-3 w-3 inline mr-0.5" />{plan.numberOfPayments}x {formatCurrency(plan.paymentAmount)}</div>
                  <div><CheckCircle2 className="h-3 w-3 inline mr-0.5" />{paid}/{installments.length} paid</div>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={pct} className="h-1.5 flex-1" />
                  <span className="text-[10px] text-gray-500">{pct}%</span>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}

      {/* Detail Dialog */}
      {showDetail && (
        <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{showDetail.planName}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500">Total:</span> <span className="font-medium">{formatCurrency(showDetail.totalAmount)}</span></div>
                <div><span className="text-gray-500">Down payment:</span> <span className="font-medium">{formatCurrency(showDetail.downPayment)}</span></div>
                <div><span className="text-gray-500">Frequency:</span> <span className="font-medium capitalize">{showDetail.paymentFrequency.toLowerCase()}</span></div>
                <div><span className="text-gray-500">Interest:</span> <span className="font-medium">{showDetail.interestRate}%</span></div>
              </div>

              <h4 className="text-sm font-semibold text-gray-900 mt-4">Installments</h4>
              <div className="space-y-1">
                {(showDetail.installments || []).map((inst) => {
                  const due = new Date(inst.dueDate);
                  const overdue = inst.status === 'pending' && due < new Date();
                  return (
                    <div key={inst.number} className={`flex items-center justify-between p-2 rounded-md text-xs ${inst.status === 'paid' ? 'bg-green-50' : overdue ? 'bg-red-50' : 'bg-gray-50'}`}>
                      <div className="flex items-center gap-2">
                        {inst.status === 'paid' ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                        ) : overdue ? (
                          <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                        ) : (
                          <Clock className="h-3.5 w-3.5 text-gray-400" />
                        )}
                        <span>#{inst.number} — {due.toLocaleDateString('en-CA')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{formatCurrency(inst.amount)}</span>
                        {inst.status === 'pending' && showDetail.status === 'ACTIVE' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-[10px] px-2"
                            disabled={recording === `${showDetail.id}-${inst.number}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              recordPayment(showDetail.id, inst.number);
                            }}
                          >
                            {recording === `${showDetail.id}-${inst.number}` ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Record'}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Create Dialog */}
      <CreatePlanDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        leadId={leadId}
        clinicId={clinicId}
        onCreated={() => { setShowCreate(false); fetchPlans(); }}
      />
    </div>
  );
}

function CreatePlanDialog({ open, onClose, leadId, clinicId, onCreated }: {
  open: boolean;
  onClose: () => void;
  leadId: string;
  clinicId?: string;
  onCreated: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    planName: '',
    totalAmount: '',
    downPayment: '0',
    numberOfPayments: '12',
    paymentFrequency: 'MONTHLY',
    interestRate: '0',
    startDate: new Date().toISOString().slice(0, 10),
    notes: '',
  });

  const total = parseFloat(form.totalAmount) || 0;
  const down = parseFloat(form.downPayment) || 0;
  const payments = parseInt(form.numberOfPayments) || 1;
  const perPayment = payments > 0 ? Math.round(((total - down) / payments) * 100) / 100 : 0;

  const handleSubmit = async () => {
    if (!form.planName || !total || !payments || !form.startDate) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/dental/payment-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          clinicId,
          planName: form.planName,
          totalAmount: total,
          downPayment: down,
          numberOfPayments: payments,
          paymentFrequency: form.paymentFrequency,
          interestRate: parseFloat(form.interestRate) || 0,
          startDate: form.startDate,
          notes: form.notes || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Payment plan created');
        onCreated();
      } else {
        toast.error(data.error || 'Failed to create plan');
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
          <DialogTitle>Create Payment Plan</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Plan Name</Label>
            <Input value={form.planName} onChange={e => setForm(p => ({ ...p, planName: e.target.value }))} placeholder="e.g., Invisalign Payment Plan" className="h-8 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Total Amount ($)</Label>
              <Input type="number" value={form.totalAmount} onChange={e => setForm(p => ({ ...p, totalAmount: e.target.value }))} placeholder="5500" className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Down Payment ($)</Label>
              <Input type="number" value={form.downPayment} onChange={e => setForm(p => ({ ...p, downPayment: e.target.value }))} placeholder="500" className="h-8 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs"># of Payments</Label>
              <Input type="number" value={form.numberOfPayments} onChange={e => setForm(p => ({ ...p, numberOfPayments: e.target.value }))} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Frequency</Label>
              <Select value={form.paymentFrequency} onValueChange={v => setForm(p => ({ ...p, paymentFrequency: v }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                  <SelectItem value="BIWEEKLY">Bi-weekly</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                  <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Start Date</Label>
              <Input type="date" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Interest Rate (%)</Label>
              <Input type="number" value={form.interestRate} onChange={e => setForm(p => ({ ...p, interestRate: e.target.value }))} className="h-8 text-sm" />
            </div>
          </div>
          {total > 0 && (
            <div className="p-3 bg-purple-50 rounded-md text-sm">
              <p className="font-medium text-purple-900">
                {payments}x {formatCurrency(perPayment)} / {form.paymentFrequency.toLowerCase()}
              </p>
              <p className="text-xs text-purple-700 mt-0.5">
                After {formatCurrency(down)} down payment
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="h-8 text-sm">Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving} className="h-8 text-sm bg-purple-600 hover:bg-purple-700">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
            Create Plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatCurrency(amount: number, currency = 'CAD') {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency }).format(amount);
}
