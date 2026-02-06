/**
 * X-Ray Upload and AI Analysis Component
 * Supports DICOM files from major X-ray systems (Carestream, Planmeca, Sirona, Vatech)
 * Integrates with GPT-4 Vision for AI analysis
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Upload, File, X, CheckCircle2, AlertCircle, Brain, Image as ImageIcon, FileText } from 'lucide-react';

interface XRayUploadProps {
  leadId: string;
  userId: string;
  onUploadComplete?: () => void;
}

enum XRayType {
  PANORAMIC = 'PANORAMIC',
  BITEWING = 'BITEWING',
  PERIAPICAL = 'PERIAPICAL',
  CEPHALOMETRIC = 'CEPHALOMETRIC',
  CBCT = 'CBCT',
}

export function XRayUpload({ leadId, userId, onUploadComplete }: XRayUploadProps) {
  const t = useTranslations('dental.xray');
  const tToasts = useTranslations('dental.toasts');
  const tCommon = useTranslations('common');
  
  const [file, setFile] = useState<File | null>(null);
  const [xrayType, setXrayType] = useState<XRayType>(XRayType.PANORAMIC);
  const [dateTaken, setDateTaken] = useState(new Date().toISOString().split('T')[0]);
  const [teethIncluded, setTeethIncluded] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [xrays, setXrays] = useState<any[]>([]);
  const [selectedXray, setSelectedXray] = useState<any | null>(null);

  useEffect(() => {
    fetchXrays();
  }, [leadId]);

  const fetchXrays = async () => {
    try {
      const response = await fetch(`/api/dental/xrays?leadId=${leadId}`);
      if (response.ok) {
        const data = await response.json();
        setXrays(data);
      }
    } catch (error) {
      console.error('Error fetching X-rays:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);

      // Check if it's a DICOM file
      const isDicom = selectedFile.name.toLowerCase().endsWith('.dcm') || 
                     selectedFile.type === 'application/dicom' ||
                     selectedFile.type === 'application/x-dicom';

      // Create preview for image files (not DICOM - DICOM needs special handling)
      if (!isDicom && selectedFile.type.startsWith('image/')) {
        const url = URL.createObjectURL(selectedFile);
        setPreviewUrl(url);
      } else if (isDicom) {
        // DICOM files will be processed server-side
        setPreviewUrl(null);
        toast.info(t('dicomSelected'));
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error(t('selectFileError'));
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('leadId', leadId);
      formData.append('userId', userId);
      formData.append('xrayType', xrayType);
      formData.append('dateTaken', dateTaken);
      formData.append('teethIncluded', JSON.stringify(teethIncluded));
      formData.append('notes', notes);

      const response = await fetch('/api/dental/xrays', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(tToasts('xrayUploaded'));
        setFile(null);
        setPreviewUrl(null);
        setNotes('');
        setTeethIncluded([]);
        await fetchXrays();
        onUploadComplete?.();
      } else {
        toast.error(data.error || tToasts('xrayUploadFailed'));
      }
    } catch (error: any) {
      toast.error(tToasts('xrayUploadFailed') + ': ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleAnalyze = async (xrayId: string) => {
    try {
      setAnalyzing(true);
      const response = await fetch(`/api/dental/xrays/${xrayId}/analyze`, {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(tToasts('xrayAnalyzed'));
        await fetchXrays();
        setSelectedXray(data.xray);
      } else {
        toast.error(data.error || tToasts('xrayAnalyzeFailed'));
      }
    } catch (error: any) {
      toast.error(tToasts('xrayAnalyzeFailed') + ': ' + error.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const getXRayTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      PANORAMIC: t('panoramic'),
      BITEWING: t('bitewing'),
      PERIAPICAL: t('periapical'),
      CEPHALOMETRIC: t('cephalometric'),
      CBCT: t('cbct'),
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>
            {t('description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="upload">
            <TabsList>
              <TabsTrigger value="upload">{t('upload')}</TabsTrigger>
              <TabsTrigger value="xrays">{t('list')}</TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="file">{t('selectFile')} *</Label>
                  <Input
                    id="file"
                    type="file"
                    accept=".dcm,.dicom,image/*"
                    onChange={handleFileChange}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Supports DICOM (.dcm) files and standard image formats (PNG, JPG, etc.)
                  </p>
                </div>

                <div>
                  <Label htmlFor="xrayType">{t('xrayType')} *</Label>
                  <Select value={xrayType} onValueChange={(value: XRayType) => setXrayType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(XRayType).map((type) => (
                        <SelectItem key={type} value={type}>
                          {getXRayTypeLabel(type)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="dateTaken">{t('dateTaken')} *</Label>
                  <Input
                    id="dateTaken"
                    type="date"
                    value={dateTaken}
                    onChange={(e) => setDateTaken(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="teethIncluded">{t('teethIncluded')}</Label>
                  <Input
                    id="teethIncluded"
                    placeholder={t('teethPlaceholder')}
                    value={teethIncluded.join(',')}
                    onChange={(e) => {
                      const teeth = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
                      setTeethIncluded(teeth);
                    }}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Universal numbering system (1-32)
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="notes">{t('notes')}</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('notes')}
                  rows={3}
                />
              </div>

              {previewUrl && (
                <div>
                  <Label>{tCommon('preview') || 'Preview'}</Label>
                  <div className="mt-2 border rounded-lg p-4 bg-gray-50">
                    <img src={previewUrl} alt="X-ray preview" className="max-w-full h-auto max-h-96" />
                  </div>
                </div>
              )}

              <Button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? tCommon('loading') : t('uploadButton')}
              </Button>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Supported X-Ray Systems:</strong> Carestream, Planmeca, Sirona, Vatech (DICOM format)
                  <br />
                  <strong>AI Analysis:</strong> After upload, click "{t('analyze')}" to generate AI report using GPT-4 Vision
                </AlertDescription>
              </Alert>
            </TabsContent>

            <TabsContent value="xrays" className="space-y-4">
              {xrays.length === 0 ? (
                <div className="text-center py-12">
                  <File className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-muted-foreground">{t('noXrays')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {xrays.map((xray) => (
                    <Card key={xray.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold">{getXRayTypeLabel(xray.xrayType)}</h3>
                            <p className="text-sm text-muted-foreground">
                              {new Date(xray.dateTaken).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant="outline">{xray.xrayType}</Badge>
                        </div>

                        {xray.imageUrl && (
                          <div className="mb-3 border rounded overflow-hidden">
                            <img src={xray.imageUrl} alt="X-ray" className="w-full h-48 object-contain bg-gray-100" />
                          </div>
                        )}

                        {xray.aiAnalysis && (
                          <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded text-sm">
                            <div className="flex items-center gap-1 mb-1">
                              <Brain className="h-3 w-3 text-green-600" />
                              <span className="font-semibold text-green-800">AI Analyzed</span>
                            </div>
                            <p className="text-green-700 text-xs">
                              {xray.aiAnalysis.findings ? 'Findings available' : 'Analysis complete'}
                            </p>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedXray(xray)}
                          >
                            <FileText className="h-3 w-3 mr-1" />
                            {tCommon('view') || 'View'} {tCommon('details') || 'Details'}
                          </Button>
                          {!xray.aiAnalysis && (
                            <Button
                              size="sm"
                              onClick={() => handleAnalyze(xray.id)}
                              disabled={analyzing}
                            >
                              <Brain className="h-3 w-3 mr-1" />
                              {analyzing ? t('analyzing') : t('analyze')}
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* X-Ray Detail Modal */}
      {selectedXray && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t('title')} {tCommon('details') || 'Details'}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setSelectedXray(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedXray.imageUrl && (
              <div className="border rounded-lg p-4 bg-gray-50">
                <img src={selectedXray.imageUrl} alt="X-ray" className="max-w-full h-auto" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('xrayType')}</Label>
                <p className="font-semibold">{getXRayTypeLabel(selectedXray.xrayType)}</p>
              </div>
              <div>
                <Label>{t('dateTaken')}</Label>
                <p className="font-semibold">{new Date(selectedXray.dateTaken).toLocaleDateString()}</p>
              </div>
              {selectedXray.teethIncluded && selectedXray.teethIncluded.length > 0 && (
                <div>
                  <Label>{t('teethIncluded')}</Label>
                  <p className="font-semibold">{selectedXray.teethIncluded.join(', ')}</p>
                </div>
              )}
            </div>

            {selectedXray.aiAnalysis && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  {t('findings')}
                </h4>
                {selectedXray.aiAnalysis.findings && (
                  <div className="text-sm space-y-2">
                    <div>
                      <strong>{t('findings')}:</strong>
                      <p className="mt-1">{selectedXray.aiAnalysis.findings}</p>
                    </div>
                    {selectedXray.aiAnalysis.confidence && (
                      <div>
                        <strong>{tCommon('confidence') || 'Confidence'}:</strong> {(selectedXray.aiAnalysis.confidence * 100).toFixed(1)}%
                      </div>
                    )}
                    {selectedXray.aiAnalysis.recommendations && (
                      <div>
                        <strong>{t('recommendations')}:</strong>
                        <p className="mt-1">{selectedXray.aiAnalysis.recommendations}</p>
                      </div>
                    )}
                  </div>
                )}
                {!selectedXray.aiAnalysis.findings && (
                  <p className="text-sm text-muted-foreground">{t('noAnalysis')}</p>
                )}
              </div>
            )}

            {selectedXray.notes && (
              <div>
                <Label>{t('notes')}</Label>
                <p className="text-sm text-muted-foreground">{selectedXray.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
