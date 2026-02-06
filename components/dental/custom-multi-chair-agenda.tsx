/**
 * Custom Multi-Chair Agenda Component
 * Exact match to image - tabs, timeline, colored appointment blocks
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
    { chair: 'Chair 1 - Ortho', time: '9:00 AM - 10:00 AM', patient: 'Emily White', procedure: 'Ortho Adjustment', color: 'bg-green-100 border-green-300' },
    { chair: 'Chair 2 - Hygiene', time: '10:30 AM - 11:30 AM', patient: 'Michael Brown', procedure: 'Prophylaxis', color: 'bg-teal-100 border-teal-300' },
    { chair: 'Chair 3 - Ortho', time: '10:00 AM - 11:00 AM', patient: 'Emily White', procedure: 'Ortho Adjustment', color: 'bg-green-100 border-green-300' },
    { chair: 'Chair 4 - Restorative', time: '10:30 AM - 11:30 AM', patient: 'Michael Brown', procedure: 'Prophylaxis', color: 'bg-teal-100 border-teal-300' },
  ];

  const appointments = propAppointments && propAppointments.length > 0 ? propAppointments : defaultAppointments;

  const timeSlots = ['9:00', '9:30', '10:00', '10:30', '11 AM', '12:50', '1 PM', '4 PM'];

  const filteredAppointments = appointments.filter((apt) => {
    if (activeTab === 'ortho') return apt.chair.includes('Ortho');
    if (activeTab === 'hygiene') return apt.chair.includes('Hygiene');
    if (activeTab === 'restorative') return apt.chair.includes('Restorative');
    return true;
  });

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
      <div className="flex items-center gap-2 mb-2">
        <div className="w-24 text-xs text-gray-600">Chair</div>
        <div className="flex-1 flex gap-1">
          {timeSlots.map((time) => (
            <div key={time} className="flex-1 text-[10px] text-gray-600 text-center">
              {time}
            </div>
          ))}
        </div>
      </div>

      {/* Chairs with Timeline */}
      {[
        { id: 'chair-1', name: 'Chair 1 - Ortho', type: 'ortho' },
        { id: 'chair-2', name: 'Chair 2 - Hygiene', type: 'hygiene' },
        { id: 'chair-3', name: 'Chair 3 - Ortho', type: 'ortho' },
        { id: 'chair-4', name: 'Chair 4 - Restorative', type: 'restorative' },
      ]
        .filter((chair) => {
          if (activeTab === 'ortho') return chair.type === 'ortho';
          if (activeTab === 'hygiene') return chair.type === 'hygiene';
          if (activeTab === 'restorative') return chair.type === 'restorative';
          return true;
        })
        .map((chair) => {
          const chairAppointments = filteredAppointments.filter((apt) => apt.chair === chair.name);
          return (
            <div key={chair.id} className="flex items-center gap-2">
              <div className="w-24 text-xs font-medium text-gray-900">{chair.name}</div>
              <div className="flex-1 relative h-12 border border-gray-200 rounded">
                {chairAppointments.map((apt, idx) => {
                  // Calculate position based on time
                  const startTime = apt.time.split(' - ')[0];
                  const timeIndex = timeSlots.findIndex((t) => startTime.includes(t.replace(' AM', '').replace(' PM', '')));
                  const leftPercent = (timeIndex / timeSlots.length) * 100;
                  const widthPercent = 25; // Approximate width

                  return (
                    <div
                      key={idx}
                      className={`absolute top-0 bottom-0 ${apt.color} border-2 rounded p-1 flex flex-col justify-center`}
                      style={{
                        left: `${leftPercent}%`,
                        width: `${widthPercent}%`,
                      }}
                    >
                      <div className="text-[10px] font-medium text-gray-900">{apt.time}</div>
                      <div className="text-[10px] text-gray-700">{apt.patient}</div>
                      <div className="text-[10px] text-gray-600">({apt.procedure})</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

      {/* Sort By */}
      <div className="flex justify-end">
        <Select defaultValue="time">
          <SelectTrigger className="h-7 text-xs w-32 border border-gray-300">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="time">Sort by: Time</SelectItem>
            <SelectItem value="patient">Sort by: Patient</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
