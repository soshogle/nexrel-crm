/**
 * Dental Treatment Plan Builder Component
 * Drag-and-drop procedure selection, sequencing, cost calculation
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Save, Plus, Trash2, GripVertical, Calculator, Calendar, CheckCircle2 } from 'lucide-react';
import { CDT_CODES, getCDTCodeByCode, searchCDTCodes, type CDTCode } from '@/lib/dental/cdt-codes';
import { TreatmentPlanStatus } from '@prisma/client';

interface TreatmentProcedure {
  procedureCode: string;
  procedureName: string;
  description?: string;
  cost: number;
  sequence: number;
  teethInvolved?: string[];
  scheduledDate?: string;
}

interface TreatmentPlanBuilderProps {
  leadId: string;
  planId?: string;
  initialData?: {
    planName?: string;
    description?: string;
    procedures?: TreatmentProcedure[];
    totalCost?: number;
    insuranceCoverage?: number;
    patientResponsibility?: number;
    status?: TreatmentPlanStatus;
  };
  onSave?: (data: any) => Promise<void>;
  readOnly?: boolean;
}

export function TreatmentPlanBuilder({
  leadId,
  planId,
  initialData,
  onSave,
  readOnly = false,
}: TreatmentPlanBuilderProps) {
  const t = useTranslations('dental.treatmentPlan');
  const tToasts = useTranslations('dental.toasts');
  const tCommon = useTranslations('common');
  
  const [planName, setPlanName] = useState(initialData?.planName || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [procedures, setProcedures] = useState<TreatmentProcedure[]>(
    initialData?.procedures || []
  );
  const [insuranceCoverage, setInsuranceCoverage] = useState(
    initialData?.insuranceCoverage || 0
  );
  const [status, setStatus] = useState<TreatmentPlanStatus>(
    initialData?.status || TreatmentPlanStatus.DRAFT
  );
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = ['All', ...Array.from(new Set(CDT_CODES.map(c => c.category)))];

  const filteredCodes = searchQuery
    ? searchCDTCodes(searchQuery)
    : selectedCategory === 'All'
      ? CDT_CODES
      : CDT_CODES.filter(c => c.category === selectedCategory);

  const totalCost = procedures.reduce((sum, p) => sum + (p.cost || 0), 0);
  const patientResponsibility = totalCost - insuranceCoverage;

  const addProcedure = (cdtCode: CDTCode) => {
    if (readOnly) return;

    const newProcedure: TreatmentProcedure = {
      procedureCode: cdtCode.code,
      procedureName: cdtCode.name,
      description: cdtCode.description || '',
      cost: cdtCode.typicalCost || 0,
      sequence: procedures.length + 1,
      teethInvolved: [],
    };

    setProcedures([...procedures, newProcedure]);
    toast.success(t('procedureAdded', { name: cdtCode.name }));
  };

  const removeProcedure = (index: number) => {
    if (readOnly) return;
    const newProcedures = procedures.filter((_, i) => i !== index);
    // Re-sequence
    newProcedures.forEach((p, i) => {
      p.sequence = i + 1;
    });
    setProcedures(newProcedures);
  };

  const updateProcedure = (index: number, field: keyof TreatmentProcedure, value: any) => {
    if (readOnly) return;
    const newProcedures = [...procedures];
    newProcedures[index] = { ...newProcedures[index], [field]: value };
    setProcedures(newProcedures);
  };

  const moveProcedure = (fromIndex: number, toIndex: number) => {
    if (readOnly) return;
    const newProcedures = [...procedures];
    const [moved] = newProcedures.splice(fromIndex, 1);
    newProcedures.splice(toIndex, 0, moved);
    // Re-sequence
    newProcedures.forEach((p, i) => {
      p.sequence = i + 1;
    });
    setProcedures(newProcedures);
  };

  const handleSave = async () => {
    if (readOnly || !onSave) return;

    if (!planName.trim()) {
      toast.error(t('planNameRequired'));
      return;
    }

    try {
      setSaving(true);
      await onSave({
        id: planId,
        leadId,
        planName,
        description,
        procedures,
        totalCost,
        insuranceCoverage,
        patientResponsibility,
        status,
      });
      toast.success(tToasts('treatmentPlanSaved'));
    } catch (error: any) {
      toast.error(tToasts('treatmentPlanSaveFailed') + ': ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t('title')}</CardTitle>
            <CardDescription>
              {t('description')}
            </CardDescription>
          </div>
          {!readOnly && (
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? tCommon('loading') : t('save')}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="builder" className="w-full">
          <TabsList>
            <TabsTrigger value="builder">{t('title')}</TabsTrigger>
            <TabsTrigger value="financial">{tCommon('financial') || 'Financial Summary'}</TabsTrigger>
          </TabsList>

          <TabsContent value="builder" className="space-y-4">
            {/* Plan Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>{t('planName')} *</Label>
                <Input
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  disabled={readOnly}
                  placeholder={t('planName')}
                />
              </div>
              <div>
                <Label>{t('status')}</Label>
                <Select
                  value={status}
                  onValueChange={(value) => setStatus(value as TreatmentPlanStatus)}
                  disabled={readOnly}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TreatmentPlanStatus.DRAFT}>{t('draft')}</SelectItem>
                    <SelectItem value={TreatmentPlanStatus.PENDING_APPROVAL}>{t('pendingApproval')}</SelectItem>
                    <SelectItem value={TreatmentPlanStatus.APPROVED}>{t('approved')}</SelectItem>
                    <SelectItem value={TreatmentPlanStatus.IN_PROGRESS}>{t('inProgress')}</SelectItem>
                    <SelectItem value={TreatmentPlanStatus.COMPLETED}>{t('completed')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>{t('planDescription')}</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={readOnly}
                placeholder={t('planDescription')}
                rows={3}
              />
            </div>

            {/* Procedure Library */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('procedures')}</CardTitle>
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder={t('searchProcedures')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1"
                  />
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat === 'All' ? t('allCategories') : cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                  {filteredCodes.map(cdtCode => (
                    <button
                      key={cdtCode.code}
                      onClick={() => addProcedure(cdtCode)}
                      disabled={readOnly}
                      className="text-left p-3 rounded border hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-semibold text-sm">{cdtCode.code}</div>
                          <div className="text-xs text-gray-600">{cdtCode.name}</div>
                          {cdtCode.typicalCost && (
                            <div className="text-xs text-green-600 mt-1">
                              ${cdtCode.typicalCost}
                            </div>
                          )}
                        </div>
                        <Plus className="h-4 w-4 text-gray-400" />
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Selected Procedures */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('procedures')}</CardTitle>
                <CardDescription>
                  {t('noProcedures')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {procedures.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {t('noProcedures')}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {procedures.map((procedure, index) => {
                      const cdtCode = getCDTCodeByCode(procedure.procedureCode);
                      return (
                        <Card key={index} className="p-4">
                          <div className="flex items-start gap-4">
                            <div className="flex items-center gap-2">
                              <GripVertical className="h-5 w-5 text-gray-400" />
                              <Badge variant="outline">#{procedure.sequence}</Badge>
                            </div>
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-semibold">{procedure.procedureCode}</div>
                                  <div className="text-sm text-gray-600">
                                    {procedure.procedureName}
                                  </div>
                                </div>
                                {!readOnly && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeProcedure(index)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                <div>
                                  <Label className="text-xs">{t('cost')} ($)</Label>
                                  <Input
                                    type="number"
                                    value={procedure.cost}
                                    onChange={(e) =>
                                      updateProcedure(index, 'cost', parseFloat(e.target.value) || 0)
                                    }
                                    disabled={readOnly}
                                    className="h-8"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">{t('teethInvolved')}</Label>
                                  <Input
                                    value={procedure.teethInvolved?.join(', ') || ''}
                                    onChange={(e) =>
                                      updateProcedure(
                                        index,
                                        'teethInvolved',
                                        e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                                      )
                                    }
                                    disabled={readOnly}
                                    placeholder="1, 2, 3"
                                    className="h-8"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">{t('scheduledDate')}</Label>
                                  <Input
                                    type="date"
                                    value={procedure.scheduledDate || ''}
                                    onChange={(e) =>
                                      updateProcedure(index, 'scheduledDate', e.target.value)
                                    }
                                    disabled={readOnly}
                                    className="h-8"
                                  />
                                </div>
                              </div>
                              {procedure.description && (
                                <Textarea
                                  value={procedure.description}
                                  onChange={(e) =>
                                    updateProcedure(index, 'description', e.target.value)
                                  }
                                  disabled={readOnly}
                                  placeholder="Procedure notes..."
                                  rows={2}
                                  className="text-sm"
                                />
                              )}
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="financial" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  {tCommon('financial') || 'Financial Summary'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t('totalCost')}</Label>
                    <div className="text-2xl font-bold text-gray-900">
                      ${totalCost.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <Label>{t('insuranceCoverage')}</Label>
                    <Input
                      type="number"
                      value={insuranceCoverage}
                      onChange={(e) =>
                        setInsuranceCoverage(parseFloat(e.target.value) || 0)
                      }
                      disabled={readOnly}
                      className="text-lg font-semibold"
                    />
                  </div>
                </div>
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-lg">{t('patientResponsibility')}</Label>
                    <div className="text-2xl font-bold text-green-600">
                      ${patientResponsibility.toFixed(2)}
                    </div>
                  </div>
                </div>
                {insuranceCoverage > 0 && (
                  <div className="text-sm text-gray-600">
                    {tCommon('coverage') || 'Coverage'}: {((insuranceCoverage / totalCost) * 100).toFixed(1)}%
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
