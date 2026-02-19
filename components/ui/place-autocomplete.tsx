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
  types?: string; // e.g., 'geocode', 'address', '(cities)', '(regions)'
  disabled?: boolean;
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

// Global to track Google Maps script loading
let googleMapsPromise: Promise<void> | null = null;

function loadGoogleMapsScript(): Promise<void> {
  if (googleMapsPromise) return googleMapsPromise;
  
  if (typeof window !== 'undefined' && (window as any).google?.maps?.places) {
    return Promise.resolve();
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && (window as any).google?.maps?.places) {
      resolve();
      return;
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY not set. Add it to .env for address autocomplete.');
      reject(new Error('Google Maps API key not configured. Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to .env'));
      return;
    }

    // Check if script is already in DOM (loading or loaded)
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      if ((window as any).google?.maps?.places) {
        resolve();
        return;
      }
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Google Maps')));
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Maps'));
    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

export function PlaceAutocomplete({
  value,
  onChange,
  placeholder = 'Search location...',
  className,
  types = 'geocode',
  disabled = false,
}: PlaceAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);

  // Load Google Maps script
  useEffect(() => {
    loadGoogleMapsScript()
      .then(() => {
        setIsGoogleLoaded(true);
        autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
        const dummyDiv = document.createElement('div');
        placesServiceRef.current = new google.maps.places.PlacesService(dummyDiv);
      })
      .catch((err) => {
        console.error('Failed to load Google Maps:', err);
      });
  }, []);

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

  const fetchPredictions = useCallback((input: string) => {
    if (!input || input.length < 2 || !autocompleteServiceRef.current) {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }

    setIsLoading(true);
    
    const request: google.maps.places.AutocompletionRequest = {
      input,
      types: types ? [types] : undefined,
    };

    autocompleteServiceRef.current.getPlacePredictions(
      request,
      (results, status) => {
        setIsLoading(false);
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          setPredictions(results);
          setShowDropdown(true);
        } else {
          if (status !== google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
            console.warn('[PlaceAutocomplete] Places API status:', status);
          }
          setPredictions([]);
          setShowDropdown(false);
        }
      }
    );
  }, [types]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    if (!val) {
      onChange('');
      setPredictions([]);
      setShowDropdown(false);
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      fetchPredictions(val);
    }, 300);
  };

  const handleSelectPrediction = (prediction: google.maps.places.AutocompletePrediction) => {
    const desc = prediction.description;
    setInputValue(desc);
    setShowDropdown(false);
    setPredictions([]);

    if (!placesServiceRef.current) {
      onChange(desc, { description: desc, placeId: prediction.place_id });
      return;
    }

    placesServiceRef.current.getDetails(
      { placeId: prediction.place_id, fields: ['address_components', 'geometry', 'formatted_address'] },
      (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place) {
          let city = '', state = '', country = '';
          
          place.address_components?.forEach((component) => {
            if (component.types.includes('locality')) {
              city = component.long_name;
            }
            if (component.types.includes('administrative_area_level_1')) {
              state = component.short_name;
            }
            if (component.types.includes('country')) {
              country = component.long_name;
            }
          });

          onChange(desc, {
            description: place.formatted_address || desc,
            placeId: prediction.place_id,
            city,
            state,
            country,
            lat: place.geometry?.location?.lat(),
            lng: place.geometry?.location?.lng(),
          });
        } else {
          onChange(desc, { description: desc, placeId: prediction.place_id });
        }
      }
    );
  };

  const handleBlur = () => {
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
          placeholder={isGoogleLoaded ? placeholder : 'Loading...'}
          disabled={disabled || !isGoogleLoaded}
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
