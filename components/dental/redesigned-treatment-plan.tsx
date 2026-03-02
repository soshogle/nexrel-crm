/**
 * Redesigned Treatment Plan Builder Component
 * Exact match to image - treatment items with icons, costs in colored boxes, timeline progress bars
 */

'use client';

import { ClipboardList } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface TreatmentItem {
  code: string;
  name: string;
  cost: number;
  timeline: string;
  costColor: string;
  icon: any;
  progress: number;
}

interface RedesignedTreatmentPlanProps {
  treatments?: TreatmentItem[];
}

export function RedesignedTreatmentPlan({ treatments }: RedesignedTreatmentPlanProps) {
  const displayTreatments = treatments && treatments.length > 0 ? treatments.filter(Boolean) : [];

  return (
    <div className="space-y-3">
      {displayTreatments.length === 0 && (
        <div className="text-xs text-gray-500 p-3 border border-dashed rounded-lg">
          No treatment plans available
        </div>
      )}
      {displayTreatments.map((treatment, idx) => {
        if (!treatment) return null;
        const IconComponent = treatment.icon || ClipboardList;
        return (
          <div key={idx} className="border border-gray-200 rounded-lg p-3 bg-white">
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded flex-shrink-0">
                <IconComponent className="w-5 h-5 text-gray-600" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-gray-900 mb-1">{treatment.code}</div>
                <div className="text-xs text-gray-600 mb-2">{treatment.name}</div>
                
                {/* Timeline Progress Bar */}
                <div className="mb-2">
                  <div className="text-xs text-gray-500 mb-1">Timeline: {treatment.timeline}</div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${treatment.progress}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Cost Badge */}
              <Badge className={`text-xs px-2 py-1 ${treatment.costColor} border-0 font-semibold whitespace-nowrap`}>
                Cost: ${treatment.cost}
              </Badge>
            </div>
          </div>
        );
      })}
    </div>
  );
}
