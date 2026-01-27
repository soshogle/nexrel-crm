
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { FileText, Send } from 'lucide-react';

export function CreditApplicationForm() {
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    requestedAmount: '',
    monthlyIncome: '',
    employmentStatus: 'FULL_TIME',
    existingDebt: '',
    purpose: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/credit-scoring/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestedAmount: parseFloat(formData.requestedAmount),
          monthlyIncome: parseFloat(formData.monthlyIncome),
          employmentStatus: formData.employmentStatus,
          existingDebt: parseFloat(formData.existingDebt) || 0,
          purpose: formData.purpose,
        }),
      });

      if (response.ok) {
        toast.success('Credit application submitted successfully');
        setFormData({
          requestedAmount: '',
          monthlyIncome: '',
          employmentStatus: 'FULL_TIME',
          existingDebt: '',
          purpose: '',
        });
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to submit application');
      }
    } catch (error) {
      console.error('Error submitting application:', error);
      toast.error('Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Credit Application
        </CardTitle>
        <CardDescription>Apply for additional credit or financing</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="requestedAmount">Requested Amount *</Label>
            <Input
              id="requestedAmount"
              type="number"
              step="0.01"
              value={formData.requestedAmount}
              onChange={(e) => setFormData({ ...formData, requestedAmount: e.target.value })}
              placeholder="5000.00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="monthlyIncome">Monthly Income *</Label>
            <Input
              id="monthlyIncome"
              type="number"
              step="0.01"
              value={formData.monthlyIncome}
              onChange={(e) => setFormData({ ...formData, monthlyIncome: e.target.value })}
              placeholder="5000.00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="employmentStatus">Employment Status *</Label>
            <Select
              value={formData.employmentStatus}
              onValueChange={(value) => setFormData({ ...formData, employmentStatus: value })}
            >
              <SelectTrigger id="employmentStatus">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FULL_TIME">Full Time</SelectItem>
                <SelectItem value="PART_TIME">Part Time</SelectItem>
                <SelectItem value="SELF_EMPLOYED">Self Employed</SelectItem>
                <SelectItem value="UNEMPLOYED">Unemployed</SelectItem>
                <SelectItem value="RETIRED">Retired</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="existingDebt">Existing Debt (Optional)</Label>
            <Input
              id="existingDebt"
              type="number"
              step="0.01"
              value={formData.existingDebt}
              onChange={(e) => setFormData({ ...formData, existingDebt: e.target.value })}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="purpose">Purpose of Credit *</Label>
            <Input
              id="purpose"
              value={formData.purpose}
              onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              placeholder="Business expansion, equipment purchase, etc."
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            <Send className="mr-2 h-4 w-4" />
            {submitting ? 'Submitting...' : 'Submit Application'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
