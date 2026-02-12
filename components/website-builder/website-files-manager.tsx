'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, Upload, Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface MediaItem {
  id: string;
  url: string;
  filename: string;
  type: string;
  size?: number;
  mimeType?: string;
}

interface WebsiteFilesManagerProps {
  websiteId: string;
  onSelect?: (url: string, filename: string) => void;
}

export function WebsiteFilesManager({ websiteId, onSelect }: WebsiteFilesManagerProps) {
  const [files, setFiles] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (websiteId) fetchFiles();
  }, [websiteId]);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/websites/${websiteId}/media?type=FILE`);
      if (res.ok) {
        const data = await res.json();
        setFiles(data.media || []);
      }
    } catch (e) {
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !websiteId) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`/api/websites/${websiteId}/media`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Upload failed');
      }

      const data = await res.json();
      setFiles((prev) => [data.media, ...prev]);
      toast.success('File uploaded');
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm">Files & Downloads</CardTitle>
        <p className="text-xs text-muted-foreground">
          PDFs and brochures for download links on your site
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border-2 border-dashed rounded-lg p-4 text-center">
          <input
            type="file"
            accept="application/pdf,.doc,.docx,.xls,.xlsx"
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
            id="file-upload"
          />
          <label htmlFor="file-upload" className="cursor-pointer">
            {uploading ? (
              <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
            ) : (
              <>
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Upload PDF or document</p>
              </>
            )}
          </label>
        </div>

        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : files.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No files yet</p>
        ) : (
          <div className="space-y-2">
            {files.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between p-2 rounded border"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm truncate">{f.filename}</span>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => window.open(f.url, '_blank')}
                    className="h-8 w-8 p-0"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  {onSelect && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onSelect(f.url, f.filename)}
                    >
                      Use
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
