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

// Global to track Google Maps script loading
let googleMapsPromise: Promise<void> | null = null;

function loadGoogleMapsScript(): Promise<void> {
  if (googleMapsPromise) return googleMapsPromise;
  
  if (typeof window !== 'undefined' && (window as any).google?.maps?.places) {
    return Promise.resolve();
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    // Check if already loaded
    if (typeof window !== 'undefined' && (window as any).google?.maps?.places) {
      resolve();
      return;
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY not set');
      reject(new Error('Google Maps API key not configured'));
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

/**
 * Location Search Component
 * Uses Google Places Autocomplete API directly in browser (client-side)
 * This works with referrer-restricted API keys
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
  const [inputValue, setInputValue] = useState(defaultValue || '');
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const lastControlledValueRef = useRef(controlledValue);

  // Load Google Maps script
  useEffect(() => {
    loadGoogleMapsScript()
      .then(() => {
        setIsGoogleLoaded(true);
        autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
        // PlacesService needs a DOM element or map
        const dummyDiv = document.createElement('div');
        placesServiceRef.current = new google.maps.places.PlacesService(dummyDiv);
      })
      .catch((err) => {
        console.error('Failed to load Google Maps:', err);
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

  const fetchPredictions = useCallback((input: string) => {
    if (!input || input.length < 2 || !autocompleteServiceRef.current) {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }

    setIsLoading(true);
    
    const request: google.maps.places.AutocompletionRequest = {
      input,
      types: ['(cities)'],
    };

    if (countryRestriction && countryRestriction.length > 0) {
      request.componentRestrictions = { country: countryRestriction };
    }

    autocompleteServiceRef.current.getPlacePredictions(
      request,
      (results, status) => {
        setIsLoading(false);
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          setPredictions(results);
          setShowDropdown(true);
        } else {
          setPredictions([]);
          setShowDropdown(false);
        }
      }
    );
  }, [countryRestriction]);

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

    if (!placesServiceRef.current) {
      // Fallback without details
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
      return;
    }

    // Fetch place details
    placesServiceRef.current.getDetails(
      { placeId: prediction.place_id, fields: ['address_components', 'geometry', 'formatted_address'] },
      (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place) {
          let city = '', state = '', country = '', countryCode = '';
          
          place.address_components?.forEach((component) => {
            if (component.types.includes('locality')) {
              city = component.long_name;
            }
            if (component.types.includes('administrative_area_level_1')) {
              state = component.short_name;
            }
            if (component.types.includes('country')) {
              country = component.long_name;
              countryCode = component.short_name;
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
        } else {
          // Fallback
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
        }
      }
    );
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
        placeholder={isGoogleLoaded ? placeholder : 'Loading...'}
        disabled={!isGoogleLoaded}
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
