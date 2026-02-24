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
import { DateTimePicker } from '@/components/ui/datetime-picker';
import { PlaceAutocomplete } from '@/components/ui/place-autocomplete';

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
  'SCHEDULED': { bg: 'bg-blue-500/20', text: 'text-blue-700', dot: 'bg-blue-500' },
  'CONFIRMED': { bg: 'bg-green-500/20', text: 'text-green-700', dot: 'bg-green-500' },
  'IN_PROGRESS': { bg: 'bg-purple-500/20', text: 'text-purple-700', dot: 'bg-purple-500' },
  'COMPLETED': { bg: 'bg-purple-600', text: 'text-white', dot: 'bg-purple-500' },
  'CANCELLED': { bg: 'bg-red-500/20', text: 'text-red-700', dot: 'bg-red-500' },
  'NO_SHOW': { bg: 'bg-orange-500/20', text: 'text-orange-700', dot: 'bg-orange-500' },
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search appointments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white/80 border border-purple-200 text-gray-900 placeholder:text-gray-500 focus:border-purple-300"
            />
          </div>
          <div className="flex rounded-lg border border-purple-200 overflow-hidden bg-white/80">
            {(['upcoming', 'today', 'past', 'all'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  viewMode === mode 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-transparent hover:bg-purple-50 text-gray-700'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchAppointments} className="border-purple-200 text-gray-700 hover:bg-purple-50 hover:border-purple-300">
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          {isAdmin && (
            <Button size="sm" onClick={() => setShowCreateDialog(true)} className="bg-purple-600 hover:bg-purple-700 text-white">
              <Plus className="h-4 w-4 mr-1" />
              New Appointment
            </Button>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        <div className="border-2 border-purple-200/50 bg-white/80 rounded-lg p-4 shadow-sm">
          <div className="text-2xl font-bold text-gray-900 antialiased">{appointments.filter(a => a.status === 'SCHEDULED').length}</div>
          <div className="text-xs font-semibold text-gray-700 antialiased">Scheduled</div>
        </div>
        <div className="border-2 border-purple-200/50 bg-white/80 rounded-lg p-4 shadow-sm">
          <div className="text-2xl font-bold text-gray-900 antialiased">{appointments.filter(a => a.status === 'CONFIRMED').length}</div>
          <div className="text-xs font-semibold text-gray-700 antialiased">Confirmed</div>
        </div>
        <div className="border-2 border-purple-200/50 bg-white/80 rounded-lg p-4 shadow-sm">
          <div className="text-2xl font-bold text-gray-900 antialiased">{appointments.filter(a => a.status === 'COMPLETED').length}</div>
          <div className="text-xs font-semibold text-gray-700 antialiased">Completed</div>
        </div>
        <div className="border-2 border-purple-200/50 bg-white/80 rounded-lg p-4 shadow-sm">
          <div className="text-2xl font-bold text-gray-900 antialiased">{appointments.filter(a => ['CANCELLED', 'NO_SHOW'].includes(a.status)).length}</div>
          <div className="text-xs font-semibold text-gray-700 antialiased">Cancelled/No-show</div>
        </div>
      </div>

      {/* Monday-style Table */}
      <div className="border-2 border-purple-200/50 rounded-lg overflow-hidden bg-white/80 backdrop-blur-sm shadow-sm">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-purple-50/80 border-b border-purple-200/50 text-xs font-semibold text-gray-700 uppercase tracking-wider antialiased">
          <div className="col-span-4">Appointment</div>
          <div className="col-span-2 text-center">Date & Time</div>
          <div className="col-span-2 text-center">Status</div>
          <div className="col-span-2 text-center">Type</div>
          <div className="col-span-2 text-center">Actions</div>
        </div>

        {/* Grouped by Date */}
        {Object.keys(groupedByDate).length === 0 ? (
          <div className="px-4 py-12 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30 text-purple-500" />
            <p className="font-semibold text-gray-700 antialiased">No appointments found</p>
          </div>
        ) : (
          Object.entries(groupedByDate).map(([date, dateAppointments]) => (
            <div key={date} className="border-b border-purple-200/50 last:border-b-0">
              {/* Date Header */}
              <div className="px-4 py-2 bg-purple-50/80 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-purple-600" />
                <span className="font-semibold text-sm text-gray-900 antialiased">
                  {new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </span>
                <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700 border-purple-200">{dateAppointments.length}</Badge>
                {date === today.toDateString() && (
                  <Badge className="bg-purple-600 text-white text-xs">Today</Badge>
                )}
              </div>

              {/* Appointments */}
              {dateAppointments.map((apt) => {
                const colors = STATUS_COLORS[apt.status] || STATUS_COLORS['SCHEDULED'];
                const TypeIcon = TYPE_ICONS[apt.type] || Calendar;

                return (
                  <div 
                    key={apt.id} 
                    className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-purple-50/50 border-l-4 border-l-purple-300 transition-colors"
                  >
                    {/* Appointment Title */}
                    <div className="col-span-4 flex items-center gap-3">
                      <GripVertical className="h-4 w-4 text-gray-500" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate text-gray-900 antialiased">{apt.title}</p>
                        {apt.contact && (
                          <p className="text-xs font-medium text-gray-700 flex items-center gap-1 antialiased">
                            <User className="h-3 w-3" />
                            {apt.contact.name}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Date & Time */}
                    <div className="col-span-2 text-center">
                      <div className="text-sm font-semibold text-gray-900 antialiased">
                        {new Date(apt.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="text-xs font-medium text-gray-700 antialiased">
                        {apt.endTime && `to ${new Date(apt.endTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`}
                      </div>
                    </div>

                    {/* Status Dropdown */}
                    <div className="col-span-2 flex justify-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild disabled={!isAdmin}>
                          <button className={`px-3 py-1 rounded-full text-xs font-semibold border antialiased ${colors.bg} ${colors.text} border-purple-200 hover:opacity-80`}>
                            <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${colors.dot}`} />
                            {apt.status.replace('_', ' ')}
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-white/95 border border-purple-200/50 backdrop-blur-sm">
                          {Object.keys(STATUS_COLORS).map(s => (
                            <DropdownMenuItem key={s} onClick={() => updateStatus(apt.id, s)} className="text-gray-900 hover:bg-purple-50">
                              <div className={`w-2 h-2 rounded-full mr-2 ${STATUS_COLORS[s]?.dot}`} />
                              {s.replace('_', ' ')}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Type */}
                    <div className="col-span-2 flex justify-center">
                      <Badge variant="outline" className="text-xs font-semibold border-purple-200 text-gray-700 bg-purple-50/50 antialiased">
                        <TypeIcon className="h-3 w-3 mr-1" />
                        {apt.type.replace('_', ' ')}
                      </Badge>
                    </div>

                    {/* Actions */}
                    <div className="col-span-2 flex justify-center gap-1">
                      {apt.meetingUrl && (
                        <Button variant="ghost" size="sm" asChild className="hover:bg-purple-50 border border-purple-200">
                          <a href={apt.meetingUrl} target="_blank" rel="noopener noreferrer">
                            <Video className="h-4 w-4 text-purple-600" />
                          </a>
                        </Button>
                      )}
                      {isAdmin && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-purple-50 border border-purple-200">
                              <MoreHorizontal className="h-4 w-4 text-gray-600" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-white/95 border border-purple-200/50 backdrop-blur-sm">
                            <DropdownMenuItem onClick={() => updateStatus(apt.id, 'CONFIRMED')} className="text-gray-900 hover:bg-green-50">
                              <CheckCircle2 className="h-4 w-4 mr-2 text-green-400" />
                              Confirm
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateStatus(apt.id, 'COMPLETED')} className="text-gray-900 hover:bg-purple-50">
                              <CheckCircle2 className="h-4 w-4 mr-2 text-gray-600" />
                              Mark Complete
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateStatus(apt.id, 'CANCELLED')} className="text-red-600 hover:bg-red-50">
                              <XCircle className="h-4 w-4 mr-2" />
                              Cancel
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => deleteAppointment(apt.id)} className="text-red-600 hover:bg-red-50">
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
      <Dialog open={showCreateDialog} onOpenChange={(open) => {
        setShowCreateDialog(open);
        if (open && !newAppointment.startTime) {
          const now = new Date();
          const start = new Date(now);
          start.setHours(9, 0, 0, 0);
          const end = new Date(start.getTime() + 60 * 60 * 1000);
          setNewAppointment(prev => ({
            ...prev,
            startTime: start.toISOString().slice(0, 16),
            endTime: end.toISOString().slice(0, 16),
          }));
        }
      }}>
        <DialogContent className="bg-white/95 border-2 border-purple-200/50 backdrop-blur-sm">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Create Appointment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-gray-700">Title *</Label>
              <Input
                value={newAppointment.title}
                onChange={(e) => setNewAppointment(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Meeting with..."
                className="bg-white/80 border border-purple-200 text-gray-900 placeholder:text-gray-500 focus:border-purple-300"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-700">Start Time *</Label>
                <DateTimePicker
                  value={newAppointment.startTime}
                  onChange={(v) => setNewAppointment(prev => ({ ...prev, startTime: v }))}
                  min={new Date().toISOString().slice(0, 16)}
                  placeholder="Select start date & time"
                  triggerClassName="bg-white/80 border border-purple-200 text-gray-900 hover:bg-purple-50 hover:border-purple-300"
                  timeInputClassName="bg-white/80 border border-purple-200 text-gray-900"
                  popoverClassName="bg-white/95 border border-purple-200"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-700">End Time</Label>
                <DateTimePicker
                  value={newAppointment.endTime}
                  onChange={(v) => setNewAppointment(prev => ({ ...prev, endTime: v }))}
                  min={newAppointment.startTime || new Date().toISOString().slice(0, 16)}
                  placeholder="Select end date & time"
                  triggerClassName="bg-white/80 border border-purple-200 text-gray-900 hover:bg-purple-50 hover:border-purple-300"
                  timeInputClassName="bg-white/80 border border-purple-200 text-gray-900"
                  popoverClassName="bg-white/95 border border-purple-200"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-700">Type</Label>
              <select
                value={newAppointment.type}
                onChange={(e) => setNewAppointment(prev => ({ ...prev, type: e.target.value }))}
                className="w-full h-10 px-3 border border-purple-200 rounded-md bg-white/80 text-gray-900 focus:border-purple-300"
              >
                <option value="VIDEO">Video Call</option>
                <option value="PHONE">Phone Call</option>
                <option value="IN_PERSON">In Person</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-700">Location / Address</Label>
              <PlaceAutocomplete
                value={newAppointment.location}
                onChange={(val) => setNewAppointment(prev => ({ ...prev, location: val }))}
                placeholder="Search address or paste meeting link"
                types="geocode"
                className="bg-white/80 border border-purple-200 text-gray-900 placeholder:text-gray-500 focus:border-purple-300"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-700">Description</Label>
              <Textarea
                value={newAppointment.description}
                onChange={(e) => setNewAppointment(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Meeting notes..."
                rows={3}
                className="bg-white/80 border border-purple-200 text-gray-900 placeholder:text-gray-500 focus:border-purple-300"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="border-purple-200 text-gray-700 hover:bg-purple-50 hover:border-purple-300">Cancel</Button>
            <Button onClick={createAppointment} className="bg-purple-600 hover:bg-purple-700 text-white">Create Appointment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
