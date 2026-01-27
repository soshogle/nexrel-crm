
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface EditTeamDialogProps {
  team: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

export default function EditTeamDialog({ team, open, onOpenChange, onUpdated }: EditTeamDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    colorPrimary: '',
    colorSecondary: '',
    status: '',
    maxPlayers: '',
  });

  useEffect(() => {
    if (team && open) {
      setFormData({
        name: team.name || '',
        colorPrimary: team.colorPrimary || '#000000',
        colorSecondary: team.colorSecondary || '',
        status: team.status || 'FORMING',
        maxPlayers: team.maxPlayers?.toString() || '',
      });
    }
  }, [team, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        name: formData.name,
        colorPrimary: formData.colorPrimary,
        colorSecondary: formData.colorSecondary || null,
        status: formData.status,
        maxPlayers: formData.maxPlayers ? parseInt(formData.maxPlayers) : null,
      };

      const response = await fetch(`/api/clubos/teams/${team.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update team');
      }

      toast.success('Team updated successfully!');
      onUpdated();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating team:', error);
      toast.error(error.message || 'Failed to update team');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Team</DialogTitle>
            <DialogDescription>Update team information</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Team Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="e.g., Lions, Eagles, Thunder"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="colorPrimary">Primary Color *</Label>
                <div className="flex gap-2">
                  <Input
                    id="colorPrimary"
                    type="color"
                    value={formData.colorPrimary}
                    onChange={(e) => setFormData({ ...formData, colorPrimary: e.target.value })}
                    required
                    className="w-16 h-10"
                  />
                  <Input
                    value={formData.colorPrimary}
                    onChange={(e) => setFormData({ ...formData, colorPrimary: e.target.value })}
                    placeholder="#000000"
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="colorSecondary">Secondary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="colorSecondary"
                    type="color"
                    value={formData.colorSecondary || '#ffffff'}
                    onChange={(e) => setFormData({ ...formData, colorSecondary: e.target.value })}
                    className="w-16 h-10"
                  />
                  <Input
                    value={formData.colorSecondary}
                    onChange={(e) => setFormData({ ...formData, colorSecondary: e.target.value })}
                    placeholder="#ffffff"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FORMING">Forming</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                    <SelectItem value="DISSOLVED">Dissolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxPlayers">Max Players</Label>
                <Input
                  id="maxPlayers"
                  type="number"
                  value={formData.maxPlayers}
                  onChange={(e) => setFormData({ ...formData, maxPlayers: e.target.value })}
                  placeholder="Optional"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
