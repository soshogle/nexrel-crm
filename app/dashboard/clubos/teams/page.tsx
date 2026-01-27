'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Users, Trophy, Shield, Plus, Loader2, ChevronDown, Edit } from 'lucide-react';
import EditProgramDialog from '@/components/clubos/edit-program-dialog';
import EditDivisionDialog from '@/components/clubos/edit-division-dialog';
import EditTeamDialog from '@/components/clubos/edit-team-dialog';

interface Program {
  id: string;
  name: string;
  sport: string;
  startDate: string;
  endDate: string;
}

interface Division {
  id: string;
  name: string;
  ageMin?: number;
  ageMax?: number;
  gender: string;
  program: { name: string };
  _count: { teams: number; registrations: number };
}

interface Team {
  id: string;
  name: string;
  colorPrimary?: string;
  status: string;
  division: { name: string; program: { name: string } };
  members: any[];
}

export default function TeamsManagementPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [programDialog, setProgramDialog] = useState(false);
  const [divisionDialog, setDivisionDialog] = useState(false);
  const [teamDialog, setTeamDialog] = useState(false);

  // Form states
  const [programForm, setProgramForm] = useState({ name: '', sport: '', startDate: '', endDate: '', registrationFee: '', earlyBirdFee: '' });
  const [divisionForm, setDivisionForm] = useState({ programId: '', name: '', ageMin: '', ageMax: '', gender: 'COED' });
  const [teamForm, setTeamForm] = useState({ divisionId: '', name: '', colorPrimary: '#0066cc' });
  const [submitting, setSubmitting] = useState(false);

  // Edit dialog states
  const [editProgramDialog, setEditProgramDialog] = useState(false);
  const [editDivisionDialog, setEditDivisionDialog] = useState(false);
  const [editTeamDialog, setEditTeamDialog] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [selectedDivision, setSelectedDivision] = useState<Division | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  // Create dropdown state
  const [createMenuOpen, setCreateMenuOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [programsRes, divisionsRes, teamsRes] = await Promise.all([
        fetch('/api/clubos/programs'),
        fetch('/api/clubos/divisions'),
        fetch('/api/clubos/teams'),
      ]);

      // Check for errors
      if (!programsRes.ok || !divisionsRes.ok || !teamsRes.ok) {
        throw new Error('Failed to fetch data from server');
      }

      const [programsData, divisionsData, teamsData] = await Promise.all([
        programsRes.json(),
        divisionsRes.json(),
        teamsRes.json(),
      ]);

      // Safely extract arrays with multiple fallback checks
      const programsArray = programsData?.success 
        ? (Array.isArray(programsData.programs) ? programsData.programs : [])
        : (Array.isArray(programsData?.programs) ? programsData.programs : (Array.isArray(programsData) ? programsData : []));
      
      const divisionsArray = Array.isArray(divisionsData?.divisions) 
        ? divisionsData.divisions 
        : (Array.isArray(divisionsData) ? divisionsData : []);
      
      const teamsArray = Array.isArray(teamsData?.teams) 
        ? teamsData.teams 
        : (Array.isArray(teamsData) ? teamsData : []);

      console.log('📊 Teams page data loaded:', {
        programs: programsArray.length,
        divisions: divisionsArray.length,
        teams: teamsArray.length
      });

      setPrograms(programsArray);
      setDivisions(divisionsArray);
      setTeams(teamsArray);
    } catch (error: any) {
      console.error('❌ Error loading teams data:', error);
      toast.error('Failed to load data: ' + (error.message || 'Unknown error'));
      // Set empty arrays on error
      setPrograms([]);
      setDivisions([]);
      setTeams([]);
    } finally {
      setLoading(false);
    }
  };

  const createProgram = async () => {
    if (!programForm.name || !programForm.sport) {
      toast.error('Name and sport are required');
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch('/api/clubos/programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...programForm,
          registrationFee: parseInt(programForm.registrationFee) || 0,
          earlyBirdFee: programForm.earlyBirdFee ? parseInt(programForm.earlyBirdFee) : undefined,
        }),
      });

      if (!response.ok) throw new Error('Failed to create program');

      toast.success('Program created successfully');
      setProgramDialog(false);
      setProgramForm({ name: '', sport: '', startDate: '', endDate: '', registrationFee: '', earlyBirdFee: '' });
      fetchData();
    } catch (error) {
      toast.error('Failed to create program');
    } finally {
      setSubmitting(false);
    }
  };

  const createDivision = async () => {
    if (!divisionForm.programId || !divisionForm.name) {
      toast.error('Program and name are required');
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch('/api/clubos/divisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...divisionForm,
          ageMin: divisionForm.ageMin ? parseInt(divisionForm.ageMin) : undefined,
          ageMax: divisionForm.ageMax ? parseInt(divisionForm.ageMax) : undefined,
        }),
      });

      if (!response.ok) throw new Error('Failed to create division');

      toast.success('Division created successfully');
      setDivisionDialog(false);
      setDivisionForm({ programId: '', name: '', ageMin: '', ageMax: '', gender: 'COED' });
      fetchData();
    } catch (error) {
      toast.error('Failed to create division');
    } finally {
      setSubmitting(false);
    }
  };

  const createTeam = async () => {
    if (!teamForm.divisionId || !teamForm.name) {
      toast.error('Division and name are required');
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch('/api/clubos/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(teamForm),
      });

      if (!response.ok) throw new Error('Failed to create team');

      toast.success('Team created successfully');
      setTeamDialog(false);
      setTeamForm({ divisionId: '', name: '', colorPrimary: '#0066cc' });
      fetchData();
    } catch (error) {
      toast.error('Failed to create team');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold gradient-text">Teams & Leagues Management</h1>
        <p className="text-gray-400">Manage your sports programs, divisions, and teams</p>
      </div>

      <Tabs defaultValue="programs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="programs">Programs</TabsTrigger>
          <TabsTrigger value="divisions">Divisions</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
        </TabsList>

        <TabsContent value="programs" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Programs (Leagues/Seasons)</h2>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setProgramDialog(true)}>
                  <Trophy className="h-4 w-4 mr-2" />
                  New Program
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDivisionDialog(true)}>
                  <Shield className="h-4 w-4 mr-2" />
                  New Division
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTeamDialog(true)}>
                  <Users className="h-4 w-4 mr-2" />
                  New Team
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {programs.map((program) => (
              <div
                key={program.id}
                className="p-6 bg-gray-900 rounded-xl border border-gray-800 hover:border-purple-500/50 cursor-pointer transition-all"
                onClick={() => {
                  setSelectedProgram(program);
                  setEditProgramDialog(true);
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-purple-500/10">
                      <Trophy className="h-5 w-5 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{program.name}</h3>
                      <p className="text-sm text-gray-400">{program.sport}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedProgram(program);
                      setEditProgramDialog(true);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2 text-sm text-gray-400">
                  <p>Start: {new Date(program.startDate).toLocaleDateString()}</p>
                  <p>End: {new Date(program.endDate).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="divisions" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Divisions (Age Groups)</h2>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setProgramDialog(true)}>
                  <Trophy className="h-4 w-4 mr-2" />
                  New Program
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDivisionDialog(true)}>
                  <Shield className="h-4 w-4 mr-2" />
                  New Division
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTeamDialog(true)}>
                  <Users className="h-4 w-4 mr-2" />
                  New Team
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {divisions.map((division) => (
              <div
                key={division.id}
                className="p-6 bg-gray-900 rounded-xl border border-gray-800 hover:border-purple-500/50 cursor-pointer transition-all"
                onClick={() => {
                  setSelectedDivision(division);
                  setEditDivisionDialog(true);
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-blue-500/10">
                      <Shield className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{division.name}</h3>
                      <p className="text-sm text-gray-400">{division.program.name}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDivision(division);
                      setEditDivisionDialog(true);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex gap-2 mb-3">
                  <Badge className="bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {division.ageMin && division.ageMax
                      ? `Ages ${division.ageMin}-${division.ageMax}`
                      : 'All Ages'}
                  </Badge>
                  <Badge className="bg-blue-500/20 text-blue-300 border border-blue-500/30">{division.gender}</Badge>
                </div>
                <div className="space-y-1 text-sm text-gray-400">
                  <p>{division._count.teams} teams</p>
                  <p>{division._count.registrations} registrations</p>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="teams" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Teams</h2>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setProgramDialog(true)}>
                  <Trophy className="h-4 w-4 mr-2" />
                  New Program
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDivisionDialog(true)}>
                  <Shield className="h-4 w-4 mr-2" />
                  New Division
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTeamDialog(true)}>
                  <Users className="h-4 w-4 mr-2" />
                  New Team
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map((team) => (
              <div
                key={team.id}
                className="p-6 bg-gray-900 rounded-xl border border-gray-800 hover:border-purple-500/50 cursor-pointer transition-all"
                onClick={() => {
                  setSelectedTeam(team);
                  setEditTeamDialog(true);
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-green-500/10">
                      <Users className="h-5 w-5 text-green-400" />
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: team.colorPrimary || '#0066cc' }}
                      />
                      <div>
                        <h3 className="font-semibold text-white">{team.name}</h3>
                        <p className="text-xs text-gray-400">{team.division.name} - {team.division.program.name}</p>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTeam(team);
                      setEditTeamDialog(true);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">
                    {team.members?.length || 0} players
                  </span>
                  <Badge className="bg-green-500/20 text-green-300 border border-green-500/30">{team.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Program Dialog */}
      <Dialog open={programDialog} onOpenChange={setProgramDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Program</DialogTitle>
            <DialogDescription>Add a new league or season</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Program Name *</Label>
              <Input
                placeholder="e.g., Spring Soccer League 2025"
                value={programForm.name}
                onChange={(e) => setProgramForm({ ...programForm, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Sport *</Label>
              <Input
                placeholder="e.g., Soccer"
                value={programForm.sport}
                onChange={(e) => setProgramForm({ ...programForm, sport: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={programForm.startDate}
                  onChange={(e) => setProgramForm({ ...programForm, startDate: e.target.value })}
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={programForm.endDate}
                  onChange={(e) => setProgramForm({ ...programForm, endDate: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Registration Fee ($)</Label>
                <Input
                  type="number"
                  placeholder="100"
                  value={programForm.registrationFee}
                  onChange={(e) => setProgramForm({ ...programForm, registrationFee: e.target.value })}
                />
              </div>
              <div>
                <Label>Early Bird Fee ($)</Label>
                <Input
                  type="number"
                  placeholder="85"
                  value={programForm.earlyBirdFee}
                  onChange={(e) => setProgramForm({ ...programForm, earlyBirdFee: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProgramDialog(false)}>
              Cancel
            </Button>
            <Button onClick={createProgram} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Program'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Division Dialog */}
      <Dialog open={divisionDialog} onOpenChange={setDivisionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Division</DialogTitle>
            <DialogDescription>Add an age group or skill level</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Program *</Label>
              <Select value={divisionForm.programId || undefined} onValueChange={(value) => setDivisionForm({ ...divisionForm, programId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select program" />
                </SelectTrigger>
                <SelectContent>
                  {programs.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Division Name *</Label>
              <Input
                placeholder="e.g., U10 Boys"
                value={divisionForm.name}
                onChange={(e) => setDivisionForm({ ...divisionForm, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Min Age</Label>
                <Input
                  type="number"
                  placeholder="8"
                  value={divisionForm.ageMin}
                  onChange={(e) => setDivisionForm({ ...divisionForm, ageMin: e.target.value })}
                />
              </div>
              <div>
                <Label>Max Age</Label>
                <Input
                  type="number"
                  placeholder="10"
                  value={divisionForm.ageMax}
                  onChange={(e) => setDivisionForm({ ...divisionForm, ageMax: e.target.value })}
                />
              </div>
              <div>
                <Label>Gender</Label>
                <Select value={divisionForm.gender} onValueChange={(value) => setDivisionForm({ ...divisionForm, gender: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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
            <Button variant="outline" onClick={() => setDivisionDialog(false)}>
              Cancel
            </Button>
            <Button onClick={createDivision} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Division'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Team Dialog */}
      <Dialog open={teamDialog} onOpenChange={setTeamDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Team</DialogTitle>
            <DialogDescription>Add a team to a division</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Division *</Label>
              <Select value={teamForm.divisionId || undefined} onValueChange={(value) => setTeamForm({ ...teamForm, divisionId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select division" />
                </SelectTrigger>
                <SelectContent>
                  {divisions.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name} ({d.program.name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Team Name *</Label>
              <Input
                placeholder="e.g., Lightning"
                value={teamForm.name}
                onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Team Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={teamForm.colorPrimary}
                  onChange={(e) => setTeamForm({ ...teamForm, colorPrimary: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  value={teamForm.colorPrimary}
                  onChange={(e) => setTeamForm({ ...teamForm, colorPrimary: e.target.value })}
                  placeholder="#0066cc"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTeamDialog(false)}>
              Cancel
            </Button>
            <Button onClick={createTeam} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Team'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialogs */}
      {selectedProgram && (
        <EditProgramDialog
          program={selectedProgram}
          open={editProgramDialog}
          onOpenChange={setEditProgramDialog}
          onUpdated={() => {
            fetchData();
            setEditProgramDialog(false);
          }}
        />
      )}

      {selectedDivision && (
        <EditDivisionDialog
          division={selectedDivision}
          open={editDivisionDialog}
          onOpenChange={setEditDivisionDialog}
          onUpdated={() => {
            fetchData();
            setEditDivisionDialog(false);
          }}
        />
      )}

      {selectedTeam && (
        <EditTeamDialog
          team={selectedTeam}
          open={editTeamDialog}
          onOpenChange={setEditTeamDialog}
          onUpdated={() => {
            fetchData();
            setEditTeamDialog(false);
          }}
        />
      )}
    </div>
  );
}
