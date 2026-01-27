
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, Plus, Edit, Trash2, Trophy, Calendar as CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { format, differenceInYears } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface FamilyMember {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  waiverSigned: boolean;
  registrations: Array<{
    id: string;
    status: string;
    program: { name: string };
    division?: { name: string };
  }>;
}

export default function FamilyMembersPage() {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: 'MALE' as 'MALE' | 'FEMALE' | 'OTHER',
  });

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const response = await fetch('/api/clubos/parent/family');
      if (!response.ok) {
        throw new Error('Failed to fetch family members');
      }
      const data = await response.json();
      setMembers(data.members || []);
    } catch (error: any) {
      console.error('Error fetching family members:', error);
      toast.error('Failed to load family members');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (member?: FamilyMember) => {
    if (member) {
      setEditingMember(member);
      setFormData({
        firstName: member.firstName,
        lastName: member.lastName,
        dateOfBirth: member.dateOfBirth.split('T')[0],
        gender: member.gender as 'MALE' | 'FEMALE' | 'OTHER',
      });
    } else {
      setEditingMember(null);
      setFormData({
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        gender: 'MALE',
      });
    }
    setIsDialogOpen(true);
  };

  const handleSaveMember = async () => {
    try {
      setIsSaving(true);

      const url = editingMember
        ? `/api/clubos/parent/family/${editingMember.id}`
        : '/api/clubos/parent/family';

      const method = editingMember ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save member');
      }

      toast.success(editingMember ? 'Member updated successfully' : 'Member added successfully');
      setIsDialogOpen(false);
      fetchMembers();
    } catch (error: any) {
      console.error('Error saving member:', error);
      toast.error(error.message || 'Failed to save member');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this family member?')) {
      return;
    }

    try {
      const response = await fetch(`/api/clubos/parent/family/${memberId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete member');
      }

      toast.success('Member removed successfully');
      fetchMembers();
    } catch (error: any) {
      console.error('Error deleting member:', error);
      toast.error(error.message || 'Failed to remove member');
    }
  };

  const getAge = (dateOfBirth: string) => {
    return differenceInYears(new Date(), new Date(dateOfBirth));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-7xl py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Family</h1>
          <p className="text-muted-foreground">
            Manage your family members and their registrations
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Family Member
        </Button>
      </div>

      {members.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            <p className="text-muted-foreground mb-4">No family members added yet</p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Family Member
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {members.map((member) => (
            <Card key={member.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {member.firstName} {member.lastName}
                      <Badge variant="outline">{member.gender}</Badge>
                    </CardTitle>
                    <CardDescription>
                      Age {getAge(member.dateOfBirth)} • Born {format(new Date(member.dateOfBirth), 'MMM d, yyyy')}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenDialog(member)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteMember(member.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Trophy className="h-4 w-4" />
                      Active Registrations ({member.registrations.length})
                    </h4>
                    {member.registrations.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No active registrations</p>
                    ) : (
                      <div className="space-y-2">
                        {member.registrations.map((reg) => (
                          <div
                            key={reg.id}
                            className="flex items-center justify-between p-2 border rounded"
                          >
                            <div>
                              <p className="text-sm font-medium">{reg.program.name}</p>
                              {reg.division && (
                                <p className="text-xs text-muted-foreground">{reg.division.name}</p>
                              )}
                            </div>
                            <Badge
                              variant={
                                reg.status === 'ACTIVE'
                                  ? 'default'
                                  : reg.status === 'APPROVED'
                                  ? 'secondary'
                                  : 'outline'
                              }
                            >
                              {reg.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {!member.waiverSigned && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        ⚠️ Waiver not signed. Required for registration.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingMember ? 'Edit Family Member' : 'Add Family Member'}
            </DialogTitle>
            <DialogDescription>
              {editingMember
                ? 'Update the information for this family member'
                : 'Add a new family member to your household'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="John"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Smith"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="gender">Gender</Label>
              <Select
                value={formData.gender}
                onValueChange={(value: 'MALE' | 'FEMALE' | 'OTHER') =>
                  setFormData({ ...formData, gender: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">Male</SelectItem>
                  <SelectItem value="FEMALE">Female</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveMember} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
