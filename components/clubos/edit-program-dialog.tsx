
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface EditProgramDialogProps {
  program: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

export default function EditProgramDialog({ program, open, onOpenChange, onUpdated }: EditProgramDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    programType: '',
    startDate: '',
    endDate: '',
    registrationOpenDate: '',
    registrationCloseDate: '',
    earlyBirdDeadline: '',
    ageMin: '',
    ageMax: '',
    maxParticipants: '',
    baseFee: '',
    familyDiscount: '',
    earlyBirdDiscount: '',
    status: '',
  });

  useEffect(() => {
    if (program && open) {
      setFormData({
        name: program.name || '',
        description: program.description || '',
        programType: program.programType || 'LEAGUE',
        startDate: program.startDate ? new Date(program.startDate).toISOString().split('T')[0] : '',
        endDate: program.endDate ? new Date(program.endDate).toISOString().split('T')[0] : '',
        registrationOpenDate: program.registrationOpenDate ? new Date(program.registrationOpenDate).toISOString().split('T')[0] : '',
        registrationCloseDate: program.registrationCloseDate ? new Date(program.registrationCloseDate).toISOString().split('T')[0] : '',
        earlyBirdDeadline: program.earlyBirdDeadline ? new Date(program.earlyBirdDeadline).toISOString().split('T')[0] : '',
        ageMin: program.ageMin?.toString() || '',
        ageMax: program.ageMax?.toString() || '',
        maxParticipants: program.maxParticipants?.toString() || '',
        baseFee: ((program.baseFee || 0) / 100).toString(),
        familyDiscount: ((program.familyDiscount || 0) / 100).toString(),
        earlyBirdDiscount: ((program.earlyBirdDiscount || 0) / 100).toString(),
        status: program.status || 'OPEN',
      });
    }
  }, [program, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        programType: formData.programType,
        startDate: formData.startDate ? new Date(formData.startDate).toISOString() : null,
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null,
        registrationOpenDate: formData.registrationOpenDate ? new Date(formData.registrationOpenDate).toISOString() : null,
        registrationCloseDate: formData.registrationCloseDate ? new Date(formData.registrationCloseDate).toISOString() : null,
        earlyBirdDeadline: formData.earlyBirdDeadline ? new Date(formData.earlyBirdDeadline).toISOString() : null,
        ageMin: formData.ageMin ? parseInt(formData.ageMin) : null,
        ageMax: formData.ageMax ? parseInt(formData.ageMax) : null,
        maxParticipants: formData.maxParticipants ? parseInt(formData.maxParticipants) : null,
        baseFee: formData.baseFee ? Math.round(parseFloat(formData.baseFee) * 100) : 0,
        familyDiscount: formData.familyDiscount ? Math.round(parseFloat(formData.familyDiscount) * 100) : 0,
        earlyBirdDiscount: formData.earlyBirdDiscount ? Math.round(parseFloat(formData.earlyBirdDiscount) * 100) : 0,
        status: formData.status,
      };

      const response = await fetch(`/api/clubos/programs/${program.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update program');
      }

      toast.success('Program updated successfully!');
      onUpdated();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating program:', error);
      toast.error(error.message || 'Failed to update program');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Program</DialogTitle>
            <DialogDescription>Update program information</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Program Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="programType">Type *</Label>
                <Select value={formData.programType} onValueChange={(value) => setFormData({ ...formData, programType: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LEAGUE">League</SelectItem>
                    <SelectItem value="CAMP">Camp</SelectItem>
                    <SelectItem value="CLINIC">Clinic</SelectItem>
                    <SelectItem value="TOURNAMENT">Tournament</SelectItem>
                    <SelectItem value="TRAINING">Training</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">End Date *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  required
                />
              </div>
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

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="baseFee">Base Fee ($)</Label>
                <Input
                  id="baseFee"
                  type="number"
                  step="0.01"
                  value={formData.baseFee}
                  onChange={(e) => setFormData({ ...formData, baseFee: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="familyDiscount">Family Discount ($)</Label>
                <Input
                  id="familyDiscount"
                  type="number"
                  step="0.01"
                  value={formData.familyDiscount}
                  onChange={(e) => setFormData({ ...formData, familyDiscount: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="earlyBirdDiscount">Early Bird ($)</Label>
                <Input
                  id="earlyBirdDiscount"
                  type="number"
                  step="0.01"
                  value={formData.earlyBirdDiscount}
                  onChange={(e) => setFormData({ ...formData, earlyBirdDiscount: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                  <SelectItem value="FULL">Full</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                </SelectContent>
              </Select>
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
