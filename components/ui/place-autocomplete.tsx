'use client';

import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { MapPin, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlaceAutocompleteProps {
  value: string;
  onChange: (value: string, placeData?: PlaceData) => void;
  placeholder?: string;
  className?: string;
  types?: string[]; // e.g., ['(cities)'], ['(regions)'], ['address']
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
  types = ['(cities)']
}: PlaceAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteService = useRef<any>(null);
  const placesService = useRef<any>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Initialize Google services
  useEffect(() => {
    const initGoogle = () => {
      if (typeof window !== 'undefined' && (window as any).google?.maps?.places) {
        autocompleteService.current = new (window as any).google.maps.places.AutocompleteService();
        placesService.current = new (window as any).google.maps.places.PlacesService(
          document.createElement('div')
        );
      }
    };
    
    initGoogle();
    
    // Retry if Google Maps not loaded yet
    const interval = setInterval(() => {
      if ((window as any).google?.maps?.places) {
        initGoogle();
        clearInterval(interval);
      }
    }, 500);
    
    return () => clearInterval(interval);
  }, []);

  // Update input when value prop changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch predictions
  useEffect(() => {
    if (inputValue && inputValue.length > 2 && autocompleteService.current) {
      setIsLoading(true);
      const timer = setTimeout(() => {
        autocompleteService.current.getPlacePredictions(
          { input: inputValue, types },
          (preds: any, status: any) => {
            setIsLoading(false);
            if (status === 'OK' && preds) {
              setPredictions(preds);
              setShowDropdown(true);
            } else {
              setPredictions([]);
              setShowDropdown(false);
            }
          }
        );
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setPredictions([]);
      setShowDropdown(false);
    }
  }, [inputValue, types]);

  const handleSelectPrediction = (prediction: any) => {
    const desc = prediction.description;
    setInputValue(desc);
    setShowDropdown(false);

    // Get place details
    if (placesService.current) {
      placesService.current.getDetails(
        {
          placeId: prediction.place_id,
          fields: ['geometry', 'address_components', 'formatted_address']
        },
        (place: any, status: any) => {
          if (status === 'OK' && place) {
            const placeData: PlaceData = {
              description: desc,
              placeId: prediction.place_id,
              lat: place.geometry?.location?.lat(),
              lng: place.geometry?.location?.lng(),
            };

            // Extract city, state, country
            place.address_components?.forEach((comp: any) => {
              if (comp.types.includes('locality')) placeData.city = comp.long_name;
              if (comp.types.includes('administrative_area_level_1')) placeData.state = comp.short_name;
              if (comp.types.includes('country')) placeData.country = comp.long_name;
            });

            onChange(desc, placeData);
          } else {
            onChange(desc);
          }
        }
      );
    } else {
      onChange(desc);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    if (!val) {
      onChange('');
    }
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
          placeholder={placeholder}
          className={cn('pl-10 pr-8', className)}
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
