/**
 * Custom Multi-Chair Agenda Component V2
 * EXACT match to image - color-coded tabs (blue/teal/yellow), timeline blocks
 */

'use client';

import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Appointment {
  chair: string;
  time: string;
  patient: string;
  procedure: string;
  color: string;
}

interface CustomMultiChairAgendaProps {
  appointments?: Appointment[];
}

export function CustomMultiChairAgenda({ appointments: propAppointments }: CustomMultiChairAgendaProps) {
  const [activeTab, setActiveTab] = useState<'ortho' | 'hygiene' | 'restorative'>('ortho');

  const defaultAppointments: Appointment[] = [
    { chair: 'Chair 1', time: '9:00 AM - 10:00 AM', patient: 'Emily White', procedure: 'Ortho Adjustment', color: 'bg-blue-100 border-blue-400' },
    { chair: 'Chair 2', time: '10:30 AM - 11:30 AM', patient: 'Michael Brown', procedure: 'Prophylaxis', color: 'bg-teal-100 border-teal-400' },
    { chair: 'Chair 3', time: '10:00 AM - 11:00 AM', patient: 'Sarah Jones', procedure: 'Filling', color: 'bg-green-200 border-green-500' },
    { chair: 'Chair 4', time: '11:00 AM - 12:00 PM', patient: 'Michael Brown', procedure: 'Prophylaxis', color: 'bg-yellow-100 border-yellow-400' },
  ];

  const appointments = propAppointments && propAppointments.length > 0 ? propAppointments : defaultAppointments;
  const timeSlots = ['9:00', '9:30', '10:00', '10:30', '11 AM', '12:50', '1 PM', '4 PM'];

  return (
    <div className="space-y-3">
      {/* Tabs - EXACT colors from image */}
      <div className="flex gap-1 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('ortho')}
          className={`
            px-3 py-1.5 text-xs font-medium rounded-t-lg transition-colors relative
            ${activeTab === 'ortho'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }
          `}
        >
          <span className="inline-block w-2 h-2 rounded-full bg-blue-400 mr-1.5"></span>
          Ortho
        </button>
        <button
          onClick={() => setActiveTab('hygiene')}
          className={`
            px-3 py-1.5 text-xs font-medium rounded-t-lg transition-colors relative
            ${activeTab === 'hygiene'
              ? 'bg-teal-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }
          `}
        >
          <span className="inline-block w-2 h-2 rounded-full bg-teal-400 mr-1.5"></span>
          Hygiene
        </button>
        <button
          onClick={() => setActiveTab('restorative')}
          className={`
            px-3 py-1.5 text-xs font-medium rounded-t-lg transition-colors relative
            ${activeTab === 'restorative'
              ? 'bg-yellow-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }
          `}
        >
          <span className="inline-block w-2 h-2 rounded-full bg-yellow-400 mr-1.5"></span>
          Restorative
        </button>
      </div>

      {/* Sort By - EXACT match */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs text-gray-600">Sort by:</span>
        <Select defaultValue="essenger">
          <SelectTrigger className="w-28 h-7 text-[11px] border border-gray-300">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="essenger">essenger</SelectItem>
            <SelectItem value="time">Time</SelectItem>
            <SelectItem value="chair">Chair</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Timeline Grid - EXACT match */}
      <div className="space-y-1.5">
        {/* Time Header */}
        <div className="grid grid-cols-8 gap-1 text-[10px] text-gray-500 font-medium px-1">
          {timeSlots.map((time, idx) => (
            <div key={idx} className="text-center">{time}</div>
          ))}
        </div>

        {/* Appointment Blocks */}
        {appointments.map((apt, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <div 
              className={`
                px-2 py-1.5 rounded-md border-l-4 shadow-sm flex-1
                ${apt.color}
              `}
            >
              <div className="text-[11px] font-bold text-gray-900">{apt.chair}</div>
              <div className="text-[10px] text-gray-700">{apt.time}</div>
              <div className="text-[10px] text-gray-600">● {apt.patient}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Chair Count - Bottom right */}
      <div className="flex items-center justify-end text-[11px] text-gray-600">
        <span>4 Chairs</span>
      </div>
    </div>
  );
}
