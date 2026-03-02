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
  const displayProcedures = procedures.length > 0 ? procedures : [];

  const getStatusColor = (status: string) => {
    if (status === 'Online') return 'bg-green-100 text-green-700 border-green-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  return (
    <div className="space-y-2 min-w-0 overflow-hidden">
      {/* Table Header */}
      <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,2fr)_minmax(0,2fr)_minmax(0,1.2fr)] gap-2 text-xs font-semibold text-gray-700 border-b border-gray-200 pb-1">
        <div className="min-w-0">Time</div>
        <div className="min-w-0">Patient</div>
        <div className="min-w-0">Procedure</div>
        <div className="min-w-0">Status</div>
      </div>

      {/* Table Rows - min-w-0 prevents grid blowout, truncate prevents overlap */}
      {displayProcedures.length === 0 && (
        <div className="text-xs text-gray-500 py-3">No procedures logged yet</div>
      )}
      {displayProcedures.slice(0, 4).map((proc, idx) => (
        <div key={idx} className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,2fr)_minmax(0,2fr)_minmax(0,1.2fr)] gap-2 items-center text-xs border-b border-gray-100 pb-2 min-w-0">
          <div className="text-gray-600 font-medium min-w-0 truncate">{proc.time}</div>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-full bg-purple-200 flex items-center justify-center flex-shrink-0">
              <User className="w-3 h-3 text-purple-600" />
            </div>
            <span className="font-medium text-gray-900 truncate min-w-0">{proc.patient}</span>
          </div>
          <div className="text-gray-600 truncate min-w-0" title={proc.procedure}>{proc.procedure}</div>
          <div className="min-w-0 flex justify-end overflow-hidden">
            <Badge className={`text-xs px-2 py-0.5 min-w-0 truncate ${getStatusColor(proc.status)} border-0`} title={proc.status}>
              {proc.status}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}
