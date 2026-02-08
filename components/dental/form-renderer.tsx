/**
 * Form Renderer Component
 * Renders forms for patients to fill out (tablet-optimized)
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Save, FileText } from 'lucide-react';

interface FormField {
  id: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'checkbox' | 'radio' | 'select' | 'file';
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
}

interface FormRendererProps {
  formId: string;
  leadId: string;
  formSchema: {
    fields: FormField[];
  };
  formName: string;
  description?: string;
  initialData?: Record<string, any>;
  onSave?: (responseData: Record<string, any>) => Promise<void>;
  readOnly?: boolean;
}

export function FormRenderer({
  formId,
  leadId,
  formSchema,
  formName,
  description,
  initialData,
  onSave,
  readOnly = false,
}: FormRendererProps) {
  const t = useTranslations('dental.forms.renderer');
  const tToasts = useTranslations('dental.toasts');
  const tCommon = useTranslations('common');
  
  const [formData, setFormData] = useState<Record<string, any>>(initialData || {});
  const [saving, setSaving] = useState(false);
  const [fileUploads, setFileUploads] = useState<Record<string, File>>({});

  const handleFieldChange = (fieldId: string, value: any) => {
    if (readOnly) return;
    setFormData(prev => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  const handleFileChange = (fieldId: string, file: File | null) => {
    if (readOnly || !file) return;
    setFileUploads(prev => ({
      ...prev,
      [fieldId]: file,
    }));
    // Store file name in form data
    setFormData(prev => ({
      ...prev,
      [fieldId]: file.name,
    }));
  };

  const validateForm = () => {
    for (const field of formSchema.fields) {
      if (field.required && !formData[field.id]) {
        toast.error(t('fillRequired', { label: field.label }));
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (readOnly || !onSave) return;

    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);
      await onSave(formData);
      toast.success(tToasts('formSubmitted'));
    } catch (error: any) {
      toast.error(tToasts('formSubmitFailed') + ': ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {formName}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>

      <CardContent className="space-y-6">
        {formSchema.fields.map((field) => (
          <div key={field.id} className="space-y-2">
            <Label>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>

            {field.type === 'text' && (
              <Input
                value={formData[field.id] || ''}
                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                placeholder={field.placeholder}
                disabled={readOnly}
                className="text-lg" // Tablet-optimized larger text
              />
            )}

            {field.type === 'textarea' && (
              <Textarea
                value={formData[field.id] || ''}
                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                placeholder={field.placeholder}
                rows={4}
                disabled={readOnly}
                className="text-lg"
              />
            )}

            {field.type === 'number' && (
              <Input
                type="number"
                value={formData[field.id] || ''}
                onChange={(e) => handleFieldChange(field.id, parseFloat(e.target.value) || '')}
                placeholder={field.placeholder}
                disabled={readOnly}
                className="text-lg"
              />
            )}

            {field.type === 'date' && (
              <Input
                type="date"
                value={formData[field.id] || ''}
                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                disabled={readOnly}
                className="text-lg"
              />
            )}

            {field.type === 'checkbox' && (
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData[field.id] || false}
                  onChange={(e) => handleFieldChange(field.id, e.target.checked)}
                  disabled={readOnly}
                  className="h-5 w-5"
                />
                <Label className="text-lg">{field.label}</Label>
              </div>
            )}

            {field.type === 'radio' && field.options && (
              <div className="space-y-2">
                {field.options.map((option, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <input
                      type="radio"
                      name={field.id}
                      value={option}
                      checked={formData[field.id] === option}
                      onChange={(e) => handleFieldChange(field.id, e.target.value)}
                      disabled={readOnly}
                      className="h-5 w-5"
                    />
                    <Label className="text-lg">{option}</Label>
                  </div>
                ))}
              </div>
            )}

            {field.type === 'select' && field.options && (
              <Select
                value={formData[field.id] || ''}
                onValueChange={(value) => handleFieldChange(field.id, value)}
                disabled={readOnly}
              >
                <SelectTrigger className="text-lg h-12">
                  <SelectValue placeholder={field.placeholder || 'Select...'} />
                </SelectTrigger>
                <SelectContent>
                  {field.options
                    .filter((option) => option !== '') // Filter out empty strings
                    .map((option, idx) => (
                      <SelectItem key={idx} value={option} className="text-lg">
                        {option}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}

            {field.type === 'file' && (
              <div>
                <Input
                  type="file"
                  onChange={(e) => handleFileChange(field.id, e.target.files?.[0] || null)}
                  disabled={readOnly}
                  className="text-lg"
                />
                {fileUploads[field.id] && (
                  <p className="text-sm text-gray-600 mt-1">
                    Selected: {fileUploads[field.id].name}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}

        {!readOnly && (
          <div className="pt-4 border-t">
            <Button
              onClick={handleSubmit}
              disabled={saving}
              size="lg"
              className="w-full text-lg py-6"
            >
              <Save className="h-5 w-5 mr-2" />
              {saving ? tCommon('loading') : t('submit')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
