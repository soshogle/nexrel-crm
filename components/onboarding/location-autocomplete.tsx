'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, X, Loader2, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string, isOnline: boolean) => void;
  onTimezoneDetected?: (timezone: string) => void;
}

export function LocationAutocomplete({ value, onChange, onTimezoneDetected }: LocationAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [isOnline, setIsOnline] = useState(value === 'Online/Remote');
  const [predictions, setPredictions] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

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
      console.error('Autocomplete error:', error);
      setPredictions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle input change with debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    if (!val) {
      onChange('', false);
      setPredictions([]);
      setShowDropdown(false);
      return;
    }

    // Debounce API call
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      fetchPredictions(val);
    }, 300);
  };

  const handleSelectPrediction = async (prediction: any) => {
    const desc = prediction.description;
    setInputValue(desc);
    onChange(desc, false);
    setShowDropdown(false);
    setPredictions([]);

    // Fetch place details for timezone detection
    try {
      const response = await fetch(
        `/api/places/details?placeId=${encodeURIComponent(prediction.place_id)}`
      );
      const data = await response.json();

      if (data.place && onTimezoneDetected) {
        // Try to guess timezone from location
        const timezone = guessTimezoneFromLocation(desc, data.place.country);
        onTimezoneDetected(timezone);
      }
    } catch (error) {
      console.error('Place details error:', error);
    }
  };

  const guessTimezoneFromLocation = (location: string, country?: string): string => {
    const lowerLocation = location.toLowerCase();
    const lowerCountry = (country || '').toLowerCase();

    // US cities
    if (lowerLocation.includes('new york') || lowerLocation.includes('boston') || lowerLocation.includes('philadelphia') || lowerLocation.includes('atlanta') || lowerLocation.includes('miami')) return 'America/New_York';
    if (lowerLocation.includes('chicago') || lowerLocation.includes('dallas') || lowerLocation.includes('houston')) return 'America/Chicago';
    if (lowerLocation.includes('denver') || lowerLocation.includes('phoenix')) return 'America/Denver';
    if (lowerLocation.includes('los angeles') || lowerLocation.includes('san francisco') || lowerLocation.includes('seattle')) return 'America/Los_Angeles';

    // Canada
    if (lowerLocation.includes('toronto') || lowerLocation.includes('montreal') || lowerLocation.includes('ottawa')) return 'America/Toronto';
    if (lowerLocation.includes('vancouver')) return 'America/Vancouver';
    if (lowerLocation.includes('calgary') || lowerLocation.includes('edmonton')) return 'America/Edmonton';

    // Europe
    if (lowerLocation.includes('london')) return 'Europe/London';
    if (lowerLocation.includes('paris')) return 'Europe/Paris';
    if (lowerLocation.includes('berlin')) return 'Europe/Berlin';
    if (lowerLocation.includes('madrid')) return 'Europe/Madrid';
    if (lowerLocation.includes('rome')) return 'Europe/Rome';

    // Asia
    if (lowerLocation.includes('tokyo')) return 'Asia/Tokyo';
    if (lowerLocation.includes('mumbai') || lowerLocation.includes('delhi') || lowerLocation.includes('bangalore')) return 'Asia/Kolkata';
    if (lowerLocation.includes('singapore')) return 'Asia/Singapore';
    if (lowerLocation.includes('hong kong')) return 'Asia/Hong_Kong';
    if (lowerLocation.includes('dubai')) return 'Asia/Dubai';

    // Australia
    if (lowerLocation.includes('sydney') || lowerLocation.includes('melbourne')) return 'Australia/Sydney';
    if (lowerLocation.includes('perth')) return 'Australia/Perth';

    // Country-based fallback
    if (lowerCountry.includes('canada')) return 'America/Toronto';
    if (lowerCountry.includes('united states')) return 'America/New_York';
    if (lowerCountry.includes('united kingdom')) return 'Europe/London';
    if (lowerCountry.includes('france')) return 'Europe/Paris';
    if (lowerCountry.includes('germany')) return 'Europe/Berlin';
    if (lowerCountry.includes('india')) return 'Asia/Kolkata';
    if (lowerCountry.includes('australia')) return 'Australia/Sydney';

    // Default
    return 'UTC';
  };

  const handleOnlineToggle = () => {
    const newIsOnline = !isOnline;
    setIsOnline(newIsOnline);
    if (newIsOnline) {
      setInputValue('Online/Remote');
      onChange('Online/Remote', true);
      setPredictions([]);
      setShowDropdown(false);
      if (onTimezoneDetected) {
        onTimezoneDetected('UTC');
      }
    } else {
      setInputValue('');
      onChange('', false);
    }
  };

  const handleClear = () => {
    setInputValue('');
    setIsOnline(false);
    onChange('', false);
    setPredictions([]);
    setShowDropdown(false);
  };

  return (
    <div className="space-y-2">
      <Label>Business Location</Label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => predictions.length > 0 && setShowDropdown(true)}
            placeholder={isOnline ? 'Online/Remote' : 'Search city...'}
            disabled={isOnline}
            className="pl-10 pr-8"
            autoComplete="off"
          />
          {isLoading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
          )}
          {inputValue && !isLoading && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {showDropdown && predictions.length > 0 && (
            <div
              ref={dropdownRef}
              className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto"
            >
              {predictions.map((prediction, idx) => (
                <button
                  key={prediction.place_id || idx}
                  type="button"
                  onClick={() => handleSelectPrediction(prediction)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors"
                >
                  <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-sm text-gray-700 dark:text-gray-200 truncate">
                    {prediction.description}
                  </span>
                </button>
              ))}
            </div>
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
        {isOnline ? 'Business operates online/remotely' : 'Enter your city or business location'}
      </p>
    </div>
  );
}
