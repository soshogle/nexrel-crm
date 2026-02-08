/**
 * Redesigned Procedures Activity Log Component
 * Exact match to image - table format with Time, Patient (avatar), Procedure, Status
 */

'use client';

import { User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Procedure {
  time: string;
  patient: string;
  procedure: string;
  status: string;
}

interface RedesignedProceduresLogProps {
  procedures?: Procedure[];
}

export function RedesignedProceduresLog({ procedures = [] }: RedesignedProceduresLogProps) {
  // Mock data matching image
  const defaultProcedures: Procedure[] = [
    { time: '10:00 AM', patient: 'Sarah Jones', procedure: 'Orthodontic Adjustment', status: 'Online' },
    { time: '10:30 AM', patient: 'Michael Brown', procedure: 'Prophylaxis', status: 'Restorative' },
    { time: '11:00 AM', patient: 'Lola Rome', procedure: 'Restorative', status: 'Restorative' },
    { time: '11:30 AM', patient: 'Shemb Joes', procedure: 'Orthodontic Adjustment', status: 'Closed' },
  ];

  const displayProcedures = procedures.length > 0 ? procedures : defaultProcedures;

  const getStatusColor = (status: string) => {
    if (status === 'Online') return 'bg-green-100 text-green-700 border-green-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  return (
    <div className="space-y-2">
      {/* Table Header */}
      <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-700 border-b border-gray-200 pb-1">
        <div className="col-span-2">Time</div>
        <div className="col-span-4">Patient</div>
        <div className="col-span-4">Procedure</div>
        <div className="col-span-2">Status</div>
      </div>

      {/* Table Rows */}
      {displayProcedures.slice(0, 4).map((proc, idx) => (
        <div key={idx} className="grid grid-cols-12 gap-2 items-center text-xs border-b border-gray-100 pb-2">
          <div className="col-span-2 text-gray-600 font-medium">{proc.time}</div>
          <div className="col-span-4 flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-purple-200 flex items-center justify-center flex-shrink-0">
              <User className="w-3 h-3 text-purple-600" />
            </div>
            <span className="font-medium text-gray-900 truncate">{proc.patient}</span>
          </div>
          <div className="col-span-4 text-gray-600 truncate">{proc.procedure}</div>
          <div className="col-span-2">
            <Badge className={`text-xs px-2 py-0.5 ${getStatusColor(proc.status)} border-0`}>
              {proc.status}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}
