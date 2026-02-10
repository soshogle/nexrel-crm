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
  'SCHEDULED': { bg: 'bg-blue-500/20', text: 'text-blue-400', dot: 'bg-blue-500' },
  'CONFIRMED': { bg: 'bg-green-500/20', text: 'text-green-400', dot: 'bg-green-500' },
  'IN_PROGRESS': { bg: 'bg-purple-500/20', text: 'text-purple-400', dot: 'bg-purple-500' },
  'COMPLETED': { bg: 'bg-gray-500/20', text: 'text-gray-400', dot: 'bg-gray-500' },
  'CANCELLED': { bg: 'bg-red-500/20', text: 'text-red-400', dot: 'bg-red-500' },
  'NO_SHOW': { bg: 'bg-orange-500/20', text: 'text-orange-400', dot: 'bg-orange-500' },
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
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-300/60" />
            <Input
              placeholder="Search appointments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-black/40 border-purple-500/20 text-white placeholder:text-purple-300/40 focus:border-purple-500/40"
            />
          </div>
          <div className="flex rounded-lg border border-purple-500/20 overflow-hidden bg-black/40">
            {(['upcoming', 'today', 'past', 'all'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  viewMode === mode 
                    ? 'gradient-primary text-white shadow-lg shadow-purple-500/30' 
                    : 'bg-transparent hover:bg-purple-500/10 text-purple-300/70'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchAppointments} className="border-purple-500/20 text-purple-300 hover:border-purple-500 hover:bg-purple-500/10">
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          {isAdmin && (
            <Button size="sm" onClick={() => setShowCreateDialog(true)} className="gradient-primary text-white shadow-lg shadow-purple-500/30">
              <Plus className="h-4 w-4 mr-1" />
              New Appointment
            </Button>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-blue-500/20 rounded-lg p-4 border border-blue-500/30">
          <div className="text-2xl font-bold text-blue-400">{appointments.filter(a => a.status === 'SCHEDULED').length}</div>
          <div className="text-xs text-blue-300/70">Scheduled</div>
        </div>
        <div className="bg-green-500/20 rounded-lg p-4 border border-green-500/30">
          <div className="text-2xl font-bold text-green-400">{appointments.filter(a => a.status === 'CONFIRMED').length}</div>
          <div className="text-xs text-green-300/70">Confirmed</div>
        </div>
        <div className="bg-gray-500/20 rounded-lg p-4 border border-gray-500/30">
          <div className="text-2xl font-bold text-gray-400">{appointments.filter(a => a.status === 'COMPLETED').length}</div>
          <div className="text-xs text-gray-300/70">Completed</div>
        </div>
        <div className="bg-red-500/20 rounded-lg p-4 border border-red-500/30">
          <div className="text-2xl font-bold text-red-400">{appointments.filter(a => ['CANCELLED', 'NO_SHOW'].includes(a.status)).length}</div>
          <div className="text-xs text-red-300/70">Cancelled/No-show</div>
        </div>
      </div>

      {/* Monday-style Table */}
      <div className="border border-purple-500/20 rounded-lg overflow-hidden glass-effect shadow-xl">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-black/40 border-b border-purple-500/20 text-xs font-medium text-purple-300/80 uppercase tracking-wider">
          <div className="col-span-4">Appointment</div>
          <div className="col-span-2 text-center">Date & Time</div>
          <div className="col-span-2 text-center">Status</div>
          <div className="col-span-2 text-center">Type</div>
          <div className="col-span-2 text-center">Actions</div>
        </div>

        {/* Grouped by Date */}
        {Object.keys(groupedByDate).length === 0 ? (
          <div className="px-4 py-12 text-center text-purple-300/50">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30 text-purple-400" />
            <p>No appointments found</p>
          </div>
        ) : (
          Object.entries(groupedByDate).map(([date, dateAppointments]) => (
            <div key={date} className="border-b border-purple-500/20 last:border-b-0">
              {/* Date Header */}
              <div className="px-4 py-2 bg-black/20 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-purple-400" />
                <span className="font-semibold text-sm text-white">
                  {new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </span>
                <Badge variant="secondary" className="text-xs bg-purple-500/20 text-purple-300 border-purple-500/30">{dateAppointments.length}</Badge>
                {date === today.toDateString() && (
                  <Badge className="gradient-primary text-white text-xs shadow-lg shadow-purple-500/30">Today</Badge>
                )}
              </div>

              {/* Appointments */}
              {dateAppointments.map((apt) => {
                const colors = STATUS_COLORS[apt.status] || STATUS_COLORS['SCHEDULED'];
                const TypeIcon = TYPE_ICONS[apt.type] || Calendar;

                return (
                  <div 
                    key={apt.id} 
                    className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-purple-500/10 border-l-4 border-l-purple-500/30 transition-colors"
                  >
                    {/* Appointment Title */}
                    <div className="col-span-4 flex items-center gap-3">
                      <GripVertical className="h-4 w-4 text-purple-300/40" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate text-white">{apt.title}</p>
                        {apt.contact && (
                          <p className="text-xs text-purple-300/60 flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {apt.contact.name}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Date & Time */}
                    <div className="col-span-2 text-center">
                      <div className="text-sm font-medium text-white">
                        {new Date(apt.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="text-xs text-purple-300/60">
                        {apt.endTime && `to ${new Date(apt.endTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`}
                      </div>
                    </div>

                    {/* Status Dropdown */}
                    <div className="col-span-2 flex justify-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild disabled={!isAdmin}>
                          <button className={`px-3 py-1 rounded-full text-xs font-medium border ${colors.bg} ${colors.text} border-purple-500/30 hover:opacity-80`}>
                            <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${colors.dot}`} />
                            {apt.status.replace('_', ' ')}
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-black/90 border-purple-500/20">
                          {Object.keys(STATUS_COLORS).map(s => (
                            <DropdownMenuItem key={s} onClick={() => updateStatus(apt.id, s)} className="text-white hover:bg-purple-500/20">
                              <div className={`w-2 h-2 rounded-full mr-2 ${STATUS_COLORS[s]?.dot}`} />
                              {s.replace('_', ' ')}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Type */}
                    <div className="col-span-2 flex justify-center">
                      <Badge variant="outline" className="text-xs border-purple-500/30 text-purple-300 bg-purple-500/10">
                        <TypeIcon className="h-3 w-3 mr-1" />
                        {apt.type.replace('_', ' ')}
                      </Badge>
                    </div>

                    {/* Actions */}
                    <div className="col-span-2 flex justify-center gap-1">
                      {apt.meetingUrl && (
                        <Button variant="ghost" size="sm" asChild className="hover:bg-purple-500/20 border border-purple-500/20">
                          <a href={apt.meetingUrl} target="_blank" rel="noopener noreferrer">
                            <Video className="h-4 w-4 text-purple-400" />
                          </a>
                        </Button>
                      )}
                      {isAdmin && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-purple-500/20 border border-purple-500/20">
                              <MoreHorizontal className="h-4 w-4 text-purple-300" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-black/90 border-purple-500/20">
                            <DropdownMenuItem onClick={() => updateStatus(apt.id, 'CONFIRMED')} className="text-white hover:bg-green-500/20">
                              <CheckCircle2 className="h-4 w-4 mr-2 text-green-400" />
                              Confirm
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateStatus(apt.id, 'COMPLETED')} className="text-white hover:bg-gray-500/20">
                              <CheckCircle2 className="h-4 w-4 mr-2 text-gray-400" />
                              Mark Complete
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateStatus(apt.id, 'CANCELLED')} className="text-red-400 hover:bg-red-500/20">
                              <XCircle className="h-4 w-4 mr-2" />
                              Cancel
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => deleteAppointment(apt.id)} className="text-red-400 hover:bg-red-500/20">
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
        <DialogContent className="bg-black/95 border-purple-500/20 text-white">
          <DialogHeader>
            <DialogTitle className="gradient-text">Create Appointment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-purple-300">Title *</Label>
              <Input
                value={newAppointment.title}
                onChange={(e) => setNewAppointment(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Meeting with..."
                className="bg-black/40 border-purple-500/20 text-white placeholder:text-purple-300/40 focus:border-purple-500/40"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-purple-300">Start Time *</Label>
                <Input
                  type="datetime-local"
                  value={newAppointment.startTime}
                  onChange={(e) => setNewAppointment(prev => ({ ...prev, startTime: e.target.value }))}
                  className="bg-black/40 border-purple-500/20 text-white focus:border-purple-500/40"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-purple-300">End Time</Label>
                <Input
                  type="datetime-local"
                  value={newAppointment.endTime}
                  onChange={(e) => setNewAppointment(prev => ({ ...prev, endTime: e.target.value }))}
                  className="bg-black/40 border-purple-500/20 text-white focus:border-purple-500/40"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-purple-300">Type</Label>
              <select
                value={newAppointment.type}
                onChange={(e) => setNewAppointment(prev => ({ ...prev, type: e.target.value }))}
                className="w-full h-10 px-3 border border-purple-500/20 rounded-md bg-black/40 text-white focus:border-purple-500/40"
              >
                <option value="VIDEO">Video Call</option>
                <option value="PHONE">Phone Call</option>
                <option value="IN_PERSON">In Person</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-purple-300">Location / Meeting URL</Label>
              <Input
                value={newAppointment.location}
                onChange={(e) => setNewAppointment(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Zoom link or address"
                className="bg-black/40 border-purple-500/20 text-white placeholder:text-purple-300/40 focus:border-purple-500/40"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-purple-300">Description</Label>
              <Textarea
                value={newAppointment.description}
                onChange={(e) => setNewAppointment(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Meeting notes..."
                rows={3}
                className="bg-black/40 border-purple-500/20 text-white placeholder:text-purple-300/40 focus:border-purple-500/40"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="border-purple-500/20 text-purple-300 hover:border-purple-500 hover:bg-purple-500/10">Cancel</Button>
            <Button onClick={createAppointment} className="gradient-primary text-white shadow-lg shadow-purple-500/30">Create Appointment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
