'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Maximize2 } from 'lucide-react';

interface PopupChatConfigEditorProps {
  sectionType: 'PopupSection' | 'ChatWidget';
  comp: { props?: Record<string, any> };
  onSave: (props: Record<string, any>) => Promise<void>;
  onClose: () => void;
}

export function PopupChatConfigEditor({
  sectionType,
  comp,
  onSave,
  onClose,
}: PopupChatConfigEditorProps) {
  const [saving, setSaving] = useState(false);
  const isPopup = sectionType === 'PopupSection';

  const [title, setTitle] = useState(comp.props?.title || (isPopup ? 'Special Offer' : 'Chat with us'));
  const [content, setContent] = useState(comp.props?.content || (isPopup ? 'Sign up now!' : ''));
  const [trigger, setTrigger] = useState(comp.props?.trigger || 'onLoad');
  const [delaySeconds, setDelaySeconds] = useState(comp.props?.delaySeconds ?? 3);
  const [showForm, setShowForm] = useState(comp.props?.showForm ?? true);
  const [position, setPosition] = useState(comp.props?.position || 'bottomRight');

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isPopup) {
        await onSave({ title, content, trigger, delaySeconds, showForm });
      } else {
        await onSave({ title, position });
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center gap-2">
          {isPopup ? <Maximize2 className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
          Configure {sectionType}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-xs">Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        {isPopup && (
          <>
            <div>
              <Label className="text-xs">Content</Label>
              <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={3} />
            </div>
            <div>
              <Label className="text-xs">Trigger</Label>
              <Select value={trigger} onValueChange={setTrigger}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="onLoad">On page load</SelectItem>
                  <SelectItem value="delay">After delay</SelectItem>
                  <SelectItem value="exitIntent">Exit intent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {trigger === 'delay' && (
              <div>
                <Label className="text-xs">Delay (seconds)</Label>
                <Input
                  type="number"
                  value={delaySeconds}
                  onChange={(e) => setDelaySeconds(parseInt(e.target.value, 10) || 8)}
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              <Switch checked={showForm} onCheckedChange={setShowForm} />
              <Label className="text-xs">Show lead capture form</Label>
            </div>
          </>
        )}

        {!isPopup && (
          <div>
            <Label className="text-xs">Position</Label>
            <Select value={position} onValueChange={setPosition}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bottomRight">Bottom right</SelectItem>
                <SelectItem value="bottomLeft">Bottom left</SelectItem>
                <SelectItem value="topRight">Top right</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

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
