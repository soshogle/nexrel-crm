'use client';

import { useState, useEffect } from 'react';
import { Input } from './input';
import { MapPin } from 'lucide-react';

export interface LocationData {
  city: string;
  state: string;
  country: string;
  countryCode: string;
  formatted: string;
  lat?: number;
  lng?: number;
}

interface LocationSearchProps {
  value?: string;
  defaultValue?: string;
  onChange?: (location: LocationData | null) => void;
  onSelect?: (location: LocationData) => void;
  placeholder?: string;
  className?: string;
  countryRestriction?: string[];
}

/**
 * Location Search Component
 * A simple location input with autocomplete (stub implementation)
 * Will be connected to Google Places API in Phase 2
 */
export function LocationSearch({
  value: controlledValue,
  defaultValue = '',
  onChange,
  onSelect,
  placeholder = 'Enter city, state or ZIP',
  className = '',
  countryRestriction
}: LocationSearchProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const value = controlledValue !== undefined ? controlledValue : internalValue;

  useEffect(() => {
    if (controlledValue !== undefined) {
      setInternalValue(controlledValue);
    }
  }, [controlledValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInternalValue(newValue);
    
    const countryCode = countryRestriction?.[0] || 'US';
    
    // Simple parse for city, state format
    if (newValue.includes(',')) {
      const parts = newValue.split(',').map(p => p.trim());
      const locationData: LocationData = {
        city: parts[0] || '',
        state: parts[1] || '',
        country: parts[2] || countryCode,
        countryCode: countryCode,
        formatted: newValue
      };
      
      if (onChange) {
        onChange(locationData);
      }
      if (onSelect) {
        onSelect(locationData);
      }
    } else if (onChange) {
      if (newValue) {
        onChange({ 
          city: newValue, 
          state: '', 
          country: '', 
          countryCode: countryCode, 
          formatted: newValue 
        });
      } else {
        onChange(null);
      }
    }
  };

  return (
    <div className={`relative ${className}`}>
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="pl-10"
      />
    </div>
  );
}
