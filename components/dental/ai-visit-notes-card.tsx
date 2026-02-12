'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mic, FileText, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface AIVisitNotesCardProps {
  leadId: string | null;
  patientName?: string;
  chiefComplaint?: string;
}

interface DocpenSession {
  id: string;
  sessionDate: string;
  status: string;
  soapNoteGenerated: boolean;
  chiefComplaint?: string;
}

export function AIVisitNotesCard({ leadId, patientName, chiefComplaint }: AIVisitNotesCardProps) {
  const router = useRouter();
  const [sessions, setSessions] = useState<DocpenSession[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!leadId) {
      setSessions([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/docpen/sessions?leadId=${leadId}&limit=5`)
      .then((r) => (r.ok ? r.json() : { sessions: [] }))
      .then((data) => {
        if (!cancelled) setSessions(data.sessions || []);
      })
      .catch(() => {
        if (!cancelled) setSessions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [leadId]);

  const handleStartVisit = () => {
    const params = new URLSearchParams();
    if (leadId) params.set('leadId', leadId);
    if (patientName) params.set('patientName', patientName);
    if (chiefComplaint) params.set('chiefComplaint', chiefComplaint);
    params.set('from', 'clinical');
    router.push(`/dashboard/docpen?${params.toString()}`);
  };

  if (!leadId) {
    return (
      <Card className="bg-white/95 backdrop-blur-sm border border-white/20 shadow-lg">
        <CardHeader className="pb-2 px-4 pt-3">
          <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Mic className="h-4 w-4 text-purple-500" />
            AI Visit Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="text-center py-8 text-gray-400 text-xs">
            Select a patient to start
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/95 backdrop-blur-sm border border-white/20 shadow-lg cursor-pointer hover:shadow-xl transition-all">
      <CardHeader className="pb-2 px-4 pt-3">
        <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Mic className="h-4 w-4 text-purple-500" />
          AI Visit Notes
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="space-y-3">
          <Button
            size="sm"
            className="w-full bg-purple-600 hover:bg-purple-700"
            onClick={(e) => {
              e.stopPropagation();
              handleStartVisit();
            }}
          >
            <Mic className="h-4 w-4 mr-2" />
            Start Visit
          </Button>
          {loading ? (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : sessions.length > 0 ? (
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-600">Recent sessions</p>
              {sessions.slice(0, 2).map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-2 text-xs text-gray-600 hover:text-purple-600 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/dashboard/docpen?session=${s.id}`);
                  }}
                >
                  <FileText className="h-3 w-3 flex-shrink-0" />
                  {format(new Date(s.sessionDate), 'MMM d')}
                  {s.soapNoteGenerated && (
                    <span className="text-green-600">• SOAP</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500">No visit notes yet</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
