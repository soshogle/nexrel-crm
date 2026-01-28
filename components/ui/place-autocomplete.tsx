'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { MapPin, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlaceAutocompleteProps {
  value: string;
  onChange: (value: string, placeData?: PlaceData) => void;
  placeholder?: string;
  className?: string;
  types?: string; // e.g., '(cities)', '(regions)', 'address'
}

export interface PlaceData {
  description: string;
  placeId: string;
  city?: string;
  state?: string;
  country?: string;
  lat?: number;
  lng?: number;
}

export function PlaceAutocomplete({
  value,
  onChange,
  placeholder = 'Search location...',
  className,
  types = '(cities)',
}: PlaceAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiAvailable, setApiAvailable] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Update input when value prop changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

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
  const fetchPredictions = useCallback(
    async (input: string) => {
      if (!input || input.length < 3) {
        setPredictions([]);
        setShowDropdown(false);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/places/autocomplete?input=${encodeURIComponent(input)}&types=${encodeURIComponent(types)}`
        );
        const data = await response.json();

        if (data.noApiKey) {
          setApiAvailable(false);
          setPredictions([]);
        } else if (data.predictions && data.predictions.length > 0) {
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
    },
    [types]
  );

  // Debounced input handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    if (!val) {
      onChange('');
      setPredictions([]);
      setShowDropdown(false);
      return;
    }

    // Debounce the API call
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      fetchPredictions(val);
    }, 300);
  };

  // Handle prediction selection
  const handleSelectPrediction = async (prediction: any) => {
    const desc = prediction.description;
    setInputValue(desc);
    setShowDropdown(false);
    setPredictions([]);

    // Fetch place details for coordinates and address components
    try {
      const response = await fetch(
        `/api/places/details?placeId=${encodeURIComponent(prediction.place_id)}`
      );
      const data = await response.json();

      if (data.place) {
        onChange(desc, data.place);
      } else {
        onChange(desc, { description: desc, placeId: prediction.place_id });
      }
    } catch (error) {
      console.error('Place details error:', error);
      onChange(desc, { description: desc, placeId: prediction.place_id });
    }
  };

  // Handle blur - if user typed without selecting, just use the text
  const handleBlur = () => {
    // Delay to allow click on dropdown
    setTimeout(() => {
      if (inputValue && inputValue !== value) {
        onChange(inputValue);
      }
    }, 200);
  };

  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => predictions.length > 0 && setShowDropdown(true)}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={cn('pl-10 pr-8', className)}
          autoComplete="off"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
        )}
      </div>

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
  );
}
