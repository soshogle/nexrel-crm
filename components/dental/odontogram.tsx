/**
 * Dental Odontogram Component
 * Interactive tooth chart using Universal Numbering System (1-32)
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
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Save, RotateCcw, Box, Grid3x3 } from 'lucide-react';
import { Odontogram3D } from './odontogram-3d';

interface ToothData {
  condition?: string;
  date?: string;
  notes?: string;
  procedureCode?: string;
  restoration?: string;
  [key: string]: any;
}

interface OdontogramData {
  [toothNumber: string]: ToothData;
}

interface OdontogramProps {
  leadId: string;
  initialData?: OdontogramData;
  onSave?: (data: OdontogramData) => Promise<void>;
  readOnly?: boolean;
}

// Universal Numbering System: 1-32
// Upper right: 1-8, Upper left: 9-16
// Lower left: 17-24, Lower right: 25-32
const TOOTH_POSITIONS = [
  // Upper arch (maxilla)
  { number: '1', position: { row: 0, col: 7 }, label: '1' }, // Upper right third molar
  { number: '2', position: { row: 0, col: 6 }, label: '2' },
  { number: '3', position: { row: 0, col: 5 }, label: '3' },
  { number: '4', position: { row: 0, col: 4 }, label: '4' },
  { number: '5', position: { row: 0, col: 3 }, label: '5' },
  { number: '6', position: { row: 0, col: 2 }, label: '6' },
  { number: '7', position: { row: 0, col: 1 }, label: '7' },
  { number: '8', position: { row: 0, col: 0 }, label: '8' }, // Upper right central incisor
  { number: '9', position: { row: 0, col: 8 }, label: '9' }, // Upper left central incisor
  { number: '10', position: { row: 0, col: 9 }, label: '10' },
  { number: '11', position: { row: 0, col: 10 }, label: '11' },
  { number: '12', position: { row: 0, col: 11 }, label: '12' },
  { number: '13', position: { row: 0, col: 12 }, label: '13' },
  { number: '14', position: { row: 0, col: 13 }, label: '14' },
  { number: '15', position: { row: 0, col: 14 }, label: '15' },
  { number: '16', position: { row: 0, col: 15 }, label: '16' }, // Upper left third molar
  
  // Lower arch (mandible)
  { number: '17', position: { row: 1, col: 15 }, label: '17' }, // Lower left third molar
  { number: '18', position: { row: 1, col: 14 }, label: '18' },
  { number: '19', position: { row: 1, col: 13 }, label: '19' },
  { number: '20', position: { row: 1, col: 12 }, label: '20' },
  { number: '21', position: { row: 1, col: 11 }, label: '21' },
  { number: '22', position: { row: 1, col: 10 }, label: '22' },
  { number: '23', position: { row: 1, col: 9 }, label: '23' },
  { number: '24', position: { row: 1, col: 8 }, label: '24' }, // Lower left central incisor
  { number: '25', position: { row: 1, col: 7 }, label: '25' }, // Lower right central incisor
  { number: '26', position: { row: 1, col: 6 }, label: '26' },
  { number: '27', position: { row: 1, col: 5 }, label: '27' },
  { number: '28', position: { row: 1, col: 4 }, label: '28' },
  { number: '29', position: { row: 1, col: 3 }, label: '29' },
  { number: '30', position: { row: 1, col: 2 }, label: '30' },
  { number: '31', position: { row: 1, col: 1 }, label: '31' },
  { number: '32', position: { row: 1, col: 0 }, label: '32' }, // Lower right third molar
];

export function Odontogram({ leadId, initialData, onSave, readOnly = false }: OdontogramProps) {
  const t = useTranslations('dental.odontogram');
  const tToasts = useTranslations('dental.toasts');
  const tCommon = useTranslations('common');
  
  const TOOTH_CONDITIONS = [
    { value: 'healthy', label: t('healthy'), color: 'bg-green-100 text-green-800' },
    { value: 'caries', label: t('caries'), color: 'bg-red-100 text-red-800' },
    { value: 'crown', label: t('crown'), color: 'bg-blue-100 text-blue-800' },
    { value: 'filling', label: t('filling'), color: 'bg-yellow-100 text-yellow-800' },
    { value: 'missing', label: t('missing'), color: 'bg-gray-100 text-gray-800' },
    { value: 'extraction', label: t('extraction'), color: 'bg-purple-100 text-purple-800' },
    { value: 'implant', label: t('implant'), color: 'bg-indigo-100 text-indigo-800' },
    { value: 'root_canal', label: t('rootCanal'), color: 'bg-orange-100 text-orange-800' },
  ];

  const [toothData, setToothData] = useState<OdontogramData>(initialData || {});
  const [selectedTooth, setSelectedTooth] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');

  useEffect(() => {
    if (initialData) {
      setToothData(initialData);
    }
  }, [initialData]);

  const handleToothClick = (toothNumber: string) => {
    if (readOnly) return;
    setSelectedTooth(toothNumber);
    const tooth = toothData[toothNumber];
    setNotes(tooth?.notes || '');
  };

  const handleConditionChange = (toothNumber: string, condition: string) => {
    if (readOnly) return;
    setToothData(prev => ({
      ...prev,
      [toothNumber]: {
        ...prev[toothNumber],
        condition,
        date: prev[toothNumber]?.date || new Date().toISOString().split('T')[0],
      },
    }));
  };

  const handleSaveNotes = () => {
    if (!selectedTooth || readOnly) return;
    setToothData(prev => ({
      ...prev,
      [selectedTooth]: {
        ...prev[selectedTooth],
        notes,
      },
    }));
    setSelectedTooth(null);
    setNotes('');
    toast.success(t('saved'));
  };

  const handleSave = async () => {
    if (readOnly || !onSave) return;
    
    try {
      setSaving(true);
      await onSave(toothData);
      toast.success(tToasts('odontogramSaved'));
    } catch (error: any) {
      toast.error(tToasts('odontogramSaveFailed') + ': ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (readOnly) return;
    setToothData({});
    setSelectedTooth(null);
    setNotes('');
    toast.info(t('resetConfirm'));
  };

  const getToothCondition = (toothNumber: string) => {
    return toothData[toothNumber]?.condition || 'healthy';
  };

  const getToothColor = (toothNumber: string) => {
    const condition = getToothCondition(toothNumber);
    const conditionConfig = TOOTH_CONDITIONS.find(c => c.value === condition);
    return conditionConfig?.color || 'bg-white border-2 border-gray-300';
  };

  // Helper function to get button variant
  const getButtonVariant = (mode: '2d' | '3d') => {
    return viewMode === mode ? 'default' : 'outline';
  };

  // Render 3D view if selected
  if (viewMode === '3d') {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t('title')} - {t('view3D')}</CardTitle>
                <CardDescription>
                  {t('description')}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={getButtonVariant('2d')}
                  size="sm"
                  onClick={() => setViewMode('2d')}
                >
                  <Grid3x3 className="h-4 w-4 mr-2" />
                  {t('view2D')}
                </Button>
                <Button
                  variant={getButtonVariant('3d')}
                  size="sm"
                  onClick={() => setViewMode('3d')}
                >
                  <Box className="h-4 w-4 mr-2" />
                  {t('view3D')}
                </Button>
                {!readOnly && (
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? tCommon('loading') : tCommon('save')}
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>
        <Odontogram3D
          leadId={leadId}
          toothData={toothData}
          onToothClick={(toothNumber) => handleToothClick(toothNumber)}
          readOnly={readOnly}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('title')}</CardTitle>
              <CardDescription>
                {t('description')}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant={getButtonVariant('2d')}
                size="sm"
                onClick={() => setViewMode('2d')}
              >
                <Grid3x3 className="h-4 w-4 mr-2" />
                {t('view2D')}
              </Button>
              <Button
                variant={getButtonVariant('3d')}
                size="sm"
                onClick={() => setViewMode('3d')}
              >
                <Box className="h-4 w-4 mr-2" />
                {t('view3D')}
              </Button>
              {!readOnly && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReset}
                    disabled={saving}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    {t('reset')}
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? tCommon('loading') : tCommon('save')}
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Tooth Chart Grid */}
          <div className="relative bg-white p-6 rounded-lg border-2 border-gray-200">
            {/* Upper Arch Label */}
            <div className="text-center mb-2 text-sm font-semibold text-gray-600">
              {t('upperArch')}
            </div>
            
            {/* Upper Arch */}
            <div className="grid grid-cols-16 gap-1 mb-4">
              {TOOTH_POSITIONS.filter(t => parseInt(t.number) <= 16).map(tooth => {
                const condition = getToothCondition(tooth.number);
                const colorClass = getToothColor(tooth.number);
                const hasData = !!toothData[tooth.number];
                
                return (
                  <button
                    key={tooth.number}
                    onClick={() => handleToothClick(tooth.number)}
                    disabled={readOnly}
                    className={`
                      ${colorClass}
                      h-12 w-12 rounded-md
                      flex items-center justify-center
                      font-semibold text-sm
                      transition-all duration-200
                      ${!readOnly ? 'hover:scale-110 hover:shadow-md cursor-pointer' : 'cursor-default'}
                      ${selectedTooth === tooth.number ? 'ring-2 ring-purple-500 ring-offset-2' : ''}
                      ${hasData ? 'border-2 border-purple-400' : ''}
                    `}
                    title={`Tooth ${tooth.number}${hasData ? ` - ${condition}` : ''}`}
                  >
                    {tooth.number}
                  </button>
                );
              })}
            </div>

            {/* Midline */}
            <div className="h-px bg-gray-300 my-2"></div>

            {/* Lower Arch Label */}
            <div className="text-center mt-4 mb-2 text-sm font-semibold text-gray-600">
              {t('lowerArch')}
            </div>

            {/* Lower Arch */}
            <div className="grid grid-cols-16 gap-1">
              {TOOTH_POSITIONS.filter(t => parseInt(t.number) > 16).map(tooth => {
                const condition = getToothCondition(tooth.number);
                const colorClass = getToothColor(tooth.number);
                const hasData = !!toothData[tooth.number];
                
                return (
                  <button
                    key={tooth.number}
                    onClick={() => handleToothClick(tooth.number)}
                    disabled={readOnly}
                    className={`
                      ${colorClass}
                      h-12 w-12 rounded-md
                      flex items-center justify-center
                      font-semibold text-sm
                      transition-all duration-200
                      ${!readOnly ? 'hover:scale-110 hover:shadow-md cursor-pointer' : 'cursor-default'}
                      ${selectedTooth === tooth.number ? 'ring-2 ring-purple-500 ring-offset-2' : ''}
                      ${hasData ? 'border-2 border-purple-400' : ''}
                    `}
                    title={`Tooth ${tooth.number}${hasData ? ` - ${condition}` : ''}`}
                  >
                    {tooth.number}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-semibold mb-2">{t('condition')}:</h4>
            <div className="flex flex-wrap gap-2">
              {TOOTH_CONDITIONS.map(condition => (
                <Badge key={condition.value} className={condition.color}>
                  {condition.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Tooth Editor Panel */}
          {selectedTooth && !readOnly && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>{t('toothNumber')} {selectedTooth}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>{t('condition')}</Label>
                  <Select
                    value={toothData[selectedTooth]?.condition || 'healthy'}
                    onValueChange={(value) => handleConditionChange(selectedTooth, value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TOOTH_CONDITIONS.map(condition => (
                        <SelectItem key={condition.value} value={condition.value}>
                          {condition.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>{t('date')}</Label>
                  <Input
                    type="date"
                    value={toothData[selectedTooth]?.date || new Date().toISOString().split('T')[0]}
                    onChange={(e) => {
                      setToothData(prev => ({
                        ...prev,
                        [selectedTooth]: {
                          ...prev[selectedTooth],
                          date: e.target.value,
                        },
                      }));
                    }}
                  />
                </div>

                <div>
                  <Label>{t('procedureCode')}</Label>
                  <Input
                    placeholder="e.g., D0120"
                    value={toothData[selectedTooth]?.procedureCode || ''}
                    onChange={(e) => {
                      setToothData(prev => ({
                        ...prev,
                        [selectedTooth]: {
                          ...prev[selectedTooth],
                          procedureCode: e.target.value,
                        },
                      }));
                    }}
                  />
                </div>

                <div>
                  <Label>{t('notes')}</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t('selectTooth')}
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSaveNotes} size="sm">
                    {t('save')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedTooth(null);
                      setNotes('');
                    }}
                  >
                    {tCommon('close')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
