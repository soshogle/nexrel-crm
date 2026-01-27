'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Shield, Users, Lock, Loader2, UserCheck } from 'lucide-react';
import { PageResource } from '@prisma/client';

interface TeamMember {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
  permissions: Array<{
    resource: PageResource;
    canRead: boolean;
    canWrite: boolean;
    canDelete: boolean;
  }>;
}

interface RolePreset {
  key: string;
  name: string;
  description: string;
}

export default function PermissionsManager() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [rolePresets, setRolePresets] = useState<RolePreset[]>([]);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/permissions');
      if (!response.ok) throw new Error('Failed to fetch permissions');

      const data = await response.json();
      setTeamMembers(data.teamMembers || []);
      setRolePresets(data.rolePresets || []);
      
      if (data.teamMembers?.length > 0) {
        setSelectedMember(data.teamMembers[0]);
      }
    } catch (error: any) {
      console.error('Error fetching permissions:', error);
      toast.error('Failed to load permissions');
    } finally {
      setIsLoading(false);
    }
  };

  const applyRolePreset = async (targetUserId: string, rolePreset: string) => {
    try {
      setIsSaving(true);
      const response = await fetch('/api/admin/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId, rolePreset }),
      });

      if (!response.ok) throw new Error('Failed to apply role preset');

      toast.success(`Role preset "${rolePreset}" applied successfully`);
      await fetchPermissions();
    } catch (error: any) {
      console.error('Error applying role preset:', error);
      toast.error('Failed to apply role preset');
    } finally {
      setIsSaving(false);
    }
  };

  const updatePermission = async (
    userId: string,
    resource: PageResource,
    field: 'canRead' | 'canWrite' | 'canDelete',
    value: boolean
  ) => {
    try {
      const currentPermission = selectedMember?.permissions.find(p => p.resource === resource);
      
      const response = await fetch(`/api/admin/permissions/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resource,
          canRead: field === 'canRead' ? value : currentPermission?.canRead ?? false,
          canWrite: field === 'canWrite' ? value : currentPermission?.canWrite ?? false,
          canDelete: field === 'canDelete' ? value : currentPermission?.canDelete ?? false,
        }),
      });

      if (!response.ok) throw new Error('Failed to update permission');

      toast.success('Permission updated');
      await fetchPermissions();
    } catch (error: any) {
      console.error('Error updating permission:', error);
      toast.error('Failed to update permission');
    }
  };

  const getPermissionValue = (resource: PageResource, field: 'canRead' | 'canWrite' | 'canDelete'): boolean => {
    const permission = selectedMember?.permissions.find(p => p.resource === resource);
    return permission?.[field] ?? false;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (teamMembers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            No Team Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400">
            You haven't added any team members yet. Add team members from the Team page to manage their permissions here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Team Member Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Members
          </CardTitle>
          <CardDescription>
            Select a team member to manage their permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teamMembers.map((member) => (
              <div
                key={member.id}
                onClick={() => setSelectedMember(member)}
                className={`p-4 rounded-lg cursor-pointer transition-all border-2 ${
                  selectedMember?.id === member.id
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-gray-300 hover:border-gray-400 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{member.name || member.email}</h3>
                  {selectedMember?.id === member.id && (
                    <UserCheck className="h-5 w-5 text-purple-500" />
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-2">{member.email}</p>
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-xs">
                    {member.role}
                  </Badge>
                  <Badge
                    variant={member.status === 'ACTIVE' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {member.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Role Presets */}
      {selectedMember && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Quick Apply Role Preset
            </CardTitle>
            <CardDescription>
              Apply predefined permission sets to {selectedMember.name || selectedMember.email}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {rolePresets.map((preset) => (
                <div
                  key={preset.key}
                  className="p-4 rounded-lg bg-gray-50 border border-gray-200 hover:border-purple-500 transition-all"
                >
                  <h3 className="font-semibold text-gray-900 mb-2">{preset.name}</h3>
                  <p className="text-sm text-gray-600 mb-4 min-h-[40px]">{preset.description}</p>
                  <Button
                    onClick={() => applyRolePreset(selectedMember.id, preset.key)}
                    disabled={isSaving}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    size="sm"
                  >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Granular Permissions */}
      {selectedMember && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Page-Level Permissions
            </CardTitle>
            <CardDescription>
              Fine-tune access for {selectedMember.name || selectedMember.email}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 overflow-x-auto">
              {/* Header Row */}
              <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 rounded-t-lg border-b border-gray-200 min-w-[600px]">
                <div className="font-semibold text-gray-900">Page/Resource</div>
                <div className="font-semibold text-gray-900 text-center">Read</div>
                <div className="font-semibold text-gray-900 text-center">Write</div>
                <div className="font-semibold text-gray-900 text-center">Delete</div>
              </div>

              {/* Permission Rows */}
              <div className="min-w-[600px]">
                {Object.values(PageResource).map((resource, index) => (
                  <div
                    key={resource}
                    className={`grid grid-cols-4 gap-4 p-4 ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    } hover:bg-purple-50 transition-colors border-b border-gray-100`}
                  >
                    <div className="text-gray-900 font-medium">
                      {resource.replace(/_/g, ' ')}
                    </div>
                    <div className="flex justify-center">
                      <Switch
                        checked={getPermissionValue(resource, 'canRead')}
                        onCheckedChange={(value) =>
                          updatePermission(selectedMember.id, resource, 'canRead', value)
                        }
                      />
                    </div>
                    <div className="flex justify-center">
                      <Switch
                        checked={getPermissionValue(resource, 'canWrite')}
                        onCheckedChange={(value) =>
                          updatePermission(selectedMember.id, resource, 'canWrite', value)
                        }
                      />
                    </div>
                    <div className="flex justify-center">
                      <Switch
                        checked={getPermissionValue(resource, 'canDelete')}
                        onCheckedChange={(value) =>
                          updatePermission(selectedMember.id, resource, 'canDelete', value)
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
