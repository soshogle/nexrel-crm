
'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  SALES_CYCLE_LENGTHS,
  LEAD_SOURCES,
  CONTACT_METHODS
} from '@/lib/onboarding-config';
import { DollarSign } from 'lucide-react';

interface SalesConfigStepProps {
  data: any;
  onChange: (data: any) => void;
  currency?: string;
}

export function SalesConfigStep({ data, onChange, currency = 'USD' }: SalesConfigStepProps) {
  // Parse lead sources safely
  const parseLeadSources = (sources: any) => {
    if (!sources) return [];
    if (typeof sources === 'string') {
      try {
        return JSON.parse(sources);
      } catch (e) {
        return [];
      }
    }
    return Array.isArray(sources) ? sources : [];
  };

  // Initialize with consistent empty values to prevent hydration mismatch
  const [formData, setFormData] = useState({
    averageDealValue: '',
    salesCycleLength: '',
    leadSources: [] as string[],
    preferredContactMethod: ''
  });

  const [initialized, setInitialized] = useState(false);

  // Sync data from props after client-side mount
  useEffect(() => {
    if (!initialized && data) {
      setFormData({
        averageDealValue: data.averageDealValue || '',
        salesCycleLength: data.salesCycleLength || '',
        leadSources: parseLeadSources(data.leadSources),
        preferredContactMethod: data.preferredContactMethod || ''
      });
      setInitialized(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, initialized]);

  useEffect(() => {
    if (initialized) {
      const dataToSave = {
        ...formData,
        averageDealValue: formData.averageDealValue ? parseFloat(formData.averageDealValue) : null,
        leadSources: JSON.stringify(formData.leadSources)
      };
      onChange(dataToSave);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, initialized]);

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleLeadSource = (source: string) => {
    setFormData(prev => {
      const sources = prev.leadSources.includes(source)
        ? prev.leadSources.filter((s: string) => s !== source)
        : [...prev.leadSources, source];
      return { ...prev, leadSources: sources };
    });
  };

  const getCurrencySymbol = (curr: string) => {
    const symbols: any = {
      USD: '$', EUR: '€', GBP: '£', CAD: 'CA$', AUD: 'A$',
      INR: '₹', JPY: '¥', CNY: '¥', BRL: 'R$', MXN: 'MX$'
    };
    return symbols[curr] || '$';
  };

  // Don't render until client-side initialization is complete
  if (!initialized) {
    return (
      <div className="space-y-6 flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6" suppressHydrationWarning>
      <div>
        <h2 className="text-2xl font-bold mb-2">Sales Configuration</h2>
        <p className="text-muted-foreground">
          Help us understand your sales process so we can optimize your pipeline and forecasting.
        </p>
      </div>

      <div className="space-y-4">
        {/* Average Deal Value */}
        <div className="space-y-2">
          <Label htmlFor="averageDealValue">Average Deal Value *</Label>
          <div className="relative">
            <span className="absolute left-3 top-3 text-muted-foreground">
              {getCurrencySymbol(currency)}
            </span>
            <Input
              id="averageDealValue"
              type="number"
              placeholder="0.00"
              value={formData.averageDealValue}
              onChange={(e) => updateField('averageDealValue', e.target.value)}
              className="pl-8"
              min="0"
              step="0.01"
              required
            />
          </div>
          <p className="text-xs text-muted-foreground">
            What's the typical value of a closed deal?
          </p>
        </div>

        {/* Sales Cycle Length */}
        <div className="space-y-2">
          <Label htmlFor="salesCycleLength">Sales Cycle Length *</Label>
          <Select
            value={formData.salesCycleLength}
            onValueChange={(value) => updateField('salesCycleLength', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="How long from lead to close?" />
            </SelectTrigger>
            <SelectContent>
              {SALES_CYCLE_LENGTHS.map((length) => (
                <SelectItem key={length} value={length}>
                  {length}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Lead Sources */}
        <div className="space-y-3">
          <Label>Where Do Your Leads Come From? * (Select all that apply)</Label>
          <div className="space-y-2">
            {LEAD_SOURCES.map((source) => (
              <div key={source} className="flex items-center space-x-2">
                <Checkbox
                  id={source}
                  checked={formData.leadSources.includes(source)}
                  onCheckedChange={() => toggleLeadSource(source)}
                />
                <label
                  htmlFor={source}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {source}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Preferred Contact Method */}
        <div className="space-y-2">
          <Label htmlFor="preferredContactMethod">Preferred Contact Method *</Label>
          <Select
            value={formData.preferredContactMethod}
            onValueChange={(value) => updateField('preferredContactMethod', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="How do you prefer to reach leads?" />
            </SelectTrigger>
            <SelectContent>
              {CONTACT_METHODS.map((method) => (
                <SelectItem key={method} value={method}>
                  {method}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
