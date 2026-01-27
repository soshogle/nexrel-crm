
'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Get Mapbox token from environment variable
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1IjoiZXhhbXBsZSIsImEiOiJjbGV4YW1wbGUifQ.example';

interface DeliveryMapProps {
  pickup: { lat: number; lng: number };
  delivery: { lat: number; lng: number };
  driverLocation: { lat: number; lng: number; heading?: number | null } | null;
  status: string;
}

export default function DeliveryMap({
  pickup,
  delivery,
  driverLocation,
  status,
}: DeliveryMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const pickupMarker = useRef<mapboxgl.Marker | null>(null);
  const deliveryMarker = useRef<mapboxgl.Marker | null>(null);
  const driverMarker = useRef<mapboxgl.Marker | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    try {
      // Initialize map
      mapboxgl.accessToken = MAPBOX_TOKEN;
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [delivery.lng, delivery.lat],
        zoom: 12,
      });

      // Add navigation controls
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      // Wait for map to load
      map.current.on('load', () => {
        if (!map.current) return;

        // Add pickup marker (green)
        const pickupEl = createMarkerElement('🏪', 'bg-green-500');
        pickupMarker.current = new mapboxgl.Marker({ element: pickupEl })
          .setLngLat([pickup.lng, pickup.lat])
          .setPopup(new mapboxgl.Popup().setHTML('<strong>Pickup Location</strong>'))
          .addTo(map.current);

        // Add delivery marker (blue)
        const deliveryEl = createMarkerElement('📍', 'bg-blue-500');
        deliveryMarker.current = new mapboxgl.Marker({ element: deliveryEl })
          .setLngLat([delivery.lng, delivery.lat])
          .setPopup(new mapboxgl.Popup().setHTML('<strong>Delivery Location</strong>'))
          .addTo(map.current);

        // Add driver marker if available (orange)
        if (driverLocation) {
          const driverEl = createMarkerElement('🚗', 'bg-orange-500', driverLocation.heading);
          driverMarker.current = new mapboxgl.Marker({ element: driverEl, rotation: driverLocation.heading || 0 })
            .setLngLat([driverLocation.lng, driverLocation.lat])
            .setPopup(new mapboxgl.Popup().setHTML('<strong>Driver Location</strong>'))
            .addTo(map.current);
        }

        // Draw route line
        if (driverLocation) {
          map.current.addSource('route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: [
                  [pickup.lng, pickup.lat],
                  [driverLocation.lng, driverLocation.lat],
                  [delivery.lng, delivery.lat],
                ],
              },
            },
          });

          map.current.addLayer({
            id: 'route',
            type: 'line',
            source: 'route',
            layout: {
              'line-join': 'round',
              'line-cap': 'round',
            },
            paint: {
              'line-color': '#3b82f6',
              'line-width': 4,
              'line-opacity': 0.6,
            },
          });
        }

        // Fit map to show all markers
        const bounds = new mapboxgl.LngLatBounds();
        bounds.extend([pickup.lng, pickup.lat]);
        bounds.extend([delivery.lng, delivery.lat]);
        if (driverLocation) {
          bounds.extend([driverLocation.lng, driverLocation.lat]);
        }

        map.current.fitBounds(bounds, { padding: 50 });
      });

      map.current.on('error', (e: any) => {
        console.error('Mapbox error:', e);
        setMapError('Map failed to load. Using fallback view.');
      });
    } catch (error) {
      console.error('Failed to initialize map:', error);
      setMapError('Unable to load map. Please check your internet connection.');
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Update driver marker position
  useEffect(() => {
    if (map.current && driverMarker.current && driverLocation) {
      driverMarker.current.setLngLat([driverLocation.lng, driverLocation.lat]);
      if (driverLocation.heading !== null && driverLocation.heading !== undefined) {
        driverMarker.current.setRotation(driverLocation.heading);
      }

      // Update route
      const source = map.current.getSource('route') as mapboxgl.GeoJSONSource;
      if (source) {
        source.setData({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: [
              [pickup.lng, pickup.lat],
              [driverLocation.lng, driverLocation.lat],
              [delivery.lng, delivery.lat],
            ],
          },
        });
      }
    } else if (map.current && !driverMarker.current && driverLocation) {
      // Add driver marker if it doesn't exist yet
      const driverEl = createMarkerElement('🚗', 'bg-orange-500', driverLocation.heading);
      driverMarker.current = new mapboxgl.Marker({ element: driverEl, rotation: driverLocation.heading || 0 })
        .setLngLat([driverLocation.lng, driverLocation.lat])
        .setPopup(new mapboxgl.Popup().setHTML('<strong>Driver Location</strong>'))
        .addTo(map.current);
    }
  }, [driverLocation, pickup, delivery]);

  if (mapError) {
    return (
      <div className="h-[400px] bg-muted rounded-lg flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">{mapError}</p>
          <div className="space-y-2 text-sm">
            <p>📍 Pickup: {pickup.lat.toFixed(4)}, {pickup.lng.toFixed(4)}</p>
            <p>🎯 Delivery: {delivery.lat.toFixed(4)}, {delivery.lng.toFixed(4)}</p>
            {driverLocation && (
              <p>🚗 Driver: {driverLocation.lat.toFixed(4)}, {driverLocation.lng.toFixed(4)}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div ref={mapContainer} className="h-[400px] w-full rounded-lg" />
      <div className="absolute top-4 left-4 bg-white p-3 rounded-lg shadow-lg space-y-2 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span>Pickup</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <span>Delivery</span>
        </div>
        {driverLocation && (
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
            <span>Driver</span>
          </div>
        )}
      </div>
    </div>
  );
}

function createMarkerElement(emoji: string, bgColor: string, rotation?: number | null): HTMLDivElement {
  const el = document.createElement('div');
  el.className = `${bgColor} text-white w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-lg`;
  el.textContent = emoji;
  if (rotation !== null && rotation !== undefined) {
    el.style.transform = `rotate(${rotation}deg)`;
  }
  return el;
}
