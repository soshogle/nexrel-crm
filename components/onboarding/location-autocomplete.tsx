
'use client';

import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, X } from 'lucide-react';
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
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteService = useRef<any>(null);
  const placesService = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).google) {
      autocompleteService.current = new (window as any).google.maps.places.AutocompleteService();
      placesService.current = new (window as any).google.maps.places.PlacesService(
        document.createElement('div')
      );
    }
  }, []);

  useEffect(() => {
    if (!isOnline && inputValue && inputValue.length > 2 && autocompleteService.current) {
      const timer = setTimeout(() => {
        autocompleteService.current.getPlacePredictions(
          {
            input: inputValue,
            types: ['(cities)']
          },
          (predictions: any, status: any) => {
            if (status === 'OK' && predictions) {
              setPredictions(predictions);
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
  }, [inputValue, isOnline]);

  const handleSelectPrediction = (prediction: any) => {
    setInputValue(prediction.description);
    onChange(prediction.description, false);
    setShowDropdown(false);

    // Get place details to extract timezone
    if (placesService.current) {
      placesService.current.getDetails(
        {
          placeId: prediction.place_id,
          fields: ['geometry', 'utc_offset_minutes']
        },
        (place: any, status: any) => {
          if (status === 'OK' && place) {
            // Calculate timezone from UTC offset
            const offset = place.utc_offset_minutes / 60;
            const timezone = guessTimezoneFromOffset(offset, prediction.description);
            if (onTimezoneDetected) {
              onTimezoneDetected(timezone);
            }
          }
        }
      );
    }
  };

  const guessTimezoneFromOffset = (offset: number, location: string): string => {
    // Simple timezone guessing based on location string and offset
    const lowerLocation = location.toLowerCase();
    
    if (lowerLocation.includes('new york') || lowerLocation.includes('eastern')) return 'America/New_York';
    if (lowerLocation.includes('chicago') || lowerLocation.includes('central')) return 'America/Chicago';
    if (lowerLocation.includes('denver') || lowerLocation.includes('mountain')) return 'America/Denver';
    if (lowerLocation.includes('los angeles') || lowerLocation.includes('pacific')) return 'America/Los_Angeles';
    if (lowerLocation.includes('london')) return 'Europe/London';
    if (lowerLocation.includes('paris')) return 'Europe/Paris';
    if (lowerLocation.includes('berlin')) return 'Europe/Berlin';
    if (lowerLocation.includes('tokyo')) return 'Asia/Tokyo';
    if (lowerLocation.includes('sydney')) return 'Australia/Sydney';
    if (lowerLocation.includes('india') || lowerLocation.includes('mumbai') || lowerLocation.includes('delhi')) return 'Asia/Kolkata';
    
    return 'America/New_York'; // Default fallback
  };

  const handleOnlineToggle = () => {
    if (!isOnline) {
      setInputValue('Online/Remote');
      onChange('Online/Remote', true);
      setIsOnline(true);
      setPredictions([]);
    } else {
      setInputValue('');
      onChange('', false);
      setIsOnline(false);
    }
  };

  return (
    <div className="space-y-2" suppressHydrationWarning>
      <Label htmlFor="location">Business Location *</Label>
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              id="location"
              type="text"
              placeholder={isOnline ? "Online/Remote" : "Enter city or address..."}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                if (isOnline) setIsOnline(false);
              }}
              disabled={isOnline}
              className="pl-10"
              required
            />
            {inputValue && !isOnline && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1 h-7 w-7 p-0"
                onClick={() => {
                  setInputValue('');
                  onChange('', false);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <Button
            type="button"
            variant={isOnline ? "default" : "outline"}
            onClick={handleOnlineToggle}
            className="whitespace-nowrap"
          >
            {isOnline ? "Online ✓" : "Set Online"}
          </Button>
        </div>

        {showDropdown && predictions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-auto">
            {predictions.map((prediction) => (
              <button
                key={prediction.place_id}
                type="button"
                className="w-full px-4 py-2 text-left hover:bg-accent hover:text-accent-foreground flex items-start gap-2"
                onClick={() => handleSelectPrediction(prediction)}
              >
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                <div className="flex-1">
                  <div className="font-medium text-sm">{prediction.structured_formatting.main_text}</div>
                  <div className="text-xs text-muted-foreground">{prediction.structured_formatting.secondary_text}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      {isOnline && (
        <p className="text-sm text-muted-foreground">
          Your business operates online/remotely
        </p>
      )}
    </div>
  );
}
