'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, ImagePlus, Calendar, ClipboardList, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface PreChartPanelProps {
  leadId: string;
}

interface PriorNote {
  sessionId: string;
  sessionDate: string;
  chiefComplaint?: string;
  summary?: string;
}

interface Xray {
  id: string;
  xrayType: string;
  dateTaken: string;
  teethIncluded: string[];
}

interface Procedure {
  id: string;
  procedureCode: string;
  procedureName: string;
  scheduledDate?: string;
  status: string;
}

interface Appointment {
  id: string;
  appointmentDate: string;
  duration: number;
  status: string;
}

export function PreChartPanel({ leadId }: PreChartPanelProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    priorNotes: PriorNote[];
    xrays: Xray[];
    procedures: Procedure[];
    upcomingAppointments: Appointment[];
  } | null>(null);

  useEffect(() => {
    if (!leadId) return;
    fetch(`/api/docpen/pre-chart?leadId=${leadId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [leadId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Pre-Chart
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const hasData =
    data.priorNotes.length > 0 ||
    data.xrays.length > 0 ||
    data.procedures.length > 0 ||
    data.upcomingAppointments.length > 0;

  if (!hasData) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <ClipboardList className="h-4 w-4" />
          Pre-Chart Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.priorNotes.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <FileText className="h-3 w-3" />
              Prior Notes ({data.priorNotes.length})
            </p>
            <div className="space-y-2">
              {data.priorNotes.slice(0, 3).map((n) => (
                <div
                  key={n.sessionId}
                  className="text-xs border rounded p-2 bg-muted/30"
                >
                  <p className="font-medium">
                    {format(new Date(n.sessionDate), 'MMM d, yyyy')}
                    {n.chiefComplaint && ` • ${n.chiefComplaint}`}
                  </p>
                  {n.summary && (
                    <p className="text-muted-foreground truncate mt-1">
                      {n.summary}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {data.xrays.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <ImagePlus className="h-3 w-3" />
              Recent X-Rays ({data.xrays.length})
            </p>
            <div className="flex flex-wrap gap-1">
              {data.xrays.slice(0, 5).map((x) => (
                <Badge key={x.id} variant="outline" className="text-xs">
                  {x.xrayType} {format(new Date(x.dateTaken), 'MMM d')}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {data.procedures.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Upcoming Procedures
            </p>
            <div className="space-y-1">
              {data.procedures.slice(0, 3).map((p) => (
                <p key={p.id} className="text-xs">
                  {p.procedureCode} {p.procedureName}
                  {p.scheduledDate &&
                    ` • ${format(new Date(p.scheduledDate), 'MMM d')}`}
                </p>
              ))}
            </div>
          </div>
        )}

        {data.upcomingAppointments.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Upcoming Appointments
            </p>
            <div className="space-y-1">
              {data.upcomingAppointments.slice(0, 2).map((a) => (
                <p key={a.id} className="text-xs">
                  {format(new Date(a.appointmentDate), 'MMM d, h:mm a')} (
                  {a.duration} min)
                </p>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
