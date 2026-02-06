/**
 * Document Generator Component
 * Generate reports, letters, and documents with templates
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { FileText, Download, Save, Plus, Trash2 } from 'lucide-react';

interface DocumentTemplate {
  id?: string;
  name: string;
  type: 'report' | 'letter' | 'invoice' | 'treatment_plan';
  content: string;
  mergeFields?: string[];
}

interface DocumentGeneratorProps {
  leadId: string;
  onDocumentGenerated?: (documentId: string) => void;
}

const DEFAULT_TEMPLATES: DocumentTemplate[] = [
  {
    name: 'Treatment Report',
    type: 'report',
    content: `PATIENT TREATMENT REPORT

Patient: {{patientName}}
Date: {{date}}
Practitioner: {{practitionerName}}

TREATMENT SUMMARY:
{{treatmentSummary}}

RECOMMENDATIONS:
{{recommendations}}

Next Appointment: {{nextAppointment}}

{{signature}}`,
    mergeFields: ['patientName', 'date', 'practitionerName', 'treatmentSummary', 'recommendations', 'nextAppointment', 'signature'],
  },
  {
    name: 'Appointment Reminder Letter',
    type: 'letter',
    content: `Dear {{patientName}},

This is a reminder that you have an upcoming appointment scheduled for:

Date: {{appointmentDate}}
Time: {{appointmentTime}}
Type: {{appointmentType}}

Please arrive 15 minutes early. If you need to reschedule, please contact us at {{phoneNumber}}.

We look forward to seeing you!

Best regards,
{{practiceName}}`,
    mergeFields: ['patientName', 'appointmentDate', 'appointmentTime', 'appointmentType', 'phoneNumber', 'practiceName'],
  },
];

export function DocumentGenerator({ leadId, onDocumentGenerated }: DocumentGeneratorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [templates, setTemplates] = useState<DocumentTemplate[]>(DEFAULT_TEMPLATES);
  const [mergeData, setMergeData] = useState<Record<string, string>>({});
  const [generatedContent, setGeneratedContent] = useState('');
  const [documentName, setDocumentName] = useState('');
  const [saving, setSaving] = useState(false);
  const [patientData, setPatientData] = useState<any>(null);

  useEffect(() => {
    loadPatientData();
  }, [leadId]);

  const loadPatientData = async () => {
    try {
      const response = await fetch(`/api/leads/${leadId}`);
      if (response.ok) {
        const data = await response.json();
        setPatientData(data.lead);
        // Pre-fill merge data with patient info
        setMergeData({
          patientName: data.lead?.contactPerson || data.lead?.businessName || '',
          date: new Date().toLocaleDateString(),
          phoneNumber: data.lead?.phone || '',
          email: data.lead?.email || '',
        });
      }
    } catch (error) {
      console.error('Failed to load patient data:', error);
    }
  };

  const handleTemplateSelect = (template: DocumentTemplate) => {
    setSelectedTemplate(template);
    setGeneratedContent('');
    // Pre-fill merge fields with defaults
    const defaults: Record<string, string> = {
      patientName: patientData?.contactPerson || patientData?.businessName || '',
      date: new Date().toLocaleDateString(),
      phoneNumber: patientData?.phone || '',
      email: patientData?.email || '',
    };
    setMergeData(defaults);
  };

  const replaceMergeFields = (content: string, data: Record<string, string>) => {
    let result = content;
    Object.keys(data).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, data[key] || '');
    });
    return result;
  };

  const handlePreview = () => {
    if (!selectedTemplate) {
      toast.error('Please select a template');
      return;
    }

    const content = replaceMergeFields(selectedTemplate.content, mergeData);
    setGeneratedContent(content);
  };

  const handleSaveDocument = async () => {
    if (!selectedTemplate || !generatedContent) {
      toast.error('Please generate a document first');
      return;
    }

    if (!documentName.trim()) {
      toast.error('Please enter a document name');
      return;
    }

    try {
      setSaving(true);
      
      // Create a blob from the generated content
      const blob = new Blob([generatedContent], { type: 'text/plain' });
      const file = new File([blob], `${documentName}.txt`, { type: 'text/plain' });
      
      // Map template type to DocumentType enum
      const documentTypeMap: Record<string, string> = {
        'report': 'CORRESPONDENCE',
        'letter': 'CORRESPONDENCE',
        'invoice': 'INVOICE',
        'treatment_plan': 'TREATMENT_PLAN',
      };
      const documentType = documentTypeMap[selectedTemplate.type] || 'OTHER';

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('leadId', leadId);
      formData.append('documentType', documentType);
      formData.append('category', 'Generated Document');
      formData.append('description', `Generated ${selectedTemplate.type} document`);

      const response = await fetch('/api/dental/documents', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Document saved successfully');
        onDocumentGenerated?.(data.document.id);
        // Reset
        setGeneratedContent('');
        setDocumentName('');
        setSelectedTemplate(null);
      } else {
        toast.error(data.error || 'Failed to save document');
      }
    } catch (error: any) {
      toast.error('Failed to save document: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = () => {
    if (!generatedContent) {
      toast.error('Please generate a document first');
      return;
    }

    const blob = new Blob([generatedContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${documentName || 'document'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Document Generator</CardTitle>
        <CardDescription>
          Generate reports, letters, and documents using templates
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="templates" className="w-full">
          <TabsList>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="editor">Editor</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((template, idx) => (
                <Card
                  key={idx}
                  className={`cursor-pointer transition-all ${
                    selectedTemplate === template
                      ? 'border-purple-500 bg-purple-50'
                      : 'hover:border-gray-300'
                  }`}
                  onClick={() => handleTemplateSelect(template)}
                >
                  <CardHeader>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <CardDescription>
                      Type: {template.type.replace('_', ' ')}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="editor" className="space-y-4">
            {selectedTemplate ? (
              <>
                <div>
                  <Label>Document Name</Label>
                  <Input
                    value={documentName}
                    onChange={(e) => setDocumentName(e.target.value)}
                    placeholder="e.g., Treatment Report - John Doe"
                  />
                </div>

                <div>
                  <Label>Merge Fields</Label>
                  <div className="space-y-2 mt-2">
                    {selectedTemplate.mergeFields?.map((field) => (
                      <div key={field} className="flex items-center gap-2">
                        <Label className="w-32 text-sm">{field}:</Label>
                        <Input
                          value={mergeData[field] || ''}
                          onChange={(e) =>
                            setMergeData(prev => ({ ...prev, [field]: e.target.value }))
                          }
                          placeholder={`Enter ${field}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <Button onClick={handlePreview} className="w-full">
                  Generate Preview
                </Button>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Please select a template first
              </div>
            )}
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            {generatedContent ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Generated Document</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="whitespace-pre-wrap font-mono text-sm bg-gray-50 p-4 rounded border">
                      {generatedContent}
                    </pre>
                  </CardContent>
                </Card>

                <div className="flex gap-2">
                  <Button onClick={handleDownload} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <Button onClick={handleSaveDocument} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Saving...' : 'Save to Patient File'}
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Generate a document to see preview
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
