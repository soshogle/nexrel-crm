/**
 * Treatment Progress Visualization Component
 * Phase 5: Before/after comparison, timeline, progress tracking
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, CheckCircle2, Clock, XCircle } from 'lucide-react';

interface TreatmentProgressProps {
  leadId: string;
  treatmentPlanId?: string;
}

interface ProcedureProgress {
  id: string;
  procedureCode: string;
  procedureName: string;
  status: 'PENDING' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  scheduledDate?: Date;
  completedDate?: Date;
  progress: number; // 0-100
}

export function TreatmentProgressVisualization({ leadId, treatmentPlanId }: TreatmentProgressProps) {
  const [procedures, setProcedures] = useState<ProcedureProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProgress();
  }, [leadId, treatmentPlanId]);

  const fetchProgress = async () => {
    try {
      // Fetch procedures for this treatment plan
      const response = await fetch(
        `/api/dental/procedures?leadId=${leadId}${treatmentPlanId ? `&treatmentPlanId=${treatmentPlanId}` : ''}`
      );
      if (response.ok) {
        const data = await response.json();
        setProcedures(data.procedures || []);
      }
    } catch (error) {
      console.error('Error fetching progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const completedCount = procedures.filter(p => p.status === 'COMPLETED').length;
  const totalCount = procedures.length;
  const overallProgress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const getStatusIcon = (status: ProcedureProgress['status']) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'IN_PROGRESS':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'SCHEDULED':
        return <Calendar className="w-4 h-4 text-yellow-600" />;
      case 'CANCELLED':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: ProcedureProgress['status']) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      COMPLETED: 'default',
      IN_PROGRESS: 'secondary',
      SCHEDULED: 'outline',
      PENDING: 'outline',
      CANCELLED: 'destructive',
    };
    return (
      <Badge variant={variants[status] || 'outline'}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-400">Loading progress...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Treatment Progress</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="before-after">Before/After</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-sm text-gray-600">
                  {completedCount} of {totalCount} completed
                </span>
              </div>
              <Progress value={overallProgress} className="h-2" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="text-2xl font-bold text-green-600">{completedCount}</div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {procedures.filter(p => p.status === 'IN_PROGRESS').length}
                </div>
                <div className="text-sm text-gray-600">In Progress</div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">Procedures</h4>
              {procedures.map((procedure) => (
                <div
                  key={procedure.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3 flex-1">
                    {getStatusIcon(procedure.status)}
                    <div className="flex-1">
                      <div className="font-medium">{procedure.procedureName}</div>
                      <div className="text-sm text-gray-600">{procedure.procedureCode}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(procedure.status)}
                    {procedure.progress > 0 && (
                      <div className="w-24">
                        <Progress value={procedure.progress} className="h-1" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="timeline" className="space-y-4">
            <div className="relative">
              {procedures
                .sort((a, b) => {
                  const dateA = a.scheduledDate || a.completedDate || new Date(0);
                  const dateB = b.scheduledDate || b.completedDate || new Date(0);
                  return dateA.getTime() - dateB.getTime();
                })
                .map((procedure, index) => (
                  <div key={procedure.id} className="flex gap-4 pb-6 last:pb-0">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center bg-white">
                        {getStatusIcon(procedure.status)}
                      </div>
                      {index < procedures.length - 1 && (
                        <div className="w-0.5 h-full bg-gray-200 mt-2" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{procedure.procedureName}</div>
                          <div className="text-sm text-gray-600">
                            {procedure.scheduledDate
                              ? `Scheduled: ${new Date(procedure.scheduledDate).toLocaleDateString()}`
                              : procedure.completedDate
                              ? `Completed: ${new Date(procedure.completedDate).toLocaleDateString()}`
                              : 'Not scheduled'}
                          </div>
                        </div>
                        {getStatusBadge(procedure.status)}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </TabsContent>

          <TabsContent value="before-after" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">Before Treatment</h4>
                <div className="border rounded-lg p-4 bg-gray-50 min-h-[200px] flex items-center justify-center text-gray-400">
                  Before images will appear here
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2">After Treatment</h4>
                <div className="border rounded-lg p-4 bg-gray-50 min-h-[200px] flex items-center justify-center text-gray-400">
                  After images will appear here
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Upload before/after photos in the X-Ray & Imaging section to see comparisons here.
            </p>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
