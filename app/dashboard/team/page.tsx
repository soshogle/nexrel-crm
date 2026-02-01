'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Users, LayoutGrid, Plus, Mail, Phone, Edit, Trash2, BarChart3, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { InviteTeamMemberDialog } from '@/components/team/invite-team-member-dialog';
import { EditTeamMemberDialog } from '@/components/team/edit-team-member-dialog';
import { TeamWorkloadBoard } from '@/components/team/team-workload-board';

interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  phone?: string;
  _count: {
    assignedDeals: number;
    assignedTasks: number;
  };
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  assignedTo?: { id: string; name: string; email: string };
  assignedToId?: string;
  deal?: { title: string };
  lead?: { businessName: string };
}

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [membersRes, tasksRes] = await Promise.all([
        fetch('/api/team/members'),
        fetch('/api/team/tasks'),
      ]);

      if (membersRes.ok) setMembers(await membersRes.json());
      if (tasksRes.ok) setTasks(await tasksRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteSuccess = () => {
    setShowInviteDialog(false);
    fetchData();
    toast.success('Team member invited successfully');
  };

  const handleEditSuccess = () => {
    setShowEditDialog(false);
    setSelectedMember(null);
    fetchData();
    toast.success('Team member updated successfully');
  };

  const handleEdit = (member: TeamMember) => {
    setSelectedMember(member);
    setShowEditDialog(true);
  };

  const handleDelete = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this team member?')) return;

    try {
      const response = await fetch(`/api/team/members/${memberId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Team member removed successfully');
        fetchData();
      } else {
        toast.error('Failed to remove team member');
      }
    } catch (error) {
      console.error('Error deleting member:', error);
      toast.error('Failed to remove team member');
    }
  };

  const handleTaskUpdated = () => {
    fetchData();
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      OWNER: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      ADMIN: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      MANAGER: 'bg-green-500/20 text-green-300 border-green-500/30',
      AGENT: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
      VIEWER: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    };
    return colors[role] || colors.AGENT;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      ACTIVE: 'bg-green-500/20 text-green-300 border-green-500/30',
      INACTIVE: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
      INVITED: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    };
    return colors[status] || colors.INVITED;
  };

  // Calculate workload statistics
  const getWorkloadStats = (member: TeamMember) => {
    const memberTasks = tasks.filter(t => t.assignedToId === member.id);
    const completed = memberTasks.filter(t => t.status === 'COMPLETED').length;
    const inProgress = memberTasks.filter(t => t.status === 'IN_PROGRESS').length;
    const overdue = memberTasks.filter(t => 
      t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'COMPLETED'
    ).length;
    
    const totalWorkload = member._count.assignedTasks + member._count.assignedDeals;
    const capacity = totalWorkload > 10 ? 100 : (totalWorkload / 10) * 100;

    return { completed, inProgress, overdue, capacity };
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-800 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-800 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900/20 via-gray-900 to-blue-900/20 p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold gradient-text mb-2">Team Management</h1>
          <p className="text-gray-400">
            Manage team members, assign tasks, and track workload
          </p>
        </div>
        <Button 
          onClick={() => setShowInviteDialog(true)}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Invite Member
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Members</p>
                <p className="text-3xl font-bold text-white">{members.length}</p>
              </div>
              <div className="h-12 w-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Active Tasks</p>
                <p className="text-3xl font-bold text-white">{tasks.filter(t => t.status !== 'COMPLETED').length}</p>
              </div>
              <div className="h-12 w-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Clock className="h-6 w-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Completed</p>
                <p className="text-3xl font-bold text-white">{tasks.filter(t => t.status === 'COMPLETED').length}</p>
              </div>
              <div className="h-12 w-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Overdue</p>
                <p className="text-3xl font-bold text-white">
                  {tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'COMPLETED').length}
                </p>
              </div>
              <div className="h-12 w-12 bg-red-500/20 rounded-lg flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-gray-900 border-gray-800">
          <TabsTrigger value="overview" className="flex items-center gap-2 data-[state=active]:bg-purple-600">
            <Users className="h-4 w-4" />
            Team Overview
          </TabsTrigger>
          <TabsTrigger value="workload" className="flex items-center gap-2 data-[state=active]:bg-purple-600">
            <LayoutGrid className="h-4 w-4" />
            Workload Board
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2 data-[state=active]:bg-purple-600">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Team Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {members.length === 0 ? (
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="h-16 w-16 bg-purple-500/20 rounded-full flex items-center justify-center mb-4">
                  <Users className="h-8 w-8 text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-white">No team members yet</h3>
                <p className="text-gray-400 text-center mb-4">
                  Invite team members to collaborate on leads and deals
                </p>
                <Button 
                  onClick={() => setShowInviteDialog(true)}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Invite First Member
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {members.map((member) => {
                const stats = getWorkloadStats(member);
                return (
                  <Card key={member.id} className="bg-gray-900 border-gray-800 hover:border-purple-500/50 transition-colors">
                    <CardHeader>
                      <div className="flex items-start gap-3">
                        <Avatar className="h-12 w-12 border-2 border-purple-500/30">
                          <AvatarFallback className="bg-gradient-to-br from-purple-600 to-blue-600 text-white">
                            {member.name?.split(' ').map((n) => n[0]).join('') || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <CardTitle className="text-base text-white">{member.name || 'Unknown'}</CardTitle>
                          <div className="flex gap-2 mt-2 flex-wrap">
                            <Badge className={getRoleColor(member.role)} variant="outline">{member.role}</Badge>
                            <Badge className={getStatusColor(member.status)} variant="outline">
                              {member.status}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(member)}
                            className="h-8 w-8 p-0 hover:bg-purple-500/20"
                          >
                            <Edit className="h-4 w-4 text-gray-400" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(member.id)}
                            className="h-8 w-8 p-0 hover:bg-red-500/20"
                          >
                            <Trash2 className="h-4 w-4 text-gray-400" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Mail className="h-4 w-4" />
                          <span className="truncate">{member.email}</span>
                        </div>
                        {member.phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <Phone className="h-4 w-4" />
                            {member.phone}
                          </div>
                        )}
                      </div>

                      <div className="space-y-3 pt-3 border-t border-gray-800">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Workload Capacity</span>
                          <span className="font-semibold text-white">{Math.round(stats.capacity)}%</span>
                        </div>
                        <Progress value={stats.capacity} className="h-2" />

                        <div className="grid grid-cols-3 gap-2 text-center pt-2">
                          <div className="bg-green-500/10 rounded p-2">
                            <p className="text-xs text-gray-400">Completed</p>
                            <p className="text-lg font-bold text-green-400">{stats.completed}</p>
                          </div>
                          <div className="bg-blue-500/10 rounded p-2">
                            <p className="text-xs text-gray-400">In Progress</p>
                            <p className="text-lg font-bold text-blue-400">{stats.inProgress}</p>
                          </div>
                          <div className="bg-red-500/10 rounded p-2">
                            <p className="text-xs text-gray-400">Overdue</p>
                            <p className="text-lg font-bold text-red-400">{stats.overdue}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Workload Board Tab - Drag & Drop */}
        <TabsContent value="workload" className="space-y-6">
          <TeamWorkloadBoard 
            members={members}
            tasks={tasks}
            onTaskUpdated={handleTaskUpdated}
          />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {members.map((member) => {
              const stats = getWorkloadStats(member);
              const memberTasks = tasks.filter(t => t.assignedToId === member.id);
              const completionRate = memberTasks.length > 0 
                ? (stats.completed / memberTasks.length * 100).toFixed(0) 
                : 0;

              return (
                <Card key={member.id} className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border-2 border-purple-500/30">
                        <AvatarFallback className="bg-gradient-to-br from-purple-600 to-blue-600 text-white">
                          {member.name?.split(' ').map((n) => n[0]).join('') || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-base text-white">{member.name || 'Unknown'}</CardTitle>
                        <p className="text-sm text-gray-400">{member.role}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-400">Completion Rate</span>
                        <span className="font-semibold text-white">{completionRate}%</span>
                      </div>
                      <Progress value={Number(completionRate)} className="h-2" />
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-purple-500/10 rounded p-3">
                        <p className="text-gray-400 mb-1">Total Tasks</p>
                        <p className="text-2xl font-bold text-white">{memberTasks.length}</p>
                      </div>
                      <div className="bg-blue-500/10 rounded p-3">
                        <p className="text-gray-400 mb-1">Deals</p>
                        <p className="text-2xl font-bold text-white">{member._count.assignedDeals}</p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t border-gray-800">
                      <span className="text-sm text-gray-400">Capacity</span>
                      <Badge 
                        className={
                          stats.capacity > 90 
                            ? 'bg-red-500/20 text-red-300 border-red-500/30' 
                            : stats.capacity > 70 
                            ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                            : 'bg-green-500/20 text-green-300 border-green-500/30'
                        }
                        variant="outline"
                      >
                        {stats.capacity > 90 ? 'At Capacity' : stats.capacity > 70 ? 'Busy' : 'Available'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <InviteTeamMemberDialog 
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
        onSuccess={handleInviteSuccess}
      />

      {selectedMember && (
        <EditTeamMemberDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          member={selectedMember}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
}
