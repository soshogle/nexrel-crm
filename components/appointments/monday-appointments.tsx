/**
 * Monday.com-style Appointments Board
 * Modern table-based appointment management
 */

'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Plus, 
  Search, 
  ChevronDown, 
  ChevronRight,
  MoreHorizontal,
  Calendar,
  Clock,
  User,
  MapPin,
  Video,
  Phone,
  CheckCircle2,
  XCircle,
  Loader2,
  GripVertical,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface Appointment {
  id: string;
  title: string;
  description?: string;
  status: string;
  startTime: string;
  endTime: string;
  type: string;
  location?: string;
  meetingUrl?: string;
  contact?: { id: string; name: string; email: string };
  createdAt: string;
}

interface MondayAppointmentsProps {
  isAdmin?: boolean;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  'SCHEDULED': { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', dot: 'bg-blue-500' },
  'CONFIRMED': { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', dot: 'bg-green-500' },
  'IN_PROGRESS': { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', dot: 'bg-purple-500' },
  'COMPLETED': { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300', dot: 'bg-gray-500' },
  'CANCELLED': { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', dot: 'bg-red-500' },
  'NO_SHOW': { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', dot: 'bg-orange-500' },
};

const TYPE_ICONS: Record<string, any> = {
  'IN_PERSON': MapPin,
  'VIDEO': Video,
  'PHONE': Phone,
};

export default function MondayAppointments({ isAdmin = false }: MondayAppointmentsProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'all' | 'today' | 'upcoming' | 'past'>('upcoming');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newAppointment, setNewAppointment] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    type: 'VIDEO',
    location: '',
  });

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const res = await fetch('/api/appointments');
      if (res.ok) {
        const data = await res.json();
        setAppointments(data.appointments || []);
      }
    } catch (e) {
      console.error('Failed to fetch appointments', e);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    if (!isAdmin) {
      toast.error('Only admins can modify appointments');
      return;
    }
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        toast.success('Status updated');
        fetchAppointments();
      }
    } catch (e) {
      toast.error('Failed to update');
    }
  };

