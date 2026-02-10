/**
 * Video Upload Component for Website Builder
 * Supports YouTube, Vimeo, and direct upload
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Youtube, Video, Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export interface VideoUploadResult {
  type: 'youtube' | 'vimeo' | 'direct';
  url: string;
  embedId?: string;
  embedUrl?: string;
  thumbnailUrl?: string;
  title?: string;
}

interface VideoUploadProps {
  onVideoAdded: (video: VideoUploadResult) => void;
  onCancel?: () => void;
  maxFileSize?: number; // in MB, default 50MB
}

export function VideoUpload({ 
  onVideoAdded, 
  onCancel,
  maxFileSize = 50 
}: VideoUploadProps) {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [vimeoUrl, setVimeoUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<VideoUploadResult | null>(null);

  /**
   * Extract YouTube video ID from URL
   */
  const extractYouTubeId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/,
      /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  };

  /**
   * Extract Vimeo video ID from URL
   */
  const extractVimeoId = (url: string): string | null => {
    const patterns = [
      /vimeo\.com\/(\d+)/,
      /vimeo\.com\/video\/(\d+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  };

  /**
   * Handle YouTube URL
   */
  const handleYouTubeSubmit = () => {
    setError(null);
    const videoId = extractYouTubeId(youtubeUrl);
    
    if (!videoId) {
      setError('Invalid YouTube URL. Please paste a valid YouTube video URL.');
      return;
    }

    const video: VideoUploadResult = {
      type: 'youtube',
      url: `https://www.youtube.com/watch?v=${videoId}`,
      embedId: videoId,
      embedUrl: `https://www.youtube.com/embed/${videoId}`,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
    };

    setPreview(video);
  };

  /**
   * Handle Vimeo URL
   */
  const handleVimeoSubmit = () => {
    setError(null);
    const videoId = extractVimeoId(vimeoUrl);
    
    if (!videoId) {
      setError('Invalid Vimeo URL. Please paste a valid Vimeo video URL.');
      return;
    }

    const video: VideoUploadResult = {
      type: 'vimeo',
      url: `https://vimeo.com/${videoId}`,
      embedId: videoId,
      embedUrl: `https://player.vimeo.com/video/${videoId}`,
    };

    setPreview(video);
  };

  /**
   * Handle file selection
   */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
    if (!validTypes.includes(file.type)) {
      setError('Invalid file type. Please upload MP4, WebM, OGG, or MOV files.');
      return;
    }

    // Validate file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxFileSize) {
      setError(`File size exceeds ${maxFileSize}MB limit. Please upload a smaller video.`);
      return;
    }

    setSelectedFile(file);
    setError(null);
  };

  /**
   * Handle direct upload
   */
  const handleDirectUpload = async () => {
    if (!selectedFile) {
      setError('Please select a video file.');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // TODO: Upload to Vercel Blob or your storage service
      // For now, create a placeholder
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('type', 'video');

      // This would call your upload API
      // const response = await fetch('/api/website-builder/upload-video', {
      //   method: 'POST',
      //   body: formData,
      // });

      // For now, show error that direct upload needs implementation
      setError('Direct video upload is not yet implemented. Please use YouTube or Vimeo for now.');
      setUploading(false);
      return;

      // When implemented:
      // const result = await response.json();
      // const video: VideoUploadResult = {
      //   type: 'direct',
      //   url: result.url,
      //   thumbnailUrl: result.thumbnailUrl,
      // };
      // onVideoAdded(video);
    } catch (err: any) {
      setError(err.message || 'Failed to upload video.');
      setUploading(false);
    }
  };

  /**
   * Confirm and add video
   */
  const handleConfirm = () => {
    if (preview) {
      onVideoAdded(preview);
      setPreview(null);
      setYoutubeUrl('');
      setVimeoUrl('');
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Add Video to Website</CardTitle>
        <CardDescription>
          Upload a video from YouTube, Vimeo, or upload directly
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="youtube" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="youtube">
              <Youtube className="h-4 w-4 mr-2" />
              YouTube
            </TabsTrigger>
            <TabsTrigger value="vimeo">
              <Video className="h-4 w-4 mr-2" />
              Vimeo
            </TabsTrigger>
            <TabsTrigger value="upload">
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </TabsTrigger>
          </TabsList>

          {/* YouTube Tab */}
          <TabsContent value="youtube" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="youtube-url">YouTube Video URL</Label>
              <Input
                id="youtube-url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Paste a YouTube video URL or embed link
              </p>
            </div>

            {preview && preview.type === 'youtube' && (
              <div className="space-y-4">
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    Video preview ready. Click "Add Video" to confirm.
                  </AlertDescription>
                </Alert>
                <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                  <iframe
                    src={preview.embedUrl}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button onClick={handleYouTubeSubmit} disabled={!youtubeUrl}>
                Preview Video
              </Button>
              {preview && preview.type === 'youtube' && (
                <Button onClick={handleConfirm}>Add Video</Button>
              )}
            </div>

            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>💡 Recommended:</strong> YouTube hosting is free, includes automatic optimization, 
                and unlimited bandwidth. Perfect for most websites!
              </p>
            </div>
          </TabsContent>

          {/* Vimeo Tab */}
          <TabsContent value="vimeo" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vimeo-url">Vimeo Video URL</Label>
              <Input
                id="vimeo-url"
                placeholder="https://vimeo.com/..."
                value={vimeoUrl}
                onChange={(e) => setVimeoUrl(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Paste a Vimeo video URL
              </p>
            </div>

            {preview && preview.type === 'vimeo' && (
              <div className="space-y-4">
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    Video preview ready. Click "Add Video" to confirm.
                  </AlertDescription>
                </Alert>
                <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                  <iframe
                    src={preview.embedUrl}
                    className="w-full h-full"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button onClick={handleVimeoSubmit} disabled={!vimeoUrl}>
                Preview Video
              </Button>
              {preview && preview.type === 'vimeo' && (
                <Button onClick={handleConfirm}>Add Video</Button>
              )}
            </div>
          </TabsContent>

          {/* Direct Upload Tab */}
          <TabsContent value="upload" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="video-file">Upload Video File</Label>
              <Input
                id="video-file"
                type="file"
                accept="video/mp4,video/webm,video/ogg,video/quicktime"
                onChange={handleFileSelect}
              />
              <p className="text-sm text-muted-foreground">
                Maximum file size: {maxFileSize}MB. Supported formats: MP4, WebM, OGG, MOV
              </p>
            </div>

            {selectedFile && (
              <div className="space-y-2">
                <p className="text-sm">
                  Selected: <strong>{selectedFile.name}</strong>
                </p>
                <p className="text-sm text-muted-foreground">
                  Size: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={handleDirectUpload} 
                disabled={!selectedFile || uploading}
              >
                {uploading ? 'Uploading...' : 'Upload Video'}
              </Button>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg">
              <p className="text-sm text-yellow-900 dark:text-yellow-100">
                <strong>⚠️ Note:</strong> Direct upload stores videos in cloud storage and may incur costs. 
                YouTube/Vimeo hosting is recommended for free, unlimited video hosting.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {onCancel && (
          <div className="mt-4 flex justify-end">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
