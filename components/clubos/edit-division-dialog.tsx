
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface EditDivisionDialogProps {
  division: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

export default function EditDivisionDialog({ division, open, onOpenChange, onUpdated }: EditDivisionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    ageMin: '',
    ageMax: '',
    gender: '',
    skillLevel: '',
    maxTeams: '',
    maxPlayersPerTeam: '',
    practiceDay: '',
    practiceTime: '',
  });

  useEffect(() => {
    if (division && open) {
      setFormData({
        name: division.name || '',
        ageMin: division.ageMin?.toString() || '',
        ageMax: division.ageMax?.toString() || '',
        gender: division.gender || 'none',
        skillLevel: division.skillLevel || '',
        maxTeams: division.maxTeams?.toString() || '',
        maxPlayersPerTeam: division.maxPlayersPerTeam?.toString() || '',
        practiceDay: division.practiceDay || '',
        practiceTime: division.practiceTime || '',
      });
    }
  }, [division, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        name: formData.name,
        ageMin: formData.ageMin ? parseInt(formData.ageMin) : null,
        ageMax: formData.ageMax ? parseInt(formData.ageMax) : null,
        gender: formData.gender === 'none' ? null : formData.gender,
        skillLevel: formData.skillLevel || null,
        maxTeams: formData.maxTeams ? parseInt(formData.maxTeams) : null,
        maxPlayersPerTeam: formData.maxPlayersPerTeam ? parseInt(formData.maxPlayersPerTeam) : null,
        practiceDay: formData.practiceDay || null,
        practiceTime: formData.practiceTime || null,
      };

      const response = await fetch(`/api/clubos/divisions/${division.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update division');
      }

      toast.success('Division updated successfully!');
      onUpdated();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating division:', error);
      toast.error(error.message || 'Failed to update division');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Division</DialogTitle>
            <DialogDescription>Update division information</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Division Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="e.g., U8 Boys, Beginner Group"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ageMin">Minimum Age</Label>
                <Input
                  id="ageMin"
                  type="number"
                  value={formData.ageMin}
                  onChange={(e) => setFormData({ ...formData, ageMin: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ageMax">Maximum Age</Label>
                <Input
                  id="ageMax"
                  type="number"
                  value={formData.ageMax}
                  onChange={(e) => setFormData({ ...formData, ageMax: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Co-Ed / No Preference</SelectItem>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="skillLevel">Skill Level</Label>
                <Input
                  id="skillLevel"
                  value={formData.skillLevel}
                  onChange={(e) => setFormData({ ...formData, skillLevel: e.target.value })}
                  placeholder="e.g., Beginner, Intermediate"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxTeams">Max Teams</Label>
                <Input
                  id="maxTeams"
                  type="number"
                  value={formData.maxTeams}
                  onChange={(e) => setFormData({ ...formData, maxTeams: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxPlayersPerTeam">Max Players per Team</Label>
                <Input
                  id="maxPlayersPerTeam"
                  type="number"
                  value={formData.maxPlayersPerTeam}
                  onChange={(e) => setFormData({ ...formData, maxPlayersPerTeam: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="practiceDay">Practice Day</Label>
                <Input
                  id="practiceDay"
                  value={formData.practiceDay}
                  onChange={(e) => setFormData({ ...formData, practiceDay: e.target.value })}
                  placeholder="e.g., Monday, Tuesday/Thursday"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="practiceTime">Practice Time</Label>
                <Input
                  id="practiceTime"
                  value={formData.practiceTime}
                  onChange={(e) => setFormData({ ...formData, practiceTime: e.target.value })}
                  placeholder="e.g., 4:00 PM - 5:00 PM"
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
