
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface TagsManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: any | null;
  selectedContactIds: string[];
  onSuccess: () => void;
}

export default function TagsManagerDialog({
  open,
  onOpenChange,
  contact,
  selectedContactIds,
  onSuccess,
}: TagsManagerDialogProps) {
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (contact && open) {
      // Single contact mode
      setTags(Array.isArray(contact.tags) ? contact.tags : []);
    } else if (open) {
      // Bulk mode - start with empty tags
      setTags([]);
    }
  }, [contact, open]);

  const handleAddTag = () => {
    const trimmedTag = newTag.trim().toLowerCase();
    if (!trimmedTag) return;
    if (tags.includes(trimmedTag)) {
      toast.error('Tag already exists');
      return;
    }
    setTags([...tags, trimmedTag]);
    setNewTag('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      if (contact) {
        // Update single contact
        const response = await fetch(`/api/contacts/${contact.id}/tags`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tags }),
        });

        if (response.ok) {
          toast.success('Tags updated successfully');
          onSuccess();
          onOpenChange(false);
        } else {
          toast.error('Failed to update tags');
        }
      } else {
        // Bulk update
        const response = await fetch('/api/contacts/bulk-tag', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contactIds: selectedContactIds,
            tags,
            action: 'add', // or 'replace' - let's add tags in bulk mode
          }),
        });

        if (response.ok) {
          toast.success('Tags added to selected contacts');
          onSuccess();
          onOpenChange(false);
        } else {
          toast.error('Failed to add tags');
        }
      }
    } catch (error) {
      console.error('Error updating tags:', error);
      toast.error('Failed to update tags');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setTags([]);
    setNewTag('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {contact ? 'Manage Tags' : `Add Tags to ${selectedContactIds.length} Contacts`}
          </DialogTitle>
          <DialogDescription>
            {contact
              ? `Update tags for ${contact.businessName}`
              : 'Tags will be added to all selected contacts'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Tags */}
          <div className="space-y-2">
            <Label>Current Tags</Label>
            {tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, idx) => (
                  <Badge key={idx} variant="secondary" className="gap-1">
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:bg-muted rounded-full"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No tags yet</p>
            )}
          </div>

          {/* Add New Tag */}
          <div className="space-y-2">
            <Label>Add Tag</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Enter tag name..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={handleAddTag}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Press Enter or click + to add a tag
            </p>
          </div>

          {/* Suggestions */}
          <div className="space-y-2">
            <Label className="text-xs">Suggested Tags</Label>
            <div className="flex flex-wrap gap-2">
              {['vip', 'hot-lead', 'follow-up', 'cold', 'interested'].map((suggestion) => (
                <Badge
                  key={suggestion}
                  variant="outline"
                  className="cursor-pointer hover:bg-muted"
                  onClick={() => {
                    if (!tags.includes(suggestion)) {
                      setTags([...tags, suggestion]);
                    }
                  }}
                >
                  {suggestion}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Tags'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
