/**
 * Form Responses Viewer Component
 * View submitted form responses for a patient
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { FileText, Calendar, User, Download } from 'lucide-react';

interface FormResponse {
  id: string;
  formId: string;
  form: {
    formName: string;
    formSchema: any;
  };
  responseData: Record<string, any>;
  submittedAt: string;
  submittedBy?: string;
  signatureData?: any;
}

interface FormResponsesViewerProps {
  leadId: string;
  formId?: string; // Optional: filter by specific form
}

export function FormResponsesViewer({ leadId, formId }: FormResponsesViewerProps) {
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string>(formId || 'all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadForms();
    loadResponses();
  }, [leadId, selectedFormId]);

  const loadForms = async () => {
    try {
      const response = await fetch('/api/dental/forms?type=templates');
      const data = await response.json();
      if (data.success) {
        setForms(data.forms || []);
      }
    } catch (error) {
      console.error('Failed to load forms:', error);
    }
  };

  const loadResponses = async () => {
    try {
      setLoading(true);
      let url = `/api/dental/forms?type=responses&leadId=${leadId}`;
      if (selectedFormId !== 'all') {
        url += `&formId=${selectedFormId}`;
      }

      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setResponses(data.responses || []);
      }
    } catch (error) {
      console.error('Failed to load responses:', error);
      toast.error('Failed to load form responses');
    } finally {
      setLoading(false);
    }
  };

  const renderFieldValue = (field: any, value: any) => {
    if (value === null || value === undefined || value === '') {
      return <span className="text-gray-400 italic">Not answered</span>;
    }

    switch (field.type) {
      case 'checkbox':
        return value ? 'Yes' : 'No';
      case 'date':
        return new Date(value).toLocaleDateString();
      case 'file':
        return <span className="text-blue-600">{value}</span>;
      default:
        return String(value);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Form Responses</CardTitle>
            <CardDescription>
              View submitted forms for this patient
            </CardDescription>
          </div>
          <Select value={selectedFormId} onValueChange={setSelectedFormId}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Forms</SelectItem>
              {forms.map((form) => (
                <SelectItem key={form.id} value={form.id}>
                  {form.formName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="text-center py-8">Loading responses...</div>
        ) : responses.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No form responses found for this patient.
          </div>
        ) : (
          <div className="space-y-4">
            {responses.map((response) => (
              <Card key={response.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        {response.form.formName}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-4 mt-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(response.submittedAt).toLocaleDateString()}
                        </span>
                        {response.submittedBy && (
                          <span className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {response.submittedBy}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    {response.signatureData && (
                      <Badge variant="outline">Signed</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {response.form.formSchema?.fields?.map((field: any) => (
                      <div key={field.id} className="border-b pb-2 last:border-0">
                        <div className="font-semibold text-sm text-gray-700 mb-1">
                          {field.label}
                        </div>
                        <div className="text-base">
                          {renderFieldValue(field, response.responseData[field.id])}
                        </div>
                      </div>
                    ))}
                  </div>
                  {response.signatureData && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="text-sm text-gray-600">
                        <strong>Signed by:</strong> {response.signatureData.signedBy || 'Unknown'}
                      </div>
                      {response.signatureData.signedAt && (
                        <div className="text-sm text-gray-600">
                          <strong>Signed on:</strong>{' '}
                          {new Date(response.signatureData.signedAt).toLocaleString()}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
