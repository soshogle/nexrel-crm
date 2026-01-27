
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Calculator, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CashReconciliationDialogProps {
  onSuccess?: () => void;
}

export function CashReconciliationDialog({ onSuccess }: CashReconciliationDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [formData, setFormData] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    startingCash: '',
    actualCash: '',
    notes: '',
  });

  const calculateExpectedCash = () => {
    if (!summary) return 0;
    const starting = parseFloat(formData.startingCash) || 0;
    const expected =
      starting +
      summary.totalSales / 100 -
      summary.totalRefunds / 100 -
      summary.totalExpenses / 100 +
      summary.totalAdjustments / 100;
    return expected;
  };

  const calculateDiscrepancy = () => {
    const actual = parseFloat(formData.actualCash) || 0;
    const expected = calculateExpectedCash();
    return actual - expected;
  };

  const loadSummary = async () => {
    try {
      const response = await fetch('/api/payments/cash/reconciliation/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: formData.startDate,
          endDate: formData.endDate,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Error loading summary:', error);
    }
  };

  useEffect(() => {
    if (open) {
      loadSummary();
    }
  }, [formData.startDate, formData.endDate, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/payments/cash/reconciliation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          startingCash: parseFloat(formData.startingCash) || 0,
          actualCash: parseFloat(formData.actualCash) || 0,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create reconciliation');
      }

      toast.success('Cash reconciliation completed', {
        description: `${data.reconciliation.transactionCount} transactions reconciled`,
      });

      // Reset form
      setFormData({
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        startingCash: '',
        actualCash: '',
        notes: '',
      });

      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error creating reconciliation:', error);
      toast.error('Failed to complete reconciliation', {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const discrepancy = calculateDiscrepancy();
  const expectedCash = calculateExpectedCash();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Calculator className="mr-2 h-4 w-4" />
          End-of-Day Reconciliation
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cash Reconciliation</DialogTitle>
          <DialogDescription>
            Reconcile your cash drawer at the end of the day. Compare expected vs actual cash amounts.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date *</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                required
              />
            </div>
          </div>

          {summary && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Transaction Summary</CardTitle>
                <CardDescription>
                  Transactions from {formData.startDate} to {formData.endDate}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Sales</p>
                    <p className="text-lg font-semibold text-green-600">
                      ${(summary.totalSales / 100).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Refunds</p>
                    <p className="text-lg font-semibold text-red-600">
                      -${(summary.totalRefunds / 100).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Expenses</p>
                    <p className="text-lg font-semibold text-red-600">
                      -${(summary.totalExpenses / 100).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Adjustments</p>
                    <p className="text-lg font-semibold">
                      ${(summary.totalAdjustments / 100).toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground">Transaction Count</p>
                  <p className="text-lg font-semibold">{summary.transactionCount} transactions</p>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startingCash">Starting Cash (USD)</Label>
              <Input
                id="startingCash"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.startingCash}
                onChange={(e) => setFormData({ ...formData, startingCash: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Cash in drawer at start of period
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="actualCash">Actual Cash (USD) *</Label>
              <Input
                id="actualCash"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.actualCash}
                onChange={(e) => setFormData({ ...formData, actualCash: e.target.value })}
                required
              />
              <p className="text-xs text-muted-foreground">
                Actual cash counted in drawer
              </p>
            </div>
          </div>

          {formData.actualCash && summary && (
            <Card className={discrepancy !== 0 ? 'border-amber-500' : 'border-green-500'}>
              <CardContent className="pt-6">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Expected Cash</p>
                    <p className="text-2xl font-bold">${expectedCash.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Actual Cash</p>
                    <p className="text-2xl font-bold">
                      ${parseFloat(formData.actualCash).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Discrepancy</p>
                    <p
                      className={`text-2xl font-bold ${
                        discrepancy > 0
                          ? 'text-green-600'
                          : discrepancy < 0
                          ? 'text-red-600'
                          : 'text-gray-600'
                      }`}
                    >
                      {discrepancy > 0 ? '+' : ''}${Math.abs(discrepancy).toFixed(2)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {discrepancy !== 0 && formData.actualCash && (
            <Alert variant={Math.abs(discrepancy) > 10 ? 'destructive' : 'default'}>
              {Math.abs(discrepancy) > 10 ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              <AlertDescription>
                {Math.abs(discrepancy) > 10 ? (
                  <>
                    <strong>Large discrepancy detected!</strong> There is a difference of ${Math.abs(discrepancy).toFixed(2)} between expected and actual cash. Please review your transactions and recount.
                  </>
                ) : (
                  <>
                    Minor discrepancy of ${Math.abs(discrepancy).toFixed(2)}. This is within acceptable range.
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Notes about this reconciliation (e.g., reasons for discrepancies)..."
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !summary}>
              {loading ? 'Processing...' : 'Complete Reconciliation'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
