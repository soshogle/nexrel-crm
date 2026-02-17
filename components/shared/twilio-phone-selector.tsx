/**
 * Shared Twilio Phone Selector
 * Every agent that makes or receives phone calls MUST use this.
 * - Fetches from Twilio owned numbers only
 * - Required selection (no manual entry)
 * - Assigns to agent in ElevenLabs when selected
 */

'use client';

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Phone, Loader2, ShoppingCart } from 'lucide-react';

export interface TwilioPhoneOption {
  phoneNumber: string;
  friendlyName?: string;
}

interface TwilioPhoneSelectorProps {
  value: string;
  onChange: (phoneNumber: string) => void;
  required?: boolean;
  disabled?: boolean;
  onPurchaseClick?: () => void;
  showPurchaseButton?: boolean;
  label?: string;
  description?: string;
  className?: string;
  /** When this changes, numbers are refetched (e.g. after purchase) */
  refreshTrigger?: unknown;
}

export function TwilioPhoneSelector({
  value,
  onChange,
  required = true,
  disabled = false,
  onPurchaseClick,
  showPurchaseButton = true,
  label = 'Phone Number',
  description = 'Required for calls. Select from your Twilio account. The system assigns it to the agent in ElevenLabs.',
  className = '',
  refreshTrigger,
}: TwilioPhoneSelectorProps) {
  const [numbers, setNumbers] = useState<TwilioPhoneOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/twilio/phone-numbers/owned')
      .then((r) => (r.ok ? r.json() : { numbers: [] }))
      .then((d) => setNumbers(d.numbers || []))
      .catch(() => setNumbers([]))
      .finally(() => setLoading(false));
  }, [refreshTrigger]);

  return (
    <div className={`space-y-2 ${className}`}>
      <Label className="flex items-center gap-2">
        <Phone className="h-4 w-4" />
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading phone numbers...
        </div>
      ) : (
        <div className="flex gap-2">
          <Select value={value || ''} onValueChange={onChange} disabled={disabled} required={required}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select a phone number..." />
            </SelectTrigger>
            <SelectContent>
              {numbers.map((n) => (
                <SelectItem key={n.phoneNumber} value={n.phoneNumber}>
                  📞 {n.phoneNumber} {n.friendlyName ? `(${n.friendlyName})` : ''}
                </SelectItem>
              ))}
              {numbers.length === 0 && (
                <SelectItem value="__none__" disabled>
                  No phone numbers found
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          {showPurchaseButton && onPurchaseClick && (
            <Button type="button" variant="outline" onClick={onPurchaseClick} className="gap-2 whitespace-nowrap">
              <ShoppingCart className="h-4 w-4" />
              Buy Number
            </Button>
          )}
        </div>
      )}
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      {numbers.length === 0 && !loading && (
        <p className="text-xs text-amber-600 dark:text-amber-500">
          Purchase a number first to enable phone calls.
        </p>
      )}
    </div>
  );
}
