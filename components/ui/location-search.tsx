'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from './input';
import { MapPin, Loader2 } from 'lucide-react';

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

/**
 * Location Search Component
 * Connected to Google Places API via server-side endpoint
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
  const [predictions, setPredictions] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const value = controlledValue !== undefined ? controlledValue : internalValue;

  useEffect(() => {
    if (controlledValue !== undefined) {
      setInternalValue(controlledValue);
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

  // Fetch predictions from server API
  const fetchPredictions = useCallback(async (input: string) => {
    if (!input || input.length < 3) {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/places/autocomplete?input=${encodeURIComponent(input)}&types=(cities)`
      );
      const data = await response.json();

      if (data.predictions && data.predictions.length > 0) {
        setPredictions(data.predictions);
        setShowDropdown(true);
      } else {
        setPredictions([]);
        setShowDropdown(false);
      }
    } catch (error) {
      console.error('Location autocomplete error:', error);
      setPredictions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInternalValue(newValue);

    // Debounce API call
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      fetchPredictions(newValue);
    }, 300);

    // Also update parent with raw value for backward compatibility
    if (!newValue && onChange) {
      onChange(null);
    }
  };

  const handleSelectPrediction = async (prediction: any) => {
    const desc = prediction.description;
    setInternalValue(desc);
    setShowDropdown(false);
    setPredictions([]);

    // Fetch place details
    try {
      const response = await fetch(
        `/api/places/details?placeId=${encodeURIComponent(prediction.place_id)}`
      );
      const data = await response.json();

      if (data.place) {
        const locationData: LocationData = {
          city: data.place.city || '',
          state: data.place.state || '',
          country: data.place.country || '',
          countryCode: data.place.countryCode || '',
          formatted: desc,
          lat: data.place.lat,
          lng: data.place.lng,
          placeId: prediction.place_id,
        };

        if (onChange) onChange(locationData);
        if (onSelect) onSelect(locationData);
      } else {
        // Fallback - parse from description
        const parts = desc.split(',').map((p: string) => p.trim());
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
      }
    } catch (error) {
      console.error('Place details error:', error);
      // Fallback
      const parts = desc.split(',').map((p: string) => p.trim());
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
    }
  };

  return (
    <div className={`relative ${className}`}>
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10 pointer-events-none" />
      <Input
        ref={inputRef}
        type="text"
        value={value}
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
              <span className="text-sm text-white truncate">
                {prediction.description}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
