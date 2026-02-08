/**
 * Treatment Timeline Component
 * Phase 5: Visual timeline of treatment phases and milestones
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { Calendar, CheckCircle2, Clock, AlertCircle, ArrowRight } from 'lucide-react';
import { format, isPast, isFuture, differenceInDays } from 'date-fns';

interface TreatmentTimelineProps {
  leadId: string;
  treatmentPlanId?: string;
}

interface TimelinePhase {
  id: string;
  name: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  status: 'completed' | 'in-progress' | 'upcoming' | 'delayed';
  procedures: string[];
  milestones: Milestone[];
}

interface Milestone {
  id: string;
  name: string;
  date: Date;
  completed: boolean;
  description?: string;
}

export function TreatmentTimeline({ leadId, treatmentPlanId }: TreatmentTimelineProps) {
  const t = useTranslations('dental.treatmentTimeline');
  const [phases, setPhases] = useState<TimelinePhase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTimelineData();
  }, [leadId, treatmentPlanId]);

  const loadTimelineData = async () => {
    try {
      setLoading(true);
      // Fetch treatment plan
      const response = await fetch(`/api/dental/treatment-plans?leadId=${leadId}`);
      if (response.ok) {
        const data = await response.json();
        const plan = data.plans?.[0];

        if (plan) {
          const procedures = (plan.procedures || []) as any[];
          const phases: TimelinePhase[] = [];

          // Group procedures into phases (simplified - in production, this would be more sophisticated)
          const phaseSize = Math.ceil(procedures.length / 3);
          for (let i = 0; i < procedures.length; i += phaseSize) {
            const phaseProcedures = procedures.slice(i, i + phaseSize);
            const startDate = plan.startDate
              ? new Date(plan.startDate)
              : new Date();
            const estimatedDays = phaseProcedures.length * 14; // 2 weeks per procedure estimate
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + estimatedDays);

            phases.push({
              id: `phase-${i / phaseSize + 1}`,
              name: `Phase ${i / phaseSize + 1}`,
              description: `${phaseProcedures.length} procedures`,
              startDate,
              endDate,
              status: i === 0 ? 'in-progress' : isPast(endDate) ? 'completed' : 'upcoming',
              procedures: phaseProcedures.map((p: any) => p.procedureCode),
              milestones: phaseProcedures.map((p: any, idx: number) => ({
                id: `milestone-${i + idx}`,
                name: p.procedureName || p.procedureCode,
                date: new Date(startDate.getTime() + idx * 14 * 24 * 60 * 60 * 1000),
                completed: false,
                description: p.description,
              })),
            });
          }

          setPhases(phases);
        }
      }
    } catch (error) {
      console.error('Error loading timeline data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: TimelinePhase['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'in-progress':
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'delayed':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Calendar className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: TimelinePhase['status']) => {
    const variants: Record<TimelinePhase['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
      completed: 'default',
      'in-progress': 'secondary',
      upcoming: 'outline',
      delayed: 'destructive',
    };

    return (
      <Badge variant={variants[status]} className="capitalize">
        {status.replace('-', ' ')}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">Loading timeline...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Treatment Timeline
        </CardTitle>
        <CardDescription>Visual timeline of treatment phases and milestones</CardDescription>
      </CardHeader>
      <CardContent>
        {phases.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No timeline data available</div>
        ) : (
          <div className="space-y-6">
            {phases.map((phase, phaseIndex) => (
              <div key={phase.id} className="relative">
                {/* Phase Header */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex-shrink-0">{getStatusIcon(phase.status)}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold">{phase.name}</h3>
                      {getStatusBadge(phase.status)}
                    </div>
                    {phase.description && (
                      <p className="text-sm text-gray-600 mb-2">{phase.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>
                        Start: {format(phase.startDate, 'MMM d, yyyy')}
                      </span>
                      {phase.endDate && (
                        <span>
                          End: {format(phase.endDate, 'MMM d, yyyy')}
                        </span>
                      )}
                      {phase.endDate && (
                        <span>
                          {differenceInDays(phase.endDate, new Date()) > 0
                            ? `${differenceInDays(phase.endDate, new Date())} days remaining`
                            : 'Completed'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Milestones */}
                <div className="ml-9 space-y-3">
                  {phase.milestones.map((milestone, milestoneIndex) => (
                    <div
                      key={milestone.id}
                      className="flex items-start gap-3 pb-3 border-l-2 border-gray-200 pl-4"
                    >
                      <div className="flex-shrink-0 mt-1">
                        {milestone.completed ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{milestone.name}</span>
                          <span className="text-xs text-gray-500">
                            {format(milestone.date, 'MMM d, yyyy')}
                          </span>
                        </div>
                        {milestone.description && (
                          <p className="text-xs text-gray-600 mt-1">{milestone.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Connector line between phases */}
                {phaseIndex < phases.length - 1 && (
                  <div className="flex items-center justify-center my-4">
                    <ArrowRight className="h-5 w-5 text-gray-400" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
