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

export function LocationAutocomplete({ value, onChange, onTimezoneDetected }: LocationAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [isOnline, setIsOnline] = useState(value === 'Online/Remote');
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
    
    autocompleteServiceRef.current.getPlacePredictions(
      { input, types: ['(cities)'] },
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
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    if (!val) {
      onChange('', false);
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
    onChange(desc, false);
    setShowDropdown(false);
    setPredictions([]);

    if (placesServiceRef.current && onTimezoneDetected) {
      placesServiceRef.current.getDetails(
        { placeId: prediction.place_id, fields: ['address_components'] },
        (place, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && place) {
            let country = '';
            place.address_components?.forEach((component) => {
              if (component.types.includes('country')) {
                country = component.long_name;
              }
            });
            const timezone = guessTimezoneFromLocation(desc, country);
            onTimezoneDetected(timezone);
          }
        }
      );
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
            placeholder={isOnline ? 'Online/Remote' : (isGoogleLoaded ? 'Search city...' : 'Loading...')}
            disabled={isOnline || !isGoogleLoaded}
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
