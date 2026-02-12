'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ImagePlus, ExternalLink, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface DentalXRay {
  id: string;
  xrayType: string;
  dateTaken: string;
  thumbnailUrl?: string | null;
  previewUrl?: string | null;
}

interface LeadImagingSectionProps {
  leadId: string;
}

export function LeadImagingSection({ leadId }: LeadImagingSectionProps) {
  const [xrays, setXrays] = useState<DentalXRay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/dental/xrays?leadId=${leadId}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setXrays(Array.isArray(data) ? data : []))
      .catch(() => setXrays([]))
      .finally(() => setLoading(false));
  }, [leadId]);

  if (loading) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <ImagePlus className="h-5 w-5 mr-2" />
            Imaging
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (xrays.length === 0) return null;

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center">
          <ImagePlus className="h-5 w-5 mr-2" />
          Recent X-Rays
          <span className="ml-2 text-sm font-normal text-gray-400">({xrays.length})</span>
        </CardTitle>
        <CardDescription className="text-gray-400">
          DICOM imaging linked to this patient
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {xrays.slice(0, 6).map((xray) => (
            <div
              key={xray.id}
              className="relative aspect-square rounded-lg overflow-hidden bg-gray-800 border border-gray-700 group"
            >
              {xray.thumbnailUrl || xray.previewUrl ? (
                <img
                  src={xray.thumbnailUrl || xray.previewUrl || ''}
                  alt={xray.xrayType}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500">
                  <ImagePlus className="h-8 w-8" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button variant="secondary" size="sm" asChild>
                  <Link href={`/dashboard/dental/clinical?leadId=${leadId}`}>
                    <ExternalLink className="h-4 w-4 mr-1" />
                    View
                  </Link>
                </Button>
              </div>
              <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-black/70 text-xs text-gray-300">
                {xray.xrayType} • {new Date(xray.dateTaken).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
        {xrays.length > 6 && (
          <Button variant="outline" size="sm" className="mt-3 w-full" asChild>
            <Link href={`/dashboard/dental/clinical?leadId=${leadId}`}>
              View all {xrays.length} images
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
