'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Loader2,
  Plus,
  ChevronRight,
  Calendar,
  Clock,
  Smile,
  Braces,
  Shield,
  Zap,
  ExternalLink,
  History,
  Table2,
} from 'lucide-react';

interface OrthoTreatmentTrackerProps {
  leadId: string;
  clinicId?: string;
  compact?: boolean;
}

type OrthoTreatmentType = 'ALIGNER' | 'BRACES' | 'RETAINER' | 'APPLIANCE';
type OrthoTreatmentStatus = 'PLANNED' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';

interface OrthoTreatment {
  id: string;
  leadId: string;
  clinicId: string;
  treatmentType: OrthoTreatmentType;
  status: OrthoTreatmentStatus;
  startDate: string;
  estimatedEndDate?: string | null;
  actualEndDate?: string | null;
  arch?: string;
  notes?: string | null;
  alignerBrand?: string | null;
  alignerCaseNumber?: string | null;
  totalAligners?: number | null;
  currentAligner?: number | null;
  wearSchedule?: number | null;
  changeFrequency?: number | null;
  nextChangeDate?: string | null;
  refinementNumber?: number | null;
  clinCheckUrl?: string | null;
  iprPlan?: unknown;
  bracketSystem?: string | null;
  upperWire?: string | null;
  lowerWire?: string | null;
  elasticConfig?: string | null;
  ligatureType?: string | null;
  bracketsPlaced?: unknown;
  retainerType?: string | null;
  wearInstructions?: string | null;
  applianceType?: string | null;
  applianceDetails?: string | null;
  visits?: unknown;
}

const STATUS_CONFIG: Record<
  OrthoTreatmentStatus,
  { label: string; className: string }
> = {
  ACTIVE: { label: 'Active', className: 'bg-green-100 text-green-700' },
  ON_HOLD: { label: 'On Hold', className: 'bg-amber-100 text-amber-700' },
  PLANNED: { label: 'Planned', className: 'bg-blue-100 text-blue-700' },
  COMPLETED: { label: 'Completed', className: 'bg-gray-100 text-gray-600' },
  CANCELLED: { label: 'Cancelled', className: 'bg-gray-100 text-gray-500' },
};

const TREATMENT_TYPE_LABELS: Record<OrthoTreatmentType, string> = {
  ALIGNER: 'Aligners',
  BRACES: 'Braces',
  RETAINER: 'Retainers',
  APPLIANCE: 'Appliances',
};

