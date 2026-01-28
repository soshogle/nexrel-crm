'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TrendingUp, FileText, MapPin, Calculator } from 'lucide-react';

export default function CMAToolsPage() {
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  
  // Google Places autocomplete state
  const [addressPredictions, setAddressPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [showAddressPredictions, setShowAddressPredictions] = useState(false);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);

  // Load Google Maps script
  useEffect(() => {
    const loadGoogleMaps = () => {
      if (typeof window !== 'undefined' && window.google?.maps?.places) {
        setIsGoogleMapsLoaded(true);
        autocompleteService.current = new google.maps.places.AutocompleteService();
        const mapDiv = document.createElement('div');
        placesService.current = new google.maps.places.PlacesService(mapDiv);
        return;
      }

      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        existingScript.addEventListener('load', () => {
          setIsGoogleMapsLoaded(true);
          autocompleteService.current = new google.maps.places.AutocompleteService();
          const mapDiv = document.createElement('div');
          placesService.current = new google.maps.places.PlacesService(mapDiv);
        });
        return;
      }

      const apiKey = 'AIzaSyDBBXN9otEolVDPCQKYCJq8KwM-zH6HgVI';
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        setIsGoogleMapsLoaded(true);
        autocompleteService.current = new google.maps.places.AutocompleteService();
        const mapDiv = document.createElement('div');
        placesService.current = new google.maps.places.PlacesService(mapDiv);
      };
      document.head.appendChild(script);
    };

    loadGoogleMaps();
  }, []);

  // Handle address input change
  const handleAddressChange = useCallback((value: string) => {
    setAddress(value);
    
    if (!value || value.length < 3 || !autocompleteService.current || !isGoogleMapsLoaded) {
      setAddressPredictions([]);
      setShowAddressPredictions(false);
      return;
    }

    autocompleteService.current.getPlacePredictions(
      { input: value, types: ['address'] },
      (predictions, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
          setAddressPredictions(predictions);
          setShowAddressPredictions(true);
        } else {
          setAddressPredictions([]);
          setShowAddressPredictions(false);
        }
      }
    );
  }, [isGoogleMapsLoaded]);

  // Handle prediction selection
  const handleSelectPrediction = useCallback((prediction: google.maps.places.AutocompletePrediction) => {
    if (!placesService.current) return;

    placesService.current.getDetails(
      { placeId: prediction.place_id, fields: ['address_components', 'formatted_address'] },
      (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place) {
          let streetNumber = '';
          let route = '';
          let newCity = '';
          let newState = '';
          let newZip = '';

          place.address_components?.forEach((component) => {
            if (component.types.includes('street_number')) streetNumber = component.long_name;
            if (component.types.includes('route')) route = component.long_name;
            if (component.types.includes('locality')) newCity = component.long_name;
            if (component.types.includes('administrative_area_level_1')) newState = component.short_name;
            if (component.types.includes('postal_code')) newZip = component.long_name;
          });

          setAddress(`${streetNumber} ${route}`.trim());
          setCity(newCity);
          setState(newState);
          setZip(newZip);
        }
        setShowAddressPredictions(false);
        setAddressPredictions([]);
      }
    );
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-green-500 rounded-xl">
          <TrendingUp className="h-8 w-8 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">CMA Tools</h1>
          <p className="text-muted-foreground">Generate Comparative Market Analysis reports</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Create New CMA
            </CardTitle>
            <CardDescription>Enter property details to generate a market analysis</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 relative">
              <Label htmlFor="address">Property Address</Label>
              <Input 
                id="address" 
                placeholder="Start typing an address..." 
                value={address}
                onChange={(e) => handleAddressChange(e.target.value)}
                onFocus={() => addressPredictions.length > 0 && setShowAddressPredictions(true)}
                onBlur={() => setTimeout(() => setShowAddressPredictions(false), 200)}
                autoComplete="off"
              />
              {showAddressPredictions && addressPredictions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded-md shadow-lg max-h-60 overflow-auto">
                  {addressPredictions.map((prediction) => (
                    <button
                      key={prediction.place_id}
                      type="button"
                      className="w-full px-4 py-2 text-left text-sm text-white hover:bg-slate-700 flex items-center gap-2"
                      onMouseDown={() => handleSelectPrediction(prediction)}
                    >
                      <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span>{prediction.description}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input id="state" placeholder="State" value={state} onChange={(e) => setState(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip">ZIP</Label>
                <Input id="zip" placeholder="ZIP" value={zip} onChange={(e) => setZip(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="beds">Bedrooms</Label>
                <Input id="beds" type="number" placeholder="3" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="baths">Bathrooms</Label>
                <Input id="baths" type="number" placeholder="2" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sqft">Square Feet</Label>
                <Input id="sqft" type="number" placeholder="1500" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="year">Year Built</Label>
                <Input id="year" type="number" placeholder="2000" />
              </div>
            </div>
            <Button className="w-full gap-2">
              <FileText className="h-4 w-4" />
              Generate CMA Report
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent CMA Reports</CardTitle>
            <CardDescription>Your generated market analyses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 bg-muted rounded-full mb-4">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No CMA Reports Yet</h3>
              <p className="text-muted-foreground max-w-md">
                Create your first Comparative Market Analysis to help clients understand property values.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
