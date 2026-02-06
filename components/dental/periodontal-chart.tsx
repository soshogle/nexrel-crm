/**
 * Dental Periodontal Chart Component
 * Interactive periodontal charting with pocket depth and BOP tracking
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Save, RotateCcw, History, TrendingUp } from 'lucide-react';

interface PeriodontalMeasurement {
  mesial?: { pd: number; bop: boolean; recession?: number; mobility?: number };
  buccal?: { pd: number; bop: boolean; recession?: number; mobility?: number };
  distal?: { pd: number; bop: boolean; recession?: number; mobility?: number };
  lingual?: { pd: number; bop: boolean; recession?: number; mobility?: number };
}

interface PeriodontalChartData {
  [toothNumber: string]: PeriodontalMeasurement;
}

interface PeriodontalChartProps {
  leadId: string;
  initialData?: PeriodontalChartData;
  onSave?: (data: PeriodontalChartData) => Promise<void>;
  readOnly?: boolean;
}

// Universal Numbering System: 1-32
const TOOTH_NUMBERS = Array.from({ length: 32 }, (_, i) => String(i + 1));

// Measurement sites for each tooth
const MEASUREMENT_SITES = ['mesial', 'buccal', 'distal', 'lingual'] as const;

export function PeriodontalChart({ leadId, initialData, onSave, readOnly = false }: PeriodontalChartProps) {
  const [chartData, setChartData] = useState<PeriodontalChartData>(initialData || {});
  const [selectedTooth, setSelectedTooth] = useState<string | null>(null);
  const [selectedSite, setSelectedSite] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [chartHistory, setChartHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (initialData) {
      setChartData(initialData);
    }
    loadChartHistory();
  }, [leadId]);

  const loadChartHistory = async () => {
    try {
      const response = await fetch(`/api/dental/periodontal?leadId=${leadId}`);
      const data = await response.json();
      if (data.success) {
        setChartHistory(data.charts || []);
      }
    } catch (error) {
      console.error('Failed to load chart history:', error);
    }
  };

  const handleMeasurementChange = (
    toothNumber: string,
    site: string,
    field: 'pd' | 'bop' | 'recession' | 'mobility',
    value: number | boolean
  ) => {
    if (readOnly) return;

    setChartData(prev => ({
      ...prev,
      [toothNumber]: {
        ...prev[toothNumber],
        [site]: {
          ...prev[toothNumber]?.[site as keyof PeriodontalMeasurement],
          [field]: value,
        },
      },
    }));
  };

  const getPocketDepthColor = (pd: number) => {
    if (pd <= 3) return 'bg-green-100 text-green-800';
    if (pd <= 5) return 'bg-yellow-100 text-yellow-800';
    if (pd <= 7) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  const handleSave = async () => {
    if (readOnly || !onSave) return;
    
    try {
      setSaving(true);
      await onSave(chartData);
      toast.success('Periodontal chart saved successfully');
      await loadChartHistory();
    } catch (error: any) {
      toast.error('Failed to save chart: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (readOnly) return;
    setChartData({});
    setSelectedTooth(null);
    setSelectedSite(null);
    setNotes('');
    toast.info('Chart reset');
  };

  const compareCharts = (chart1: any, chart2: any) => {
    // Simple comparison - can be enhanced
    const changes: string[] = [];
    const m1 = chart1.measurements || {};
    const m2 = chart2.measurements || {};
    
    Object.keys(m2).forEach(tooth => {
      const sites1 = m1[tooth] || {};
      const sites2 = m2[tooth] || {};
      
      MEASUREMENT_SITES.forEach(site => {
        const pd1 = sites1[site]?.pd || 0;
        const pd2 = sites2[site]?.pd || 0;
        if (pd1 !== pd2) {
          changes.push(`Tooth ${tooth} ${site}: ${pd1}mm → ${pd2}mm`);
        }
      });
    });
    
    return changes;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Periodontal Chart</CardTitle>
            <CardDescription>
              Record pocket depths, BOP, recession, and mobility for each tooth
            </CardDescription>
          </div>
          {!readOnly && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
              >
                <History className="h-4 w-4 mr-2" />
                History
              </Button>
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Chart'}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="chart" className="w-full">
          <TabsList>
            <TabsTrigger value="chart">Chart Entry</TabsTrigger>
            {chartHistory.length > 0 && (
              <TabsTrigger value="comparison">Comparison</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="chart" className="space-y-4">
            {/* Tooth Selection Grid */}
            <div className="grid grid-cols-8 gap-2 p-4 bg-gray-50 rounded-lg">
              {TOOTH_NUMBERS.map(toothNumber => {
                const toothData = chartData[toothNumber];
                const hasData = !!toothData;
                const hasBOP = Object.values(toothData || {}).some(
                  (site: any) => site?.bop
                );
                
                return (
                  <button
                    key={toothNumber}
                    onClick={() => {
                      setSelectedTooth(toothNumber);
                      setSelectedSite(null);
                    }}
                    disabled={readOnly}
                    className={`
                      p-2 rounded border-2 transition-all
                      ${selectedTooth === toothNumber 
                        ? 'border-purple-500 bg-purple-50' 
                        : hasData 
                          ? 'border-blue-300 bg-blue-50' 
                          : 'border-gray-200 bg-white'
                      }
                      ${hasBOP ? 'ring-2 ring-red-400' : ''}
                      ${!readOnly ? 'hover:shadow-md cursor-pointer' : 'cursor-default'}
                    `}
                  >
                    <div className="text-sm font-semibold">{toothNumber}</div>
                    {hasData && (
                      <div className="text-xs text-gray-600 mt-1">
                        {Object.keys(toothData).length} sites
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Measurement Entry */}
            {selectedTooth && (
              <Card>
                <CardHeader>
                  <CardTitle>Tooth {selectedTooth} - Measurements</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {MEASUREMENT_SITES.map(site => {
                      const siteData = chartData[selectedTooth]?.[site];
                      
                      return (
                        <div
                          key={site}
                          className={`p-4 rounded-lg border-2 ${
                            selectedSite === site
                              ? 'border-purple-500 bg-purple-50'
                              : 'border-gray-200'
                          }`}
                        >
                          <Label className="text-sm font-semibold capitalize mb-2 block">
                            {site}
                          </Label>
                          
                          <div className="space-y-2">
                            <div>
                              <Label className="text-xs">Pocket Depth (mm)</Label>
                              <Input
                                type="number"
                                min="0"
                                max="15"
                                step="0.5"
                                value={siteData?.pd || ''}
                                onChange={(e) =>
                                  handleMeasurementChange(
                                    selectedTooth,
                                    site,
                                    'pd',
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                disabled={readOnly}
                                className="h-8"
                              />
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={siteData?.bop || false}
                                onChange={(e) =>
                                  handleMeasurementChange(
                                    selectedTooth,
                                    site,
                                    'bop',
                                    e.target.checked
                                  )
                                }
                                disabled={readOnly}
                                className="h-4 w-4"
                              />
                              <Label className="text-xs">BOP</Label>
                            </div>
                            
                            <div>
                              <Label className="text-xs">Recession (mm)</Label>
                              <Input
                                type="number"
                                min="0"
                                max="10"
                                step="0.5"
                                value={siteData?.recession || ''}
                                onChange={(e) =>
                                  handleMeasurementChange(
                                    selectedTooth,
                                    site,
                                    'recession',
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                disabled={readOnly}
                                className="h-8"
                              />
                            </div>
                            
                            <div>
                              <Label className="text-xs">Mobility (0-3)</Label>
                              <Input
                                type="number"
                                min="0"
                                max="3"
                                value={siteData?.mobility || ''}
                                onChange={(e) =>
                                  handleMeasurementChange(
                                    selectedTooth,
                                    site,
                                    'mobility',
                                    parseInt(e.target.value) || 0
                                  )
                                }
                                disabled={readOnly}
                                className="h-8"
                              />
                            </div>
                            
                            {siteData?.pd && (
                              <Badge className={getPocketDepthColor(siteData.pd)}>
                                {siteData.pd}mm
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            <div>
              <Label>Chart Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={readOnly}
                placeholder="Add notes about this periodontal examination..."
                rows={3}
              />
            </div>
          </TabsContent>

          {chartHistory.length > 0 && (
            <TabsContent value="comparison" className="space-y-4">
              <div className="space-y-4">
                {chartHistory.slice(0, 2).map((chart, idx) => (
                  <Card key={chart.id}>
                    <CardHeader>
                      <CardTitle>
                        Chart from {new Date(chart.chartDate).toLocaleDateString()}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-gray-600">
                        Charted by: {chart.chartedBy}
                      </div>
                      {chart.notes && (
                        <div className="mt-2 text-sm">{chart.notes}</div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                
                {chartHistory.length >= 2 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Changes Detected
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1">
                        {compareCharts(chartHistory[1], chartHistory[0]).map((change, idx) => (
                          <div key={idx} className="text-sm text-gray-700">
                            • {change}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}
