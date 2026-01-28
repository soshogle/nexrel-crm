'use client';

import { useEffect } from 'react';
import Script from 'next/script';

export function GoogleMapsLoader() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // If no API key, don't load the script
  if (!apiKey) {
    return null;
  }

  return (
    <Script
      src={`https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`}
      strategy="lazyOnload"
    />
  );
}