function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function OrthoTreatmentTracker({
  leadId,
  clinicId,
  compact = false,
}: OrthoTreatmentTrackerProps) {
  const [treatments, setTreatments] = useState<OrthoTreatment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [advancingId, setAdvancingId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createSaving, setCreateSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<OrthoTreatment>>({
    treatmentType: 'ALIGNER',
    status: 'ACTIVE',
    arch: 'BOTH',
    wearSchedule: 22,
    changeFrequency: 14,
    refinementNumber: 0,
  });

  const fetchTreatments = useCallback(async () => {
    if (!leadId) {
      setTreatments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ leadId });
      if (clinicId) params.set('clinicId', clinicId);
      const res = await fetch(`/api/dental/ortho-treatments?${params}`);
      if (!res.ok) throw new Error('Failed to fetch treatments');
      const data = await res.json();
      setTreatments(data?.treatments ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
      setTreatments([]);
    } finally {
      setLoading(false);
    }
  }, [leadId, clinicId]);

  useEffect(() => {
    fetchTreatments();
  }, [fetchTreatments]);

  const handleAdvanceAligner = async (t: OrthoTreatment) => {
    if (t.treatmentType !== 'ALIGNER' || !t.totalAligners || !t.currentAligner) return;
    if (t.currentAligner >= t.totalAligners) {
      toast.info('Already on final aligner');
      return;
    }
    setAdvancingId(t.id);
    try {
      const res = await fetch('/api/dental/ortho-treatments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: t.id,
          leadId: t.leadId,
          clinicId: t.clinicId,
          treatmentType: t.treatmentType,
          status: t.status,
          startDate: t.startDate,
          estimatedEndDate: t.estimatedEndDate,
          arch: t.arch,
          notes: t.notes,
          alignerBrand: t.alignerBrand,
          alignerCaseNumber: t.alignerCaseNumber,
          totalAligners: t.totalAligners,
          currentAligner: (t.currentAligner ?? 0) + 1,
          wearSchedule: t.wearSchedule ?? 22,
          changeFrequency: t.changeFrequency ?? 14,
          refinementNumber: t.refinementNumber ?? 0,
          clinCheckUrl: t.clinCheckUrl,
          iprPlan: t.iprPlan,
          visits: t.visits,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.message ?? 'Failed to advance');
      }
      toast.success(`Advanced to aligner ${(t.currentAligner ?? 0) + 1}/${t.totalAligners}`);
      await fetchTreatments();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to advance aligner');
    } finally {
      setAdvancingId(null);
    }
  };

  const handleCreateTreatment = async () => {
    if (!leadId || !clinicId) {
      toast.error('Patient and clinic are required');
      return;
    }
    setCreateSaving(true);
    try {
      const res = await fetch('/api/dental/ortho-treatments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          clinicId,
          treatmentType: formData.treatmentType,
          status: formData.status ?? 'ACTIVE',
          startDate: formData.startDate || new Date().toISOString().slice(0, 10),
          estimatedEndDate: formData.estimatedEndDate || null,
          arch: formData.arch ?? 'BOTH',
          notes: formData.notes || null,
          alignerBrand: formData.alignerBrand || null,
          alignerCaseNumber: formData.alignerCaseNumber || null,
          totalAligners: formData.totalAligners ?? null,
          currentAligner: formData.currentAligner ?? 1,
          wearSchedule: formData.wearSchedule ?? 22,
          changeFrequency: formData.changeFrequency ?? 14,
          refinementNumber: formData.refinementNumber ?? 0,
          clinCheckUrl: formData.clinCheckUrl || null,
          iprPlan: formData.iprPlan || null,
          bracketSystem: formData.bracketSystem || null,
          upperWire: formData.upperWire || null,
          lowerWire: formData.lowerWire || null,
          elasticConfig: formData.elasticConfig || null,
          ligatureType: formData.ligatureType || null,
          bracketsPlaced: formData.bracketsPlaced || null,
          retainerType: formData.retainerType || null,
          wearInstructions: formData.wearInstructions || null,
          applianceType: formData.applianceType || null,
          applianceDetails: formData.applianceDetails || null,
          visits: formData.visits || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.message ?? 'Failed to create');
      }
      toast.success('Treatment created');
      setCreateOpen(false);
      setFormData({
        treatmentType: 'ALIGNER',
        status: 'ACTIVE',
        arch: 'BOTH',
        wearSchedule: 22,
        changeFrequency: 14,
        refinementNumber: 0,
      });
      await fetchTreatments();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create treatment');
    } finally {
      setCreateSaving(false);
    }
  };

  if (compact) {
    const activeTreatment = treatments.find(
      (t) => t.status === 'ACTIVE' || t.status === 'ON_HOLD'
    ) ?? treatments[0];
    const isAligner = activeTreatment?.treatmentType === 'ALIGNER';
    const isBraces = activeTreatment?.treatmentType === 'BRACES';

    return (
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardHeader className="pb-2 px-4 pt-3">
          <CardTitle className="text-sm font-semibold text-gray-900">
            Ortho Treatment
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 text-purple-400 animate-spin" />
            </div>
          ) : error ? (
            <p className="text-sm text-red-500 py-2">{error}</p>
          ) : !activeTreatment ? (
            <p className="text-sm text-gray-500 py-2">No orthodontic treatment</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-gray-900">
                  {isAligner
                    ? `${activeTreatment.alignerBrand ?? 'Aligners'} — Aligner ${activeTreatment.currentAligner ?? 0}/${activeTreatment.totalAligners ?? 0}`
                    : isBraces
                      ? `Braces — ${activeTreatment.bracketSystem ?? 'Brackets'}`
                      : `${TREATMENT_TYPE_LABELS[activeTreatment.treatmentType as OrthoTreatmentType]} — ${activeTreatment.retainerType ?? activeTreatment.applianceType ?? '—'}`}
                </span>
                <Badge
                  className={
                    STATUS_CONFIG[activeTreatment.status as OrthoTreatmentStatus]
                      ?.className ?? 'bg-gray-100 text-gray-600'
                  }
                >
                  {STATUS_CONFIG[activeTreatment.status as OrthoTreatmentStatus]?.label ?? activeTreatment.status}
                </Badge>
              </div>
              {isAligner && activeTreatment.totalAligners && activeTreatment.totalAligners > 0 && (
                <>
                  <Progress
                    value={
                      ((activeTreatment.currentAligner ?? 0) / activeTreatment.totalAligners) *
                      100
                    }
                    className="h-2 [&>div]:bg-purple-600"
                  />
                  {activeTreatment.nextChangeDate && (
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {(() => {
                        const d = daysUntil(activeTreatment.nextChangeDate);
                        return d !== null
                          ? d > 0
                            ? `${d} days until next aligner`
                            : d === 0
                              ? 'Change aligner today'
                              : 'Overdue for change'
                          : '—';
                      })()}
                    </p>
                  )}
                </>
              )}
              {isBraces && (activeTreatment.upperWire || activeTreatment.lowerWire) && (
                <p className="text-xs text-gray-500">
                  Wire: {[activeTreatment.upperWire, activeTreatment.lowerWire]
                    .filter(Boolean)
                    .join(' / ')}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  const aligners = treatments.filter((t) => t.treatmentType === 'ALIGNER');
  const braces = treatments.filter((t) => t.treatmentType === 'BRACES');
  const retainers = treatments.filter((t) => t.treatmentType === 'RETAINER');
  const appliances = treatments.filter((t) => t.treatmentType === 'APPLIANCE');
  const hasMultipleTypes =
    [aligners.length, braces.length, retainers.length, appliances.length].filter(
      (n) => n > 0
    ).length > 1;

  return (
    <Card className="bg-white border border-gray-200 shadow-sm">
      <CardHeader className="pb-2 px-4 pt-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-gray-900">
            Orthodontic Treatment Tracker
          </CardTitle>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                className="h-7 text-xs bg-purple-600 hover:bg-purple-700"
                disabled={!leadId || !clinicId}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Create Treatment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Orthodontic Treatment</DialogTitle>
              </DialogHeader>
              <CreateTreatmentForm
                formData={formData}
                setFormData={setFormData}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateTreatment}
                  disabled={createSaving || !formData.startDate}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {createSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Create'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-purple-400 animate-spin" />
          </div>
        ) : error ? (
          <p className="text-sm text-red-500 py-4">{error}</p>
        ) : treatments.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-gray-500 mb-4">No orthodontic treatment</p>
            {leadId && clinicId && (
              <Button
                size="sm"
                variant="outline"
                className="border-purple-300 text-purple-700 hover:bg-purple-50"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Treatment
              </Button>
            )}
          </div>
        ) : hasMultipleTypes ? (
          <Tabs defaultValue="aligners" className="w-full">
            <TabsList className="bg-gray-100 w-full justify-start overflow-x-auto">
              {aligners.length > 0 && (
                <TabsTrigger value="aligners" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                  <Smile className="h-3.5 w-3.5 mr-1.5" />
                  Aligners ({aligners.length})
                </TabsTrigger>
              )}
              {braces.length > 0 && (
                <TabsTrigger value="braces" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                  <Braces className="h-3.5 w-3.5 mr-1.5" />
                  Braces ({braces.length})
                </TabsTrigger>
              )}
              {retainers.length > 0 && (
                <TabsTrigger value="retainers" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                  <Shield className="h-3.5 w-3.5 mr-1.5" />
                  Retainers ({retainers.length})
                </TabsTrigger>
              )}
              {appliances.length > 0 && (
                <TabsTrigger value="appliances" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                  <Zap className="h-3.5 w-3.5 mr-1.5" />
                  Appliances ({appliances.length})
                </TabsTrigger>
              )}
            </TabsList>
            {aligners.length > 0 && (
              <TabsContent value="aligners" className="mt-4">
                {aligners.map((t) => (
                  <AlignerTabContent key={t.id} treatment={t} onAdvance={handleAdvanceAligner} advancingId={advancingId} />
                ))}
              </TabsContent>
            )}
            {braces.length > 0 && (
              <TabsContent value="braces" className="mt-4">
                {braces.map((t) => (
                  <BracesTabContent key={t.id} treatment={t} />
                ))}
              </TabsContent>
            )}
            {retainers.length > 0 && (
              <TabsContent value="retainers" className="mt-4">
                {retainers.map((t) => (
                  <RetainerTabContent key={t.id} treatment={t} />
                ))}
              </TabsContent>
            )}
            {appliances.length > 0 && (
              <TabsContent value="appliances" className="mt-4">
                {appliances.map((t) => (
                  <ApplianceTabContent key={t.id} treatment={t} />
                ))}
              </TabsContent>
            )}
          </Tabs>
        ) : (
          <>
            {aligners.length > 0 &&
              aligners.map((t) => (
                <AlignerTabContent
                  key={t.id}
                  treatment={t}
                  onAdvance={handleAdvanceAligner}
                  advancingId={advancingId}
                />
              ))}
            {braces.length > 0 &&
              braces.map((t) => (
                <BracesTabContent key={t.id} treatment={t} />
              ))}
            {retainers.length > 0 &&
              retainers.map((t) => (
                <RetainerTabContent key={t.id} treatment={t} />
              ))}
            {appliances.length > 0 &&
              appliances.map((t) => (
                <ApplianceTabContent key={t.id} treatment={t} />
              ))}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function AlignerTabContent({
  treatment,
  onAdvance,
  advancingId,
}: {
  treatment: OrthoTreatment;
  onAdvance: (t: OrthoTreatment) => void;
  advancingId: string | null;
}) {
  const current = treatment.currentAligner ?? 0;
  const total = treatment.totalAligners ?? 1;
  const pct = total > 0 ? (current / total) * 100 : 0;
  const days = daysUntil(treatment.nextChangeDate);
  const visits = Array.isArray(treatment.visits) ? treatment.visits : [];
  const iprPlan = treatment.iprPlan as Array<{ tooth?: string; mesial?: number; distal?: number }> | null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-shrink-0 w-24 h-24 rounded-full border-4 border-purple-200 flex items-center justify-center bg-purple-50">
          <span className="text-2xl font-bold text-purple-700">
            {current}/{total}
          </span>
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900">
              {treatment.alignerBrand ?? 'Aligners'}
            </span>
            {treatment.alignerCaseNumber && (
              <span className="text-xs text-gray-500">
                Case #{treatment.alignerCaseNumber}
              </span>
            )}
            {(treatment.refinementNumber ?? 0) > 0 && (
              <Badge variant="secondary" className="text-xs">
                Refinement {(treatment.refinementNumber ?? 0) + 1}
              </Badge>
            )}
            <Badge
              className={
                STATUS_CONFIG[treatment.status as OrthoTreatmentStatus]?.className ??
                'bg-gray-100'
              }
            >
              {STATUS_CONFIG[treatment.status as OrthoTreatmentStatus]?.label}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {treatment.wearSchedule ?? 22}h/day
            </span>
            <span>
              Change every {treatment.changeFrequency ?? 14} days
            </span>
          </div>
          {treatment.nextChangeDate && (
            <p className="text-sm text-gray-600 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Next change: {formatDate(treatment.nextChangeDate)}
              {days !== null && (
                <span className="text-purple-600 font-medium">
                  {days > 0 ? ` (${days} days)` : days === 0 ? ' (today)' : ' (overdue)'}
                </span>
              )}
            </p>
          )}
          {treatment.clinCheckUrl && (
            <a
              href={treatment.clinCheckUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700"
            >
              <ExternalLink className="h-3 w-3" />
              View ClinCheck
            </a>
          )}
        </div>
      </div>
      {treatment.status === 'ACTIVE' &&
        total > 0 &&
        current < total && (
          <Button
            size="sm"
            className="bg-purple-600 hover:bg-purple-700"
            onClick={() => onAdvance(treatment)}
            disabled={advancingId === treatment.id}
          >
            {advancingId === treatment.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <ChevronRight className="h-4 w-4 mr-1" />
                Advance to Aligner {current + 1}
              </>
            )}
          </Button>
        )}
      {iprPlan && iprPlan.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
            <Table2 className="h-3.5 w-3.5" />
            IPR Plan
          </h4>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left p-2 font-medium">Tooth</th>
                  <th className="text-left p-2 font-medium">Mesial</th>
                  <th className="text-left p-2 font-medium">Distal</th>
                </tr>
              </thead>
              <tbody>
                {iprPlan.map((row, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="p-2">{row.tooth ?? '—'}</td>
                    <td className="p-2">{row.mesial ?? '—'} mm</td>
                    <td className="p-2">{row.distal ?? '—'} mm</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {visits.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
            <History className="h-3.5 w-3.5" />
            Visit Log
          </h4>
          <ul className="space-y-2 max-h-40 overflow-y-auto">
            {visits.map((v: { date?: string; alignerNumber?: number; notes?: string }, i: number) => (
              <li
                key={i}
                className="text-xs p-2 bg-gray-50 rounded border border-gray-100"
              >
                <span className="font-medium">
                  {v.date ? formatDate(v.date) : '—'}
                </span>
                {v.alignerNumber != null && (
                  <span className="text-gray-500 ml-2">
                    Aligner {v.alignerNumber}
                  </span>
                )}
                {v.notes && (
                  <p className="text-gray-600 mt-1">{v.notes}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function BracesTabContent({ treatment }: { treatment: OrthoTreatment }) {
  const visits = Array.isArray(treatment.visits) ? treatment.visits : [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-gray-500 mb-1">Bracket System</p>
          <p className="text-sm font-medium">{treatment.bracketSystem ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Ligature</p>
          <p className="text-sm font-medium">{treatment.ligatureType ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Upper Wire</p>
          <p className="text-sm font-medium">{treatment.upperWire ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Lower Wire</p>
          <p className="text-sm font-medium">{treatment.lowerWire ?? '—'}</p>
        </div>
        <div className="col-span-2">
          <p className="text-xs text-gray-500 mb-1">Elastic Config</p>
          <p className="text-sm font-medium">{treatment.elasticConfig ?? '—'}</p>
        </div>
      </div>
      {visits.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
            <History className="h-3.5 w-3.5" />
            Wire Change History
          </h4>
          <ul className="space-y-2 max-h-40 overflow-y-auto">
            {visits.map((v: { date?: string; wireChange?: string; notes?: string }, i: number) => (
              <li
                key={i}
                className="text-xs p-2 bg-gray-50 rounded border border-gray-100"
              >
                <span className="font-medium">
                  {v.date ? formatDate(v.date) : '—'}
                </span>
                {v.wireChange && (
                  <span className="text-gray-500 ml-2">{v.wireChange}</span>
                )}
                {v.notes && (
                  <p className="text-gray-600 mt-1">{v.notes}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function RetainerTabContent({ treatment }: { treatment: OrthoTreatment }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-gray-500 mb-1">Type</p>
        <p className="text-sm font-medium">{treatment.retainerType ?? '—'}</p>
      </div>
      <div>
        <p className="text-xs text-gray-500 mb-1">Wear Instructions</p>
        <p className="text-sm text-gray-700">{treatment.wearInstructions ?? '—'}</p>
      </div>
    </div>
  );
}

function ApplianceTabContent({ treatment }: { treatment: OrthoTreatment }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-gray-500 mb-1">Type</p>
        <p className="text-sm font-medium">{treatment.applianceType ?? '—'}</p>
      </div>
      {treatment.applianceDetails && (
        <div>
          <p className="text-xs text-gray-500 mb-1">Details</p>
          <p className="text-sm text-gray-700">{treatment.applianceDetails}</p>
        </div>
      )}
    </div>
  );
}

function CreateTreatmentForm({
  formData,
  setFormData,
}: {
  formData: Partial<OrthoTreatment>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<OrthoTreatment>>>;
}) {
  const type = (formData.treatmentType ?? 'ALIGNER') as OrthoTreatmentType;

  return (
    <div className="space-y-4 py-2">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Treatment Type</Label>
          <Select
            value={type}
            onValueChange={(v) =>
              setFormData((p) => ({ ...p, treatmentType: v as OrthoTreatmentType }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALIGNER">Aligners</SelectItem>
              <SelectItem value="BRACES">Braces</SelectItem>
              <SelectItem value="RETAINER">Retainer</SelectItem>
              <SelectItem value="APPLIANCE">Appliance</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Status</Label>
          <Select
            value={formData.status ?? 'ACTIVE'}
            onValueChange={(v) =>
              setFormData((p) => ({ ...p, status: v as OrthoTreatmentStatus }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PLANNED">Planned</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="ON_HOLD">On Hold</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Start Date</Label>
          <Input
            type="date"
            value={formData.startDate ?? ''}
            onChange={(e) =>
              setFormData((p) => ({ ...p, startDate: e.target.value }))
            }
          />
        </div>
        <div>
          <Label>Arch</Label>
          <Select
            value={formData.arch ?? 'BOTH'}
            onValueChange={(v) => setFormData((p) => ({ ...p, arch: v }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="UPPER">Upper</SelectItem>
              <SelectItem value="LOWER">Lower</SelectItem>
              <SelectItem value="BOTH">Both</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {type === 'ALIGNER' && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Brand</Label>
              <Input
                placeholder="Invisalign, ClearCorrect..."
                value={formData.alignerBrand ?? ''}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, alignerBrand: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Case Number</Label>
              <Input
                placeholder="INV-2026-12345"
                value={formData.alignerCaseNumber ?? ''}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, alignerCaseNumber: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Total Aligners</Label>
              <Input
                type="number"
                min={1}
                value={formData.totalAligners ?? ''}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    totalAligners: e.target.value ? parseInt(e.target.value, 10) : undefined,
                  }))
                }
              />
            </div>
            <div>
              <Label>Current Aligner</Label>
              <Input
                type="number"
                min={1}
                value={formData.currentAligner ?? 1}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    currentAligner: e.target.value ? parseInt(e.target.value, 10) : 1,
                  }))
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Wear Schedule (hrs/day)</Label>
              <Input
                type="number"
                min={1}
                max={24}
                value={formData.wearSchedule ?? 22}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    wearSchedule: e.target.value ? parseInt(e.target.value, 10) : 22,
                  }))
                }
              />
            </div>
            <div>
              <Label>Change Frequency (days)</Label>
              <Input
                type="number"
                min={1}
                value={formData.changeFrequency ?? 14}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    changeFrequency: e.target.value ? parseInt(e.target.value, 10) : 14,
                  }))
                }
              />
            </div>
          </div>
          <div>
            <Label>Refinement Number</Label>
            <Input
              type="number"
              min={0}
              value={formData.refinementNumber ?? 0}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  refinementNumber: e.target.value ? parseInt(e.target.value, 10) : 0,
                }))
              }
            />
          </div>
        </>
      )}
      {type === 'BRACES' && (
        <>
          <div>
            <Label>Bracket System</Label>
            <Input
              placeholder="Damon Q2, 3M Clarity..."
              value={formData.bracketSystem ?? ''}
              onChange={(e) =>
                setFormData((p) => ({ ...p, bracketSystem: e.target.value }))
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Upper Wire</Label>
              <Input
                placeholder="14 NiTi, 16x22 SS"
                value={formData.upperWire ?? ''}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, upperWire: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Lower Wire</Label>
              <Input
                placeholder="14 NiTi, 16x22 SS"
                value={formData.lowerWire ?? ''}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, lowerWire: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Elastic Config</Label>
              <Input
                placeholder="Class II right, Triangle left"
                value={formData.elasticConfig ?? ''}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, elasticConfig: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Ligature Type</Label>
              <Input
                placeholder="Steel, Elastic, Self-ligating"
                value={formData.ligatureType ?? ''}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, ligatureType: e.target.value }))
                }
              />
            </div>
          </div>
        </>
      )}
      {type === 'RETAINER' && (
        <>
          <div>
            <Label>Retainer Type</Label>
            <Input
              placeholder="Hawley, Essix, Fixed lingual"
              value={formData.retainerType ?? ''}
              onChange={(e) =>
                setFormData((p) => ({ ...p, retainerType: e.target.value }))
              }
            />
          </div>
          <div>
            <Label>Wear Instructions</Label>
            <Input
              placeholder="Full time 3mo, then nights only"
              value={formData.wearInstructions ?? ''}
              onChange={(e) =>
                setFormData((p) => ({ ...p, wearInstructions: e.target.value }))
              }
            />
          </div>
        </>
      )}
      {type === 'APPLIANCE' && (
        <>
          <div>
            <Label>Appliance Type</Label>
            <Input
              placeholder="RPE, Herbst, Forsus, Space maintainer"
              value={formData.applianceType ?? ''}
              onChange={(e) =>
                setFormData((p) => ({ ...p, applianceType: e.target.value }))
              }
            />
          </div>
          <div>
            <Label>Details</Label>
            <Input
              placeholder="Additional details"
              value={formData.applianceDetails ?? ''}
              onChange={(e) =>
                setFormData((p) => ({ ...p, applianceDetails: e.target.value }))
              }
            />
          </div>
        </>
      )}
      <div>
        <Label>Notes</Label>
        <Input
          placeholder="Optional notes"
          value={formData.notes ?? ''}
          onChange={(e) =>
            setFormData((p) => ({ ...p, notes: e.target.value }))
          }
        />
      </div>
    </div>
  );
}
