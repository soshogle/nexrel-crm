'use client';

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { MapPin, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LOCATION_COUNTRIES, getTimezoneForLocation, PROVINCE_ABBREV } from '@/lib/location-data';

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string, isOnline: boolean) => void;
  onTimezoneDetected?: (timezone: string) => void;
}

/** Parse stored value into country and province (e.g. "Quebec, Canada", "Montréal, QC, Canada", or "Online/Remote") */
function parseLocationValue(value: string): { country: string; province: string } {
  if (!value || value === 'Online/Remote') return { country: '', province: '' };
  const parts = value.split(',').map((p) => p.trim()).filter(Boolean);
  const countryNames = new Set(LOCATION_COUNTRIES.map((c) => c.name));

  // Find which part is the country (last match in our list)
  let country = '';
  let countryIdx = -1;
  for (let i = parts.length - 1; i >= 0; i--) {
    const candidate = parts.slice(i).join(', ');
    if (countryNames.has(candidate) || countryNames.has(parts[i])) {
      country = countryNames.has(parts[i]) ? parts[i] : candidate;
      countryIdx = i;
      break;
    }
  }
  if (!country && parts.length > 0) {
    country = parts[parts.length - 1];
    countryIdx = parts.length - 1;
  }

  // Province is the part before country, or empty
  let province = '';
  if (countryIdx > 0) {
    const raw = parts[countryIdx - 1];
    province = PROVINCE_ABBREV[raw] ?? raw;
    const entry = LOCATION_COUNTRIES.find((c) => c.name === country);
    if (entry?.provinces && !entry.provinces.includes(province)) {
      province = entry.provinces.find((p) => p.toLowerCase().includes(province.toLowerCase())) ?? province;
    }
  }

  return { country, province };
}

/** Build display value for operatingLocation */
function buildLocationValue(country: string, province: string): string {
  if (!country) return '';
  if (province) return `${province}, ${country}`;
  return country;
}

export function LocationAutocomplete({ value, onChange, onTimezoneDetected }: LocationAutocompleteProps) {
  const [country, setCountry] = useState('');
  const [province, setProvince] = useState('');
  const [isOnline, setIsOnline] = useState(value === 'Online/Remote');

  const countryEntry = LOCATION_COUNTRIES.find((c) => c.name === country);
  const provinces = countryEntry?.provinces ?? [];

  // Parse incoming value on mount and when value prop changes
  useEffect(() => {
    if (value === 'Online/Remote') {
      setIsOnline(true);
      setCountry('');
      setProvince('');
      return;
    }
    const parsed = parseLocationValue(value);
    setCountry(parsed.country);
    setProvince(parsed.province);
    setIsOnline(false);
  }, [value]);

  // Sync to parent when country/province/online changes
  useEffect(() => {
    if (isOnline) {
      onChange('Online/Remote', true);
      onTimezoneDetected?.('UTC');
      return;
    }
    const loc = buildLocationValue(country, province);
    onChange(loc, false);
    if (loc && onTimezoneDetected) {
      onTimezoneDetected(getTimezoneForLocation(country, province));
    }
  }, [country, province, isOnline, onChange, onTimezoneDetected]);

  const handleCountryChange = (val: string) => {
    setCountry(val);
    setProvince('');
  };

  const handleOnlineToggle = () => {
    const newIsOnline = !isOnline;
    setIsOnline(newIsOnline);
    if (newIsOnline) {
      setCountry('');
      setProvince('');
    }
  };

  return (
    <div className="space-y-2">
      <Label>Business Location</Label>
      <div className="flex gap-2">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
            <Select value={country} onValueChange={handleCountryChange} disabled={isOnline}>
              <SelectTrigger className="pl-10">
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                {LOCATION_COUNTRIES.map((c) => (
                  <SelectItem key={c.name} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {provinces.length > 0 && (
            <Select
              value={province}
              onValueChange={setProvince}
              disabled={isOnline}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Province / State" />
              </SelectTrigger>
              <SelectContent>
                {provinces.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <Button
          type="button"
          variant={isOnline ? 'default' : 'outline'}
          size="icon"
          onClick={handleOnlineToggle}
          title="Online/Remote"
        >
          <Globe className="w-4 h-4" />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {isOnline ? 'Business operates online/remotely' : 'Select your country and province or state'}
      </p>
    </div>
  );
}
