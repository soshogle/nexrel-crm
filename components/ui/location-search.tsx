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

/**
 * Location Search Component
 * Uses the Google Maps JavaScript SDK client-side for autocomplete,
 * so the referer-restricted API key works correctly from the browser.
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
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mapsReady, setMapsReady] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastControlledValueRef = useRef(controlledValue);
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
        /* key missing or load failed – input stays as plain text */
      });
  }, []);

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

  const countryRestrictionKey = countryRestriction?.join(',') ?? '';

  const fetchPredictions = useCallback(
    (input: string) => {
      if (!input || input.length < 2 || !autocompleteRef.current) {
        setPredictions([]);
        setShowDropdown(false);
        return;
      }

      setIsLoading(true);

      const request: google.maps.places.AutocompletionRequest = {
        input,
        types: ['(cities)'],
        sessionToken: sessionTokenRef.current ?? undefined,
      };
      if (countryRestriction && countryRestriction.length > 0) {
        request.componentRestrictions = { country: countryRestriction };
      }

      autocompleteRef.current.getPlacePredictions(request, (results, status) => {
        setIsLoading(false);
        if (
          status === google.maps.places.PlacesServiceStatus.OK &&
          results &&
          results.length > 0
        ) {
          setPredictions(results);
          setShowDropdown(true);
        } else {
          setPredictions([]);
          setShowDropdown(false);
        }
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [countryRestrictionKey, mapsReady],
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

  const handleSelectPrediction = (prediction: google.maps.places.AutocompletePrediction) => {
    const desc = prediction.description;
    setInputValue(desc);
    setShowDropdown(false);
    setPredictions([]);

    if (placesRef.current) {
      placesRef.current.getDetails(
        {
          placeId: prediction.place_id,
          fields: ['place_id', 'formatted_address', 'address_components', 'geometry'],
          sessionToken: sessionTokenRef.current ?? undefined,
        },
        (place, status) => {
          // Refresh session token after a details call (per Google billing best practice)
          sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();

          if (status === google.maps.places.PlacesServiceStatus.OK && place) {
            let city = '';
            let state = '';
            let country = '';
            let countryCode = '';

            place.address_components?.forEach((comp) => {
              if (comp.types.includes('locality')) city = comp.long_name;
              if (comp.types.includes('administrative_area_level_1')) state = comp.short_name;
              if (comp.types.includes('country')) {
                country = comp.long_name;
                countryCode = comp.short_name;
              }
            });

            const locationData: LocationData = {
              city,
              state,
              country,
              countryCode,
              formatted: place.formatted_address || desc,
              lat: place.geometry?.location?.lat(),
              lng: place.geometry?.location?.lng(),
              placeId: prediction.place_id,
            };
            if (onChange) onChange(locationData);
            if (onSelect) onSelect(locationData);
            return;
          }

          emitFallback(desc, prediction.place_id);
        },
      );
    } else {
      emitFallback(desc, prediction.place_id);
    }
  };

  const emitFallback = (desc: string, placeId: string) => {
    const parts = desc.split(',').map((p) => p.trim());
    const locationData: LocationData = {
      city: parts[0] || '',
      state: parts[1] || '',
      country: parts[2] || '',
      countryCode: '',
      formatted: desc,
      placeId,
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
