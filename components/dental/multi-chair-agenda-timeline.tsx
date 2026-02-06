/**
 * Multi-Chair Agenda with Timeline
 * Exact match to image - tabs, timeline, colored appointment blocks
 */

'use client';

import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Stethoscope, Sparkles, Wrench } from 'lucide-react';

interface Appointment {
  chair: string;
  time: string;
  patient: string;
  procedure: string;
  color: string;
  type: 'ortho' | 'hygiene' | 'restorative';
}

export function MultiChairAgendaTimeline() {
  const [activeTab, setActiveTab] = useState<'ortho' | 'hygiene' | 'restorative'>('ortho');

  const appointments: Appointment[] = [
    { chair: 'Chair 1 - Ortho', time: '9:00 AM - 10:00 AM', patient: 'Emily White', procedure: 'Ortho Adjustment', color: 'bg-green-100 border-green-300', type: 'ortho' },
    { chair: 'Chair 2 - Hygiene', time: '10:30 AM - 11:30 AM', patient: 'Michael Brown', procedure: 'Prophylaxis', color: 'bg-teal-100 border-teal-300', type: 'hygiene' },
    { chair: 'Chair 3 - Ortho', time: '10:00 AM - 11:00 AM', patient: 'Emily White', procedure: 'Ortho Adjustment', color: 'bg-green-100 border-green-300', type: 'ortho' },
    { chair: 'Chair 4 - Restorative', time: '10:30 AM - 11:30 AM', patient: 'Michael Brown', procedure: 'Prophylaxis', color: 'bg-teal-100 border-teal-300', type: 'restorative' },
  ];

  const filteredAppointments = appointments.filter(apt => apt.type === activeTab);

  const timeSlots = ['9:00', '9:30', '10:00', '10:30', '11 AM', '12:50', '1PM', '4PM'];

  const getChairIcon = (chair: string) => {
    if (chair.includes('Ortho')) return <Sparkles className="w-4 h-4" />;
    if (chair.includes('Hygiene')) return <Calendar className="w-4 h-4" />;
    if (chair.includes('Restorative')) return <Wrench className="w-4 h-4" />;
    return <Stethoscope className="w-4 h-4" />;
  };

  return (
    <div className="space-y-3">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {(['ortho', 'hygiene', 'restorative'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1 text-xs font-medium capitalize ${
              activeTab === tab
                ? 'bg-purple-600 text-white rounded-t'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Timeline Header */}
      <div className="flex items-center justify-between text-[10px] text-gray-600 px-2">
        {timeSlots.map((time, idx) => (
          <div key={idx} className="text-center w-12">{time}</div>
        ))}
      </div>

      {/* Chairs with Appointments */}
      <div className="space-y-2">
        {filteredAppointments.map((apt, idx) => (
          <div key={idx} className={`border-2 rounded p-2 ${apt.color}`}>
            <div className="flex items-center gap-2 mb-1">
              {getChairIcon(apt.chair)}
              <div className="text-xs font-medium text-gray-900">{apt.chair}</div>
            </div>
            <div className="text-xs text-gray-700">
              {apt.time} {apt.patient} ({apt.procedure})
            </div>
          </div>
        ))}
      </div>

      {/* Sort By */}
      <div className="pt-2 border-t border-gray-200">
        <Select defaultValue="time">
          <SelectTrigger className="h-7 text-xs w-full border border-gray-300">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="time">Sort by: Time</SelectItem>
            <SelectItem value="patient">Sort by: Patient</SelectItem>
            <SelectItem value="procedure">Sort by: Procedure</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
