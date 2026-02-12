'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Video } from 'lucide-react';

// Parse YouTube/Vimeo URLs to embed format
function parseVideoUrl(url: string): { type: string; id: string } | null {
  if (!url) return null;
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (ytMatch) return { type: 'youtube', id: ytMatch[1] };
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) return { type: 'vimeo', id: vimeoMatch[1] };
  return null;
}

interface VideoEmbedEditorProps {
  sectionType: string;
  comp: { props?: Record<string, any> };
  onSave: (props: Record<string, any>) => Promise<void>;
  onClose: () => void;
}

export function VideoEmbedEditor({ sectionType, comp, onSave, onClose }: VideoEmbedEditorProps) {
  const [saving, setSaving] = useState(false);
  const [url, setUrl] = useState(comp.props?.videoUrl || comp.props?.embedUrl || '');
  const [title, setTitle] = useState(comp.props?.title || '');

  const parsed = parseVideoUrl(url);

  const handleSave = async () => {
    setSaving(true);
    try {
      const props: Record<string, any> = { title: title || undefined };
      if (parsed) {
        props.videoType = parsed.type;
        props.videoId = parsed.id;
        props.videoUrl = url;
      } else if (url.startsWith('http')) {
        props.videoUrl = url;
      }
      await onSave(props);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Video className="h-4 w-4" />
          Video embed
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-xs">Video URL (YouTube or Vimeo)</Label>
          <Input
            placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>
        <div>
          <Label className="text-xs">Title (optional)</Label>
          <Input
            placeholder="Video caption"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
          <Button size="sm" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
