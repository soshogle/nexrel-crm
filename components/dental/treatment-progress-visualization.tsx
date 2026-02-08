/**
 * Treatment Progress Visualization Component
 * Phase 5: Before/after comparisons, progress tracking
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useTranslations } from 'next-intl';
import {
  TrendingUp,
  Calendar,
  CheckCircle2,
  Clock,
  Image as ImageIcon,
  FileText,
  Scan,
} from 'lucide-react';
import { format } from 'date-fns';

interface TreatmentProgressProps {
  leadId: string;
  treatmentPlanId?: string;
}

interface ProgressSnapshot {
  id: string;
  date: Date;
  type: 'photo' | 'xray' | 'odontogram' | 'note';
  url?: string;
  description?: string;
  proceduresCompleted?: string[];
}

export function TreatmentProgressVisualization({
  leadId,
  treatmentPlanId,
}: TreatmentProgressProps) {
  const t = useTranslations('dental.treatmentProgress');
  const [snapshots, setSnapshots] = useState<ProgressSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSnapshot, setSelectedSnapshot] = useState<ProgressSnapshot | null>(null);

  useEffect(() => {
    loadProgressData();
  }, [leadId, treatmentPlanId]);

  const loadProgressData = async () => {
    try {
      setLoading(true);
      // Fetch treatment plan and related data
      const response = await fetch(`/api/dental/treatment-plans?leadId=${leadId}`);
      if (response.ok) {
        const data = await response.json();
        // Transform data into snapshots
        const progressSnapshots: ProgressSnapshot[] = [];

        // Add treatment plan creation as initial snapshot
        if (data.plans?.[0]) {
          progressSnapshots.push({
            id: 'initial',
            date: new Date(data.plans[0].createdDate),
            type: 'note',
            description: 'Treatment plan created',
          });
        }

        // Add X-rays
        const xrayResponse = await fetch(`/api/dental/xrays?leadId=${leadId}`);
        if (xrayResponse.ok) {
          const xrays = await xrayResponse.json();
          xrays.forEach((xray: any) => {
            progressSnapshots.push({
              id: xray.id,
              date: new Date(xray.takenDate),
              type: 'xray',
              url: xray.thumbnailUrl || xray.imageUrl,
              description: xray.description || 'X-ray taken',
            });
          });
        }

        // Add procedures
        const procResponse = await fetch(`/api/dental/procedures?leadId=${leadId}`);
        if (procResponse.ok) {
          const procedures = await procResponse.json();
          procedures.forEach((proc: any) => {
            progressSnapshots.push({
              id: proc.id,
              date: new Date(proc.performedDate),
              type: 'note',
              description: `${proc.procedureCode} - ${proc.procedureName}`,
              proceduresCompleted: [proc.procedureCode],
            });
          });
        }

        // Sort by date
        progressSnapshots.sort((a, b) => a.date.getTime() - b.date.getTime());
        setSnapshots(progressSnapshots);
      }
    } catch (error) {
      console.error('Error loading progress data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = () => {
    if (snapshots.length === 0) return 0;
    // Simple progress calculation based on snapshots
    // In a real implementation, this would compare planned vs completed procedures
    return Math.min((snapshots.length / 10) * 100, 100);
  };

  const progress = calculateProgress();

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">Loading progress...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Treatment Progress
        </CardTitle>
        <CardDescription>Track treatment progress over time</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="timeline" className="w-full">
          <TabsList>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="comparison">Before/After</TabsTrigger>
            <TabsTrigger value="stats">Statistics</TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-sm text-gray-600">{progress.toFixed(0)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            <div className="space-y-4">
              {snapshots.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No progress data available yet
                </div>
              ) : (
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

                  {/* Timeline items */}
                  <div className="space-y-6">
                    {snapshots.map((snapshot, index) => (
                      <div key={snapshot.id} className="relative flex gap-4">
                        {/* Timeline dot */}
                        <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-white">
                          {snapshot.type === 'xray' && <Scan className="h-4 w-4" />}
                          {snapshot.type === 'photo' && <ImageIcon className="h-4 w-4" />}
                          {snapshot.type === 'note' && <FileText className="h-4 w-4" />}
                          {snapshot.type === 'odontogram' && <CheckCircle2 className="h-4 w-4" />}
                        </div>

                        {/* Content */}
                        <div className="flex-1 pb-6">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm">
                              {format(snapshot.date, 'MMM d, yyyy')}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {snapshot.type}
                            </Badge>
                          </div>
                          {snapshot.description && (
                            <p className="text-sm text-gray-600">{snapshot.description}</p>
                          )}
                          {snapshot.url && (
                            <div className="mt-2">
                              <img
                                src={snapshot.url}
                                alt="Progress snapshot"
                                className="h-32 w-32 object-cover rounded border cursor-pointer"
                                onClick={() => setSelectedSnapshot(snapshot)}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="comparison" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Before</CardTitle>
                </CardHeader>
                <CardContent>
                  {snapshots.length > 0 ? (
                    <div>
                      {snapshots[0].url ? (
                        <img
                          src={snapshots[0].url}
                          alt="Before"
                          className="w-full h-64 object-cover rounded"
                        />
                      ) : (
                        <div className="h-64 flex items-center justify-center bg-gray-100 rounded text-gray-500">
                          No image available
                        </div>
                      )}
                      <p className="text-sm text-gray-600 mt-2">
                        {format(snapshots[0].date, 'MMM d, yyyy')}
                      </p>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center bg-gray-100 rounded text-gray-500">
                      No before image
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">After</CardTitle>
                </CardHeader>
                <CardContent>
                  {snapshots.length > 1 ? (
                    <div>
                      {snapshots[snapshots.length - 1].url ? (
                        <img
                          src={snapshots[snapshots.length - 1].url}
                          alt="After"
                          className="w-full h-64 object-cover rounded"
                        />
                      ) : (
                        <div className="h-64 flex items-center justify-center bg-gray-100 rounded text-gray-500">
                          No image available
                        </div>
                      )}
                      <p className="text-sm text-gray-600 mt-2">
                        {format(snapshots[snapshots.length - 1].date, 'MMM d, yyyy')}
                      </p>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center bg-gray-100 rounded text-gray-500">
                      No after image
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="stats" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold">{snapshots.length}</div>
                  <div className="text-sm text-gray-600">Total Snapshots</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold">
                    {snapshots.filter((s) => s.type === 'xray').length}
                  </div>
                  <div className="text-sm text-gray-600">X-Rays</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold">
                    {snapshots.filter((s) => s.type === 'note').length}
                  </div>
                  <div className="text-sm text-gray-600">Procedures</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold">{progress.toFixed(0)}%</div>
                  <div className="text-sm text-gray-600">Progress</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
