'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Input } from '@/components/ui/input';
import { MapPin, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlaceAutocompleteProps {
  value: string;
  onChange: (value: string, placeData?: PlaceData) => void;
  placeholder?: string;
  className?: string;
  types?: string;
  disabled?: boolean;
}

export interface PlaceData {
  description: string;
  placeId: string;
  city?: string;
  state?: string;
  country?: string;
  zip?: string;
  lat?: number;
  lng?: number;
}

const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

let googleMapsPromise: Promise<void> | null = null;

function loadGoogleMaps(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.google?.maps?.places) return Promise.resolve();
  if (googleMapsPromise) return googleMapsPromise;

  googleMapsPromise = new Promise<void>((resolve, reject) => {
    if (!MAPS_API_KEY) {
      reject(new Error('Google Maps API key not configured'));
      return;
    }
    const existing = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      if (window.google?.maps?.places) resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      googleMapsPromise = null;
      reject(new Error('Failed to load Google Maps'));
    };
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
  const [mapsReady, setMapsReady] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const autocompleteRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesRef = useRef<google.maps.places.PlacesService | null>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  useEffect(() => {
    loadGoogleMaps()
      .then(() => {
        autocompleteRef.current = new google.maps.places.AutocompleteService();
        const dummyDiv = document.createElement('div');
        placesRef.current = new google.maps.places.PlacesService(dummyDiv);
        sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
        setMapsReady(true);
      })
      .catch(() => {
        setMapsReady(true);
      });
  }, []);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    if (showDropdown && predictions.length > 0 && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom,
        left: rect.left,
        width: rect.width,
      });
    } else {
      setDropdownPosition(null);
    }
  }, [showDropdown, predictions.length]);

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
    if (!input || input.length < 2) {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }

    if (!autocompleteRef.current) {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }

    setIsLoading(true);
    const request: google.maps.places.AutocompletionRequest = {
      input,
      types: types ? [types] : undefined,
      sessionToken: sessionTokenRef.current ?? undefined,
    };

    autocompleteRef.current.getPlacePredictions(request, (results, status) => {
      setIsLoading(false);
      if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
        setPredictions(results);
        setShowDropdown(true);
      } else {
        setPredictions([]);
        setShowDropdown(false);
      }
    });
  }, [types, mapsReady]);

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
    const placeId = prediction.place_id;
    setInputValue(desc);
    setShowDropdown(false);
    setPredictions([]);

    if (!placesRef.current) {
      onChange(desc, { description: desc, placeId });
      return;
    }

    placesRef.current.getDetails(
      {
        placeId,
        fields: ['address_components', 'geometry', 'formatted_address'],
        sessionToken: sessionTokenRef.current ?? undefined,
      },
      (place, status) => {
        sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();

        if (status === google.maps.places.PlacesServiceStatus.OK && place) {
          let city = '', state = '', country = '', zip = '';

          place.address_components?.forEach((component) => {
            if (component.types.includes('locality')) city = component.long_name;
            if (component.types.includes('administrative_area_level_1')) state = component.short_name;
            if (component.types.includes('country')) country = component.long_name;
            if (component.types.includes('postal_code')) zip = component.long_name;
          });

          onChange(desc, {
            description: place.formatted_address || desc,
            placeId,
            city,
            state,
            country,
            zip: zip || undefined,
            lat: place.geometry?.location?.lat(),
            lng: place.geometry?.location?.lng(),
          });
        } else {
          onChange(desc, { description: desc, placeId });
        }
      },
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
          placeholder={placeholder}
          disabled={disabled}
          className={cn('pl-10 pr-8', className)}
          autoComplete="off"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
        )}
      </div>

      {showDropdown && predictions.length > 0 && dropdownPosition && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[100] mt-1 bg-background border rounded-lg shadow-lg max-h-60 overflow-y-auto"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
          }}
        >
          {predictions.map((prediction, idx) => (
            <button
              key={prediction.place_id || idx}
              type="button"
              onClick={() => handleSelectPrediction(prediction)}
              className="w-full px-4 py-3 text-left hover:bg-muted flex items-center gap-3 transition-colors"
            >
              <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm truncate">
                {prediction.description}
              </span>
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
