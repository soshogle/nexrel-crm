'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ImageIcon } from 'lucide-react';

interface ImageMotionConfigEditorProps {
  sectionType: string;
  comp: { props?: Record<string, any> };
  onSave: (props: Record<string, any>) => Promise<void>;
  onClose: () => void;
}

export function ImageMotionConfigEditor({ sectionType, comp, onSave, onClose }: ImageMotionConfigEditorProps) {
  const [saving, setSaving] = useState(false);
  const [motionDisabled, setMotionDisabled] = useState(!!comp.props?.motionDisabled);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ motionDisabled: motionDisabled || undefined });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <ImageIcon className="h-4 w-4" />
          Image options
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm">Disable motion effect</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Turn off the Ken Burns zoom/pan effect for this image
            </p>
          </div>
          <Switch
            checked={motionDisabled}
            onCheckedChange={setMotionDisabled}
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
