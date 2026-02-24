'use client';

import * as React from 'react';
import { format, parse, isValid } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';

export interface DateTimePickerProps {
  /** Value in yyyy-MM-ddTHH:mm format (datetime-local compatible) */
  value: string;
  onChange: (value: string) => void;
  /** Min datetime in yyyy-MM-ddTHH:mm format */
  min?: string;
  placeholder?: string;
  className?: string;
  /** Additional classes for the trigger button */
  triggerClassName?: string;
  /** Additional classes for the time input */
  timeInputClassName?: string;
  /** Additional classes for the popover content (e.g. dark theme) */
  popoverClassName?: string;
  disabled?: boolean;
  required?: boolean;
}

/**
 * DateTimePicker with calendar popup and manual time input.
 * Replaces datetime-local which has poor cross-browser support (no calendar in Safari, manual input often fails).
 */
export function DateTimePicker({
  value,
  onChange,
  min,
  placeholder = 'Select date and time',
  className,
  triggerClassName,
  timeInputClassName,
  popoverClassName,
  disabled = false,
  required = false,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);

  // Parse value to Date or use today
  const dateValue = React.useMemo(() => {
    if (!value || value.length < 10) return undefined;
    try {
      const d = parse(value.slice(0, 16), "yyyy-MM-dd'T'HH:mm", new Date());
      return isValid(d) ? d : undefined;
    } catch {
      return undefined;
    }
  }, [value]);

  const timeValue = React.useMemo(() => {
    if (!value || value.length < 16) return '09:00';
    const timePart = value.slice(11, 16);
    return /^\d{2}:\d{2}$/.test(timePart) ? timePart : '09:00';
  }, [value]);

  const minDate = React.useMemo(() => {
    if (!min || min.length < 10) return undefined;
    try {
      const d = parse(min.slice(0, 16), "yyyy-MM-dd'T'HH:mm", new Date());
      return isValid(d) ? d : undefined;
    } catch {
      return undefined;
    }
  }, [min]);

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    const dateStr = format(date, 'yyyy-MM-dd');
    const newValue = `${dateStr}T${timeValue}`;
    onChange(newValue);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = e.target.value;
    if (!/^\d{2}:\d{2}$/.test(time) && time !== '') return;
    const dateStr = dateValue ? format(dateValue, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
    const newValue = `${dateStr}T${time || '09:00'}`;
    onChange(newValue);
  };

  const displayValue = dateValue
    ? `${format(dateValue, 'MMM d, yyyy')} at ${timeValue}`
    : '';

  return (
    <div className={cn('flex gap-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              'flex-1 justify-start text-left font-normal',
              !value && 'text-muted-foreground',
              triggerClassName
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {displayValue || placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className={cn('w-auto p-0', popoverClassName)} align="start">
          <Calendar
            mode="single"
            selected={dateValue}
            onSelect={(d) => {
              handleDateSelect(d);
              setOpen(false);
            }}
            disabled={minDate ? (date) => date < minDate : undefined}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      <Input
        type="time"
        value={timeValue}
        onChange={handleTimeChange}
        className={cn('w-[110px] shrink-0', timeInputClassName)}
        disabled={disabled}
        required={required}
      />
    </div>
  );
}
