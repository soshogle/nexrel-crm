'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Image as ImageIcon, Video, FileText, Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface MediaItem {
  id: string;
  url: string;
  thumbnailUrl?: string;
  filename: string;
  type: string;
  width?: number;
  height?: number;
  alt?: string;
  metadata?: { description?: string };
}

interface MediaPickerProps {
  websiteId: string;
  open: boolean;
  onClose: () => void;
  onSelect: (url: string, alt?: string) => void;
  type?: 'IMAGE' | 'VIDEO' | 'FILE';
}

export function MediaPicker({ websiteId, open, onClose, onSelect, type }: MediaPickerProps) {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null);
  const [editAlt, setEditAlt] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [savingMeta, setSavingMeta] = useState(false);

  useEffect(() => {
    if (open && websiteId) {
      fetchMedia();
    }
  }, [open, websiteId]);

  const fetchMedia = async () => {
    setLoading(true);
    try {
      const params = type ? `?type=${type}` : '';
      const res = await fetch(`/api/websites/${websiteId}/media${params}`);
      if (res.ok) {
        const data = await res.json();
        setMedia(data.media || []);
      }
    } catch (e) {
      toast.error('Failed to load media');
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
      formData.append('alt', file.name.replace(/\.[^/.]+$/, ''));

      const res = await fetch(`/api/websites/${websiteId}/media`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Upload failed');
      }

      const data = await res.json();
      setMedia((prev) => [data.media, ...prev]);
      toast.success('Uploaded successfully');
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const filteredMedia = type ? media.filter((m) => m.type === type) : media;

  const openEditDialog = (m: MediaItem) => {
    setEditingItem(m);
    setEditAlt(m.alt || m.filename.replace(/\.[^/.]+$/, ''));
    setEditDescription((m.metadata as { description?: string })?.description || '');
  };

  const handleConfirmImage = async () => {
    if (!editingItem || !websiteId) return;
    setSavingMeta(true);
    try {
      const altChanged = editAlt !== (editingItem.alt || editingItem.filename.replace(/\.[^/.]+$/, ''));
      const descChanged = editDescription !== ((editingItem.metadata as { description?: string })?.description || '');
      if (altChanged || descChanged) {
        const res = await fetch(`/api/websites/${websiteId}/media/${editingItem.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ alt: editAlt, description: editDescription || null }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        setMedia((prev) =>
          prev.map((x) =>
            x.id === editingItem.id
              ? { ...x, alt: editAlt, metadata: { ...(x.metadata || {}), description: editDescription || undefined } }
              : x
          )
        );
      }
      onSelect(editingItem.url, editAlt || undefined);
      setEditingItem(null);
      onClose();
    } catch (e: any) {
      toast.error(e.message || 'Failed to save');
    } finally {
      setSavingMeta(false);
    }
  };

  return (
    <div className="contents">
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Media Library</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="library">
          <TabsList>
            <TabsTrigger value="library">Library</TabsTrigger>
            <TabsTrigger value="upload">Upload</TabsTrigger>
          </TabsList>
          <TabsContent value="library" className="mt-4 overflow-auto flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : filteredMedia.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No media yet. Upload images, videos, or files.</p>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-3">
                {filteredMedia.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => (m.type === 'IMAGE' ? openEditDialog(m) : (onSelect(m.url, m.alt || undefined), onClose()))}
                    className="aspect-square rounded-lg border overflow-hidden hover:ring-2 ring-primary transition-all"
                  >
                    {m.type === 'IMAGE' ? (
                      <img
                        src={m.thumbnailUrl || m.url}
                        alt={m.alt || m.filename}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        {m.type === 'VIDEO' ? <Video className="h-8 w-8" /> : <FileText className="h-8 w-8" />}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="upload" className="mt-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <input
                type="file"
                accept="image/*,video/*,application/pdf"
                onChange={handleUpload}
                disabled={uploading}
                className="hidden"
                id="media-upload"
              />
              <label htmlFor="media-upload" className="cursor-pointer">
                {uploading ? (
                  <Loader2 className="h-12 w-12 mx-auto animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Click to upload images, videos, or PDFs</p>
                  </>
                )}
              </label>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>

      {/* Image metadata editor (alt, description) for SEO */}
      <Dialog open={!!editingItem} onOpenChange={(v) => !v && setEditingItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Image metadata (SEO)</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <div className="space-y-4">
              <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                <img src={editingItem.thumbnailUrl || editingItem.url} alt={editAlt} className="w-full h-full object-contain" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="img-alt">Alt text</Label>
                <Input
                  id="img-alt"
                  placeholder="Describe the image for accessibility and SEO"
                  value={editAlt}
                  onChange={(e) => setEditAlt(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="img-desc">Description</Label>
                <Textarea
                  id="img-desc"
                  placeholder="Optional longer description for search engines"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItem(null)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmImage} disabled={savingMeta}>
              {savingMeta ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Use image
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
