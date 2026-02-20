'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface Program {
  id: string;
  name: string;
}

interface Division {
  id: string;
  name: string;
  program: { name: string };
}

/* ---------- Program Dialog ---------- */

interface ProgramFormState {
  name: string; sport: string; startDate: string; endDate: string;
  registrationFee: string; earlyBirdFee: string;
}

interface CreateProgramDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  form: ProgramFormState;
  setForm: React.Dispatch<React.SetStateAction<ProgramFormState>>;
  onSubmit: () => void;
  submitting: boolean;
}

export function CreateProgramDialog({ open, onOpenChange, form, setForm, onSubmit, submitting }: CreateProgramDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Program</DialogTitle>
          <DialogDescription>Add a new league or season</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Program Name *</Label>
            <Input placeholder="e.g., Spring Soccer League 2025" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Sport *</Label>
            <Input placeholder="e.g., Soccer" value={form.sport} onChange={(e) => setForm({ ...form, sport: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Date</Label>
              <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div>
              <Label>End Date</Label>
              <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Registration Fee ($)</Label>
              <Input type="number" placeholder="100" value={form.registrationFee} onChange={(e) => setForm({ ...form, registrationFee: e.target.value })} />
            </div>
            <div>
              <Label>Early Bird Fee ($)</Label>
              <Input type="number" placeholder="85" value={form.earlyBirdFee} onChange={(e) => setForm({ ...form, earlyBirdFee: e.target.value })} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Program'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Division Dialog ---------- */

interface DivisionFormState {
  programId: string; name: string; ageMin: string; ageMax: string; gender: string;
}

interface CreateDivisionDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  form: DivisionFormState;
  setForm: React.Dispatch<React.SetStateAction<DivisionFormState>>;
  programs: Program[];
  onSubmit: () => void;
  submitting: boolean;
}

export function CreateDivisionDialog({ open, onOpenChange, form, setForm, programs, onSubmit, submitting }: CreateDivisionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Division</DialogTitle>
          <DialogDescription>Add an age group or skill level</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Program *</Label>
            <Select value={form.programId || undefined} onValueChange={(value) => setForm({ ...form, programId: value })}>
              <SelectTrigger><SelectValue placeholder="Select program" /></SelectTrigger>
              <SelectContent>
                {programs.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Division Name *</Label>
            <Input placeholder="e.g., U10 Boys" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Min Age</Label>
              <Input type="number" placeholder="8" value={form.ageMin} onChange={(e) => setForm({ ...form, ageMin: e.target.value })} />
            </div>
            <div>
              <Label>Max Age</Label>
              <Input type="number" placeholder="10" value={form.ageMax} onChange={(e) => setForm({ ...form, ageMax: e.target.value })} />
            </div>
            <div>
              <Label>Gender</Label>
              <Select value={form.gender} onValueChange={(value) => setForm({ ...form, gender: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="COED">Co-Ed</SelectItem>
                  <SelectItem value="BOYS">Boys</SelectItem>
                  <SelectItem value="GIRLS">Girls</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Division'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Team Dialog ---------- */

interface TeamFormState {
  divisionId: string; name: string; colorPrimary: string;
}

interface CreateTeamDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  form: TeamFormState;
  setForm: React.Dispatch<React.SetStateAction<TeamFormState>>;
  divisions: Division[];
  onSubmit: () => void;
  submitting: boolean;
}

export function CreateTeamDialog({ open, onOpenChange, form, setForm, divisions, onSubmit, submitting }: CreateTeamDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Team</DialogTitle>
          <DialogDescription>Add a team to a division</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Division *</Label>
            <Select value={form.divisionId || undefined} onValueChange={(value) => setForm({ ...form, divisionId: value })}>
              <SelectTrigger><SelectValue placeholder="Select division" /></SelectTrigger>
              <SelectContent>
                {divisions.map((d) => <SelectItem key={d.id} value={d.id}>{d.name} ({d.program.name})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Team Name *</Label>
            <Input placeholder="e.g., Lightning" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Team Color</Label>
            <div className="flex gap-2">
              <Input type="color" value={form.colorPrimary} onChange={(e) => setForm({ ...form, colorPrimary: e.target.value })} className="w-20 h-10" />
              <Input value={form.colorPrimary} onChange={(e) => setForm({ ...form, colorPrimary: e.target.value })} placeholder="#0066cc" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Team'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
