/**
 * Patient Photo Gallery
 * Handles intraoral (5 standard views) and extraoral (3 views) photos
 * with date-stamped series and side-by-side comparison.
 * Reuses existing /api/dental/documents endpoint with PHOTO type.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import { useClinic } from '@/lib/dental/clinic-context';
import {
  Camera,
  Upload,
  ChevronLeft,
  ChevronRight,
  Columns2,
  X,
  ZoomIn,
  Calendar,
  Image as ImageIcon,
  Loader2,
  RotateCcw,
} from 'lucide-react';

const INTRAORAL_VIEWS = [
  { id: 'frontal', label: 'Frontal' },
  { id: 'left-buccal', label: 'Left Buccal' },
  { id: 'right-buccal', label: 'Right Buccal' },
  { id: 'upper-occlusal', label: 'Upper Occlusal' },
  { id: 'lower-occlusal', label: 'Lower Occlusal' },
] as const;

const EXTRAORAL_VIEWS = [
  { id: 'face-frontal', label: 'Frontal' },
  { id: 'face-profile', label: 'Profile (Left)' },
  { id: 'face-smile', label: 'Smile' },
] as const;

type PhotoCategory = 'intraoral' | 'extraoral';

interface PhotoRecord {
  id: string;
  url: string;
  viewType: string;
  dateTaken: string;
  seriesDate: string;
  category: PhotoCategory;
  fileName: string;
}

interface PhotoSeries {
  date: string;
  photos: PhotoRecord[];
}

interface PatientPhotoGalleryProps {
  leadId: string;
  compact?: boolean;
}

export function PatientPhotoGallery({ leadId, compact = false }: PatientPhotoGalleryProps) {
  const { data: session } = useSession();
  const { activeClinic } = useClinic();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<PhotoCategory>('intraoral');
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadViewType, setUploadViewType] = useState<string>('');
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoRecord | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareLeft, setCompareLeft] = useState<PhotoRecord | null>(null);
  const [compareRight, setCompareRight] = useState<PhotoRecord | null>(null);
  const [selectedSeriesIdx, setSelectedSeriesIdx] = useState(0);

  const views = tab === 'intraoral' ? INTRAORAL_VIEWS : EXTRAORAL_VIEWS;

  const fetchPhotos = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const clinicParam = activeClinic?.id ? `&clinicId=${activeClinic.id}` : '';
      const url = `/api/dental/documents?leadId=${leadId}&documentType=PHOTO${clinicParam}`;
      console.debug('[PhotoGallery] Fetching:', url);
      const res = await fetch(url);
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        console.error('[PhotoGallery] API error:', res.status, errText);
        setFetchError(`Failed to load photos (${res.status})`);
        return;
      }
      const data = await res.json();
      const docs = Array.isArray(data?.documents) ? data.documents : Array.isArray(data) ? data : [];
      console.debug('[PhotoGallery] Received', docs.length, 'documents');
      const mapped: PhotoRecord[] = docs.map((d: any) => {
        const tags = typeof d.tags === 'string' ? d.tags.split(',').map((t: string) => t.trim()) : Array.isArray(d.tags) ? d.tags : [];
        const viewType = tags.find((t: string) =>
          [...INTRAORAL_VIEWS, ...EXTRAORAL_VIEWS].some(v => v.id === t)
        ) || '';
        const category: PhotoCategory = EXTRAORAL_VIEWS.some(v => v.id === viewType) ? 'extraoral' : 'intraoral';
        const dateTaken = d.createdAt || d.uploadedAt || new Date().toISOString();
        return {
          id: d.id,
          url: d.fileUrl || d.url || `/api/dental/documents/${d.id}/download`,
          viewType,
          dateTaken,
          seriesDate: new Date(dateTaken).toISOString().split('T')[0],
          category,
          fileName: d.fileName || d.originalName || 'photo',
        };
      });
      setPhotos(mapped);
    } catch (err) {
      console.error('[PhotoGallery] Error fetching photos:', err);
      setFetchError('Failed to load photos');
    } finally {
      setLoading(false);
    }
  }, [leadId, activeClinic?.id]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  const filteredPhotos = photos.filter(p => p.category === tab);
  const seriesMap = new Map<string, PhotoRecord[]>();
  filteredPhotos.forEach(p => {
    const list = seriesMap.get(p.seriesDate) || [];
    list.push(p);
    seriesMap.set(p.seriesDate, list);
  });
  const series: PhotoSeries[] = Array.from(seriesMap.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, photos]) => ({ date, photos }));

  const currentSeries = series[selectedSeriesIdx] || null;

  const handleUpload = async (file: File, viewType: string) => {
    if (!session?.user?.id) { toast.error('Please sign in'); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('leadId', leadId);
      formData.append('documentType', 'PHOTO');
      formData.append('category', tab);
      formData.append('tags', viewType);
      formData.append('accessLevel', 'RESTRICTED');
      formData.append('description', `${tab} photo — ${viewType}`);
      if (activeClinic?.id) formData.append('clinicId', activeClinic.id);

      const res = await fetch('/api/dental/documents', { method: 'POST', body: formData });
      if (res.ok) {
        toast.success('Photo uploaded');
        fetchPhotos();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Upload failed');
      }
    } catch (err: any) {
      toast.error('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
      setUploadViewType('');
    }
  };

  const triggerUpload = (viewId: string) => {
    setUploadViewType(viewId);
    fileInputRef.current?.click();
  };

  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadViewType) handleUpload(file, uploadViewType);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startCompare = (photo: PhotoRecord) => {
    if (!compareLeft) {
      setCompareLeft(photo);
      toast.info('Now select the second photo to compare');
    } else if (!compareRight) {
      setCompareRight(photo);
    }
  };

  const resetCompare = () => {
    setCompareMode(false);
    setCompareLeft(null);
    setCompareRight(null);
  };

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            <button
              onClick={() => setTab('intraoral')}
              className={`px-2 py-0.5 text-[10px] rounded-full font-medium transition-colors ${tab === 'intraoral' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
            >
              Intraoral
            </button>
            <button
              onClick={() => setTab('extraoral')}
              className={`px-2 py-0.5 text-[10px] rounded-full font-medium transition-colors ${tab === 'extraoral' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
            >
              Extraoral
            </button>
          </div>
          <Badge variant="outline" className="text-[10px]">{filteredPhotos.length} photos</Badge>
        </div>

        {loading ? (
          <div className="text-center py-4">
            <Loader2 className="w-6 h-6 text-purple-400 animate-spin mx-auto mb-1" />
            <p className="text-[10px] text-gray-400">Loading photos...</p>
          </div>
        ) : fetchError ? (
          <div className="text-center py-4">
            <p className="text-[10px] text-red-500">{fetchError}</p>
            <button onClick={() => fetchPhotos()} className="text-[10px] text-purple-600 underline mt-1">Retry</button>
          </div>
        ) : filteredPhotos.length === 0 ? (
          <div className="text-center py-4">
            <Camera className="w-6 h-6 text-gray-300 mx-auto mb-1" />
            <p className="text-[10px] text-gray-400">No {tab} photos yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {filteredPhotos.slice(0, 6).map(p => (
              <div
                key={p.id}
                className="aspect-square rounded border border-gray-200 overflow-hidden cursor-pointer hover:border-purple-400 transition-colors relative group"
                onClick={() => setSelectedPhoto(p)}
              >
                <img src={p.url} alt={p.viewType} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <ZoomIn className="w-3 h-3 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileSelected} />

      {/* Tabs + Actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => { setTab('intraoral'); setSelectedSeriesIdx(0); }}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${tab === 'intraoral' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            <Camera className="w-3 h-3 inline mr-1" />
            Intraoral ({photos.filter(p => p.category === 'intraoral').length})
          </button>
          <button
            onClick={() => { setTab('extraoral'); setSelectedSeriesIdx(0); }}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${tab === 'extraoral' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            <ImageIcon className="w-3 h-3 inline mr-1" />
            Extraoral ({photos.filter(p => p.category === 'extraoral').length})
          </button>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={compareMode ? 'default' : 'outline'}
            onClick={() => { if (compareMode) resetCompare(); else setCompareMode(true); }}
            className="text-xs h-7"
          >
            <Columns2 className="w-3 h-3 mr-1" />
            {compareMode ? 'Exit Compare' : 'Compare'}
          </Button>
        </div>
      </div>

      {/* Compare Mode */}
      {compareMode && (
        <div className="border-2 border-dashed border-purple-300 rounded-lg p-4 bg-purple-50/50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-purple-700">Side-by-Side Comparison</span>
            <Button size="sm" variant="ghost" onClick={resetCompare} className="h-6 text-xs">
              <RotateCcw className="w-3 h-3 mr-1" /> Reset
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {/* Left slot */}
            <div
              className={`aspect-[4/3] rounded-lg border-2 ${compareLeft ? 'border-blue-400' : 'border-dashed border-gray-300'} overflow-hidden flex items-center justify-center bg-white cursor-pointer`}
              onClick={() => { if (compareLeft) setSelectedPhoto(compareLeft); }}
            >
              {compareLeft ? (
                <div className="relative w-full h-full">
                  <img src={compareLeft.url} alt="" className="w-full h-full object-contain" />
                  <div className="absolute top-1 left-1 bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded">
                    {new Date(compareLeft.dateTaken).toLocaleDateString()}
                  </div>
                  <button
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center"
                    onClick={(e) => { e.stopPropagation(); setCompareLeft(null); }}
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ) : (
                <span className="text-xs text-gray-400">Select first photo</span>
              )}
            </div>
            {/* Right slot */}
            <div
              className={`aspect-[4/3] rounded-lg border-2 ${compareRight ? 'border-green-400' : 'border-dashed border-gray-300'} overflow-hidden flex items-center justify-center bg-white cursor-pointer`}
              onClick={() => { if (compareRight) setSelectedPhoto(compareRight); }}
            >
              {compareRight ? (
                <div className="relative w-full h-full">
                  <img src={compareRight.url} alt="" className="w-full h-full object-contain" />
                  <div className="absolute top-1 left-1 bg-green-600 text-white text-[10px] px-1.5 py-0.5 rounded">
                    {new Date(compareRight.dateTaken).toLocaleDateString()}
                  </div>
                  <button
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center"
                    onClick={(e) => { e.stopPropagation(); setCompareRight(null); }}
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ) : (
                <span className="text-xs text-gray-400">Select second photo</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Series Navigator */}
      {series.length > 0 && (
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-gray-400" />
          <div className="flex gap-1 overflow-x-auto flex-1">
            {series.map((s, i) => (
              <button
                key={s.date}
                onClick={() => setSelectedSeriesIdx(i)}
                className={`px-2 py-1 text-[11px] rounded-md whitespace-nowrap transition-colors ${i === selectedSeriesIdx ? 'bg-purple-100 text-purple-700 font-medium' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
              >
                {new Date(s.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                <span className="ml-1 text-[9px] opacity-70">({s.photos.length})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* View Grid — shows each expected view slot */}
      <div className={`grid gap-3 ${tab === 'intraoral' ? 'grid-cols-5' : 'grid-cols-3'}`}>
        {views.map(view => {
          const photo = currentSeries?.photos.find(p => p.viewType === view.id);
          return (
            <div key={view.id} className="space-y-1">
              <span className="text-[10px] font-medium text-gray-500 block text-center">{view.label}</span>
              <div
                className={`aspect-square rounded-lg border-2 overflow-hidden flex items-center justify-center transition-all ${photo ? 'border-gray-200 hover:border-purple-400 cursor-pointer' : 'border-dashed border-gray-200 bg-gray-50'}`}
                onClick={() => {
                  if (photo) {
                    if (compareMode) startCompare(photo);
                    else setSelectedPhoto(photo);
                  } else {
                    triggerUpload(view.id);
                  }
                }}
              >
                {photo ? (
                  <img src={photo.url} alt={view.label} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-2">
                    <Upload className="w-5 h-5 text-gray-300 mx-auto mb-1" />
                    <span className="text-[9px] text-gray-400">Upload</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Upload button for additional photos in current series */}
      <div className="flex gap-2 flex-wrap">
        {views.map(view => {
          const exists = currentSeries?.photos.find(p => p.viewType === view.id);
          if (exists) return null;
          return (
            <Button
              key={view.id}
              size="sm"
              variant="outline"
              className="text-[11px] h-7"
              disabled={uploading}
              onClick={() => triggerUpload(view.id)}
            >
              {uploading && uploadViewType === view.id ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <Camera className="w-3 h-3 mr-1" />
              )}
              {view.label}
            </Button>
          );
        })}
      </div>

      {loading && (
        <div className="text-center py-8">
          <Loader2 className="w-6 h-6 text-purple-400 animate-spin mx-auto mb-2" />
          <p className="text-xs text-gray-400">Loading photos...</p>
        </div>
      )}

      {!loading && filteredPhotos.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
          <Camera className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500 font-medium">No {tab} photos yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Upload {tab === 'intraoral' ? '5 standard views: frontal, left/right buccal, upper/lower occlusal' : '3 views: frontal, profile, smile'}
          </p>
        </div>
      )}

      {/* Lightbox */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full" onClick={e => e.stopPropagation()}>
            <button
              className="absolute -top-3 -right-3 z-10 bg-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg hover:bg-gray-100"
              onClick={() => setSelectedPhoto(null)}
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={selectedPhoto.url}
              alt={selectedPhoto.viewType}
              className="w-full h-full object-contain rounded-lg"
            />
            <div className="absolute bottom-4 left-4 bg-black/70 text-white text-xs px-3 py-1.5 rounded-lg">
              {views.find(v => v.id === selectedPhoto.viewType)?.label || selectedPhoto.viewType} &middot;{' '}
              {new Date(selectedPhoto.dateTaken).toLocaleDateString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