  const createAppointment = async () => {
    if (!newAppointment.title || !newAppointment.startTime) {
      toast.error('Title and start time required');
      return;
    }
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newAppointment,
          endTime: newAppointment.endTime || new Date(new Date(newAppointment.startTime).getTime() + 60 * 60 * 1000).toISOString(),
          status: 'SCHEDULED'
        })
      });
      if (res.ok) {
        toast.success('Appointment created');
        setShowCreateDialog(false);
        setNewAppointment({ title: '', description: '', startTime: '', endTime: '', type: 'VIDEO', location: '' });
        fetchAppointments();
      }
    } catch (e) {
      toast.error('Failed to create appointment');
    }
  };

  const deleteAppointment = async (id: string) => {
    if (!isAdmin) return;
    try {
      const res = await fetch(`/api/appointments/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Appointment deleted');
        fetchAppointments();
      }
    } catch (e) {
      toast.error('Failed to delete');
    }
  };

  // Filter appointments by view mode
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

  const filteredAppointments = appointments
    .filter(apt => {
      const aptDate = new Date(apt.startTime);
      switch (viewMode) {
        case 'today':
          return aptDate >= today && aptDate < tomorrow;
        case 'upcoming':
          return aptDate >= today;
        case 'past':
          return aptDate < today;
        default:
          return true;
      }
    })
    .filter(apt =>
      apt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.contact?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  // Group by date
  const groupedByDate = filteredAppointments.reduce((acc, apt) => {
    const date = new Date(apt.startTime).toDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(apt);
    return acc;
  }, {} as Record<string, Appointment[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search appointments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex rounded-lg border overflow-hidden">
            {(['upcoming', 'today', 'past', 'all'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  viewMode === mode 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-background hover:bg-muted'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchAppointments}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          {isAdmin && (
            <Button size="sm" onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-1" />
              New Appointment
            </Button>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <div className="text-2xl font-bold text-blue-600">{appointments.filter(a => a.status === 'SCHEDULED').length}</div>
          <div className="text-xs text-blue-600/70">Scheduled</div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
          <div className="text-2xl font-bold text-green-600">{appointments.filter(a => a.status === 'CONFIRMED').length}</div>
          <div className="text-xs text-green-600/70">Confirmed</div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-900/20 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-gray-600">{appointments.filter(a => a.status === 'COMPLETED').length}</div>
          <div className="text-xs text-gray-500">Completed</div>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
          <div className="text-2xl font-bold text-red-600">{appointments.filter(a => ['CANCELLED', 'NO_SHOW'].includes(a.status)).length}</div>
          <div className="text-xs text-red-600/70">Cancelled/No-show</div>
        </div>
      </div>

      {/* Monday-style Table */}
      <div className="border rounded-lg overflow-hidden bg-background">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-muted/50 border-b text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <div className="col-span-4">Appointment</div>
          <div className="col-span-2 text-center">Date & Time</div>
          <div className="col-span-2 text-center">Status</div>
          <div className="col-span-2 text-center">Type</div>
          <div className="col-span-2 text-center">Actions</div>
        </div>

        {/* Grouped by Date */}
        {Object.keys(groupedByDate).length === 0 ? (
          <div className="px-4 py-12 text-center text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No appointments found</p>
          </div>
        ) : (
          Object.entries(groupedByDate).map(([date, dateAppointments]) => (
            <div key={date} className="border-b last:border-b-0">
              {/* Date Header */}
              <div className="px-4 py-2 bg-muted/30 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">
                  {new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </span>
                <Badge variant="secondary" className="text-xs">{dateAppointments.length}</Badge>
                {date === today.toDateString() && (
                  <Badge className="bg-primary text-xs">Today</Badge>
                )}
              </div>

              {/* Appointments */}
              {dateAppointments.map((apt) => {
                const colors = STATUS_COLORS[apt.status] || STATUS_COLORS['SCHEDULED'];
                const TypeIcon = TYPE_ICONS[apt.type] || Calendar;

                return (
                  <div 
                    key={apt.id} 
                    className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-muted/20 border-l-4 border-l-primary/30"
                  >
                    {/* Appointment Title */}
                    <div className="col-span-4 flex items-center gap-3">
                      <GripVertical className="h-4 w-4 text-muted-foreground/40" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{apt.title}</p>
                        {apt.contact && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {apt.contact.name}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Date & Time */}
                    <div className="col-span-2 text-center">
                      <div className="text-sm font-medium">
                        {new Date(apt.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {apt.endTime && `to ${new Date(apt.endTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`}
                      </div>
                    </div>

                    {/* Status Dropdown */}
                    <div className="col-span-2 flex justify-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild disabled={!isAdmin}>
                          <button className={`px-3 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text} hover:opacity-80`}>
                            <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${colors.dot}`} />
                            {apt.status.replace('_', ' ')}
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          {Object.keys(STATUS_COLORS).map(s => (
                            <DropdownMenuItem key={s} onClick={() => updateStatus(apt.id, s)}>
                              <div className={`w-2 h-2 rounded-full mr-2 ${STATUS_COLORS[s]?.dot}`} />
                              {s.replace('_', ' ')}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Type */}
                    <div className="col-span-2 flex justify-center">
                      <Badge variant="outline" className="text-xs">
                        <TypeIcon className="h-3 w-3 mr-1" />
                        {apt.type.replace('_', ' ')}
                      </Badge>
                    </div>

                    {/* Actions */}
                    <div className="col-span-2 flex justify-center gap-1">
                      {apt.meetingUrl && (
                        <Button variant="ghost" size="sm" asChild>
                          <a href={apt.meetingUrl} target="_blank" rel="noopener noreferrer">
                            <Video className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      {isAdmin && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => updateStatus(apt.id, 'CONFIRMED')}>
                              <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                              Confirm
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateStatus(apt.id, 'COMPLETED')}>
                              <CheckCircle2 className="h-4 w-4 mr-2 text-gray-500" />
                              Mark Complete
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateStatus(apt.id, 'CANCELLED')} className="text-red-600">
                              <XCircle className="h-4 w-4 mr-2" />
                              Cancel
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => deleteAppointment(apt.id)} className="text-red-600">
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Appointment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={newAppointment.title}
                onChange={(e) => setNewAppointment(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Meeting with..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time *</Label>
                <Input
                  type="datetime-local"
                  value={newAppointment.startTime}
                  onChange={(e) => setNewAppointment(prev => ({ ...prev, startTime: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input
                  type="datetime-local"
                  value={newAppointment.endTime}
                  onChange={(e) => setNewAppointment(prev => ({ ...prev, endTime: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <select
                value={newAppointment.type}
                onChange={(e) => setNewAppointment(prev => ({ ...prev, type: e.target.value }))}
                className="w-full h-10 px-3 border rounded-md bg-background"
              >
                <option value="VIDEO">Video Call</option>
                <option value="PHONE">Phone Call</option>
                <option value="IN_PERSON">In Person</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Location / Meeting URL</Label>
              <Input
                value={newAppointment.location}
                onChange={(e) => setNewAppointment(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Zoom link or address"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newAppointment.description}
                onChange={(e) => setNewAppointment(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Meeting notes..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={createAppointment}>Create Appointment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
