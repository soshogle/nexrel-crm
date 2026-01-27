
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface CreateScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScheduleCreated: () => void;
  venues: any[];
  programs: any[];
  initialDate?: Date | null;
}

export function CreateScheduleDialog({
  open,
  onOpenChange,
  onScheduleCreated,
  venues,
  programs,
  initialDate,
}: CreateScheduleDialogProps) {
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState<any[]>([]);
  const [formData, setFormData] = useState<{
    eventType: string;
    title: string;
    description: string;
    startTime: string;
    endTime: string;
    venueId: string | undefined;
    practiceTeamId: string | undefined;
    homeTeamId: string | undefined;
    awayTeamId: string | undefined;
    notes: string;
  }>({
    eventType: 'PRACTICE',
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    venueId: undefined,
    practiceTeamId: undefined,
    homeTeamId: undefined,
    awayTeamId: undefined,
    notes: '',
  });

  useEffect(() => {
    if (open) {
      fetchTeams();
    }
  }, [open]);

  // Pre-fill date when initialDate is provided
  useEffect(() => {
    if (initialDate && open) {
      // Format date to YYYY-MM-DDTHH:MM for datetime-local input
      const year = initialDate.getFullYear();
      const month = String(initialDate.getMonth() + 1).padStart(2, '0');
      const day = String(initialDate.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}T09:00`; // Default to 9 AM
      
      setFormData((prev) => ({
        ...prev,
        startTime: formattedDate,
        endTime: `${year}-${month}-${day}T10:00`, // Default to 1 hour duration
      }));
    }
  }, [initialDate, open]);

  const fetchTeams = async () => {
    try {
      const response = await fetch('/api/clubos/teams');
      const data = await response.json();
      // Handle both response formats: { teams: [...] } or direct array
      const teamsArray = Array.isArray(data) ? data : (data.teams || []);
      setTeams(teamsArray);
    } catch (error) {
      console.error('Error fetching teams:', error);
      setTeams([]); // Set empty array on error
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/clubos/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create schedule');
      }

      onScheduleCreated();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        eventType: 'PRACTICE',
        title: '',
        description: '',
        startTime: '',
        endTime: '',
        venueId: undefined,
        practiceTeamId: undefined,
        homeTeamId: undefined,
        awayTeamId: undefined,
        notes: '',
      });
    } catch (error: any) {
      console.error('Error creating schedule:', error);
      toast.error(error.message || 'Failed to create schedule');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Event</DialogTitle>
          <DialogDescription>
            Schedule a game, practice, or other event for your teams
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="eventType">Event Type *</Label>
              <Select
                value={formData.eventType}
                onValueChange={(value) =>
                  setFormData({ ...formData, eventType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GAME">Game</SelectItem>
                  <SelectItem value="PRACTICE">Practice</SelectItem>
                  <SelectItem value="TOURNAMENT">Tournament</SelectItem>
                  <SelectItem value="TRYOUT">Tryout</SelectItem>
                  <SelectItem value="MEETING">Meeting</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="e.g., U10 Soccer Practice"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Event details..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time *</Label>
              <Input
                id="startTime"
                type="datetime-local"
                value={formData.startTime}
                onChange={(e) =>
                  setFormData({ ...formData, startTime: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endTime">End Time *</Label>
              <Input
                id="endTime"
                type="datetime-local"
                value={formData.endTime}
                onChange={(e) =>
                  setFormData({ ...formData, endTime: e.target.value })
                }
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="venueId">Venue</Label>
            <Select
              value={formData.venueId || ""}
              onValueChange={(value) =>
                setFormData({ ...formData, venueId: value || undefined })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select venue" />
              </SelectTrigger>
              <SelectContent>
                {venues.map((venue) => (
                  <SelectItem key={venue.id} value={venue.id}>
                    {venue.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.eventType === 'PRACTICE' ? (
            <div className="space-y-2">
              <Label htmlFor="practiceTeamId">Team</Label>
              <Select
                value={formData.practiceTeamId || ""}
                onValueChange={(value) =>
                  setFormData({ ...formData, practiceTeamId: value || undefined })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name} - {team.division?.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="homeTeamId">Home Team</Label>
                <Select
                  value={formData.homeTeamId || ""}
                  onValueChange={(value) =>
                    setFormData({ ...formData, homeTeamId: value || undefined })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select home team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name} - {team.division?.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="awayTeamId">Away Team</Label>
                <Select
                  value={formData.awayTeamId || ""}
                  onValueChange={(value) =>
                    setFormData({ ...formData, awayTeamId: value || undefined })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select away team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name} - {team.division?.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Additional notes..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Event'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
