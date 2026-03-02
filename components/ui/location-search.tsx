'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from './input';
import { MapPin, Loader2 } from 'lucide-react';
import { useLocaleLabels } from '@/hooks/use-locale-labels';

export interface LocationData {
  city: string;
  state: string;
  country: string;
  countryCode: string;
  formatted: string;
  lat?: number;
  lng?: number;
  placeId?: string;
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

interface PlacePrediction {
  place_id: string;
  description: string;
}

/**
 * Location Search Component
 * Uses server-side Google Places endpoints to avoid legacy JS SDK warnings.
 */
export function LocationSearch({
  value: controlledValue,
  defaultValue = '',
  onChange,
  onSelect,
  placeholder: placeholderProp,
  className = '',
  countryRestriction,
}: LocationSearchProps) {
  const locale = useLocaleLabels();
  const placeholder =
    placeholderProp ||
    `Enter city, ${locale.stateLabel.toLowerCase()} or ${locale.zipLabel.toLowerCase()}`;

  const [inputValue, setInputValue] = useState(defaultValue || '');
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastControlledValueRef = useRef(controlledValue);

  // Sync controlled value
  useEffect(() => {
    if (controlledValue !== undefined && controlledValue !== lastControlledValueRef.current) {
      lastControlledValueRef.current = controlledValue;
      setInputValue(controlledValue);
    }
  }, [controlledValue]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchPredictions = useCallback(
    async (input: string) => {
      if (!input || input.length < 2) {
        setPredictions([]);
        setShowDropdown(false);
        return;
      }

      setIsLoading(true);
      try {
        const params = new URLSearchParams({ input, types: '(cities)' });
        if (Array.isArray(countryRestriction) && countryRestriction.length > 0) {
          params.set('country', countryRestriction.join(','));
        }

        const res = await fetch(`/api/places/autocomplete?${params.toString()}`);
        if (!res.ok) {
          setPredictions([]);
          setShowDropdown(false);
          return;
        }

        const data = await res.json();
        const nextPreds = Array.isArray(data?.predictions) ? data.predictions : [];
        setPredictions(nextPreds);
        setShowDropdown(nextPreds.length > 0);
      } catch {
        setPredictions([]);
        setShowDropdown(false);
      } finally {
        setIsLoading(false);
      }
    },
    [countryRestriction]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      fetchPredictions(newValue);
    }, 300);

    if (!newValue && onChange) {
      onChange(null);
    }
  };

  const handleSelectPrediction = async (prediction: PlacePrediction) => {
    const desc = prediction.description;
    setInputValue(desc);
    setShowDropdown(false);
    setPredictions([]);

    try {
      const res = await fetch(`/api/places/details?placeId=${encodeURIComponent(prediction.place_id)}`);
      if (res.ok) {
        const data = await res.json();
        const p = data?.place;
        if (p) {
          const locationData: LocationData = {
            city: p.city || '',
            state: p.state || '',
            country: p.country || '',
            countryCode: p.countryCode || '',
            formatted: p.description || desc,
            lat: p.lat,
            lng: p.lng,
            placeId: p.placeId || prediction.place_id,
          };
          if (onChange) onChange(locationData);
          if (onSelect) onSelect(locationData);
          return;
        }
      }
    } catch {
      // Ignore and use fallback
    }

    // Fallback parsing from description
    const parts = desc.split(',').map((p) => p.trim());
    const locationData: LocationData = {
      city: parts[0] || '',
      state: parts[1] || '',
      country: parts[2] || '',
      countryCode: '',
      formatted: desc,
      placeId: prediction.place_id,
    };
    if (onChange) onChange(locationData);
    if (onSelect) onSelect(locationData);
  };

  return (
    <div className={`relative ${className}`}>
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10 pointer-events-none" />
      <Input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => predictions.length > 0 && setShowDropdown(true)}
        placeholder={placeholder}
        className="pl-10 pr-8 bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20"
        autoComplete="off"
      />
      {isLoading && (
        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 animate-spin" />
      )}

      {showDropdown && predictions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-[9999] w-full mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl max-h-60 overflow-y-auto"
        >
          {predictions.map((prediction, idx) => (
            <button
              key={prediction.place_id || idx}
              type="button"
              onClick={() => handleSelectPrediction(prediction)}
              className="w-full px-4 py-3 text-left hover:bg-slate-700 flex items-center gap-3 transition-colors"
            >
              <MapPin className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <span className="text-sm text-white truncate">{prediction.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
