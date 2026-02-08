/**
 * Redesigned Treatment Plan Builder Component
 * Exact match to image - treatment items with icons, costs in colored boxes, timeline progress bars
 */

'use client';

import { ClipboardList, Toothbrush, Tooth } from 'lucide-react';
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
  // Mock data matching image exactly
  const defaultTreatments: TreatmentItem[] = [
    {
      code: 'D0150',
      name: 'Comprehensive Oral Eval',
      cost: 120,
      timeline: 'Week 1',
      costColor: 'bg-green-100 text-green-700 border-green-200',
      icon: ClipboardList,
      progress: 100,
    },
    {
      code: 'D1110',
      name: 'Prophylaxis - Adult',
      cost: 150,
      timeline: 'Week 2',
      costColor: 'bg-orange-100 text-orange-700 border-orange-200',
      icon: Toothbrush,
      progress: 50,
    },
    {
      code: 'D2740',
      name: 'Crown - Porcelain/Ceramic',
      cost: 1200,
      timeline: 'Weeks 3-4',
      costColor: 'bg-gray-100 text-gray-700 border-gray-200',
      icon: Tooth,
      progress: 25,
    },
  ];

  const displayTreatments = treatments && treatments.length > 0 ? treatments : defaultTreatments;

  return (
    <div className="space-y-3">
      {displayTreatments.map((treatment, idx) => {
        const IconComponent = treatment.icon;
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
