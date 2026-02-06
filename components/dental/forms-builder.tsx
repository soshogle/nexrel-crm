/**
 * Dynamic Forms Builder Component
 * Drag-and-drop form creator with field types
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
import { Save, Plus, Trash2, GripVertical, Eye, FileText } from 'lucide-react';

interface FormField {
  id: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'checkbox' | 'radio' | 'select' | 'file';
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[]; // For radio/select
  validation?: any;
}

interface FormsBuilderProps {
  userId: string;
  onFormCreated?: () => void;
}

export function FormsBuilder({ userId, onFormCreated }: FormsBuilderProps) {
  const [formName, setFormName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [fields, setFields] = useState<FormField[]>([]);
  const t = useTranslations('dental.forms.builder');
  const tToasts = useTranslations('dental.toasts');
  const tCommon = useTranslations('common');
  
  const [selectedField, setSelectedField] = useState<FormField | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [saving, setSaving] = useState(false);

  const fieldTypes = [
    { value: 'text', label: 'Text Input' },
    { value: 'textarea', label: 'Text Area' },
    { value: 'number', label: 'Number' },
    { value: 'date', label: 'Date' },
    { value: 'checkbox', label: 'Checkbox' },
    { value: 'radio', label: 'Radio Button' },
    { value: 'select', label: 'Dropdown' },
    { value: 'file', label: 'File Upload' },
  ];

  const addField = (type: FormField['type']) => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type,
      label: `New ${type} field`,
      required: false,
      ...(type === 'radio' || type === 'select' ? { options: ['Option 1', 'Option 2'] } : {}),
    };
    setFields([...fields, newField]);
    setSelectedField(newField);
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    setFields(fields.map(f => (f.id === id ? { ...f, ...updates } : f)));
    if (selectedField?.id === id) {
      setSelectedField({ ...selectedField, ...updates });
    }
  };

  const removeField = (id: string) => {
    setFields(fields.filter(f => f.id !== id));
    if (selectedField?.id === id) {
      setSelectedField(null);
    }
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error(t('nameRequired'));
      return;
    }

    if (fields.length === 0) {
      toast.error(t('fieldsRequired'));
      return;
    }

    try {
      setSaving(true);
      const response = await fetch('/api/dental/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'template',
          formName,
          formSchema: {
            fields: fields.map(f => ({
              id: f.id,
              type: f.type,
              label: f.label,
              required: f.required,
              placeholder: f.placeholder,
              options: f.options,
            })),
          },
          category,
          description,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(tToasts('formSaved'));
        setFormName('');
        setDescription('');
        setCategory('');
        setFields([]);
        setSelectedField(null);
        onFormCreated?.();
      } else {
        toast.error(data.error || tToasts('formSaveFailed'));
      }
    } catch (error: any) {
      toast.error(tToasts('formSaveFailed') + ': ' + error.message);
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
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setPreviewMode(!previewMode)}>
              <Eye className="h-4 w-4 mr-2" />
              {previewMode ? tCommon('edit') : tCommon('preview') || 'Preview'}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? tCommon('loading') : t('save')}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {!previewMode ? (
          <div className="space-y-4">
            {/* Form Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>{t('formName')} *</Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder={t('formName')}
                />
              </div>
              <div>
                <Label>{tCommon('category') || 'Category'}</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder={`${tCommon('select') || 'Select'} ${tCommon('category') || 'category'}`} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Medical History">Medical History</SelectItem>
                    <SelectItem value="Consent">Consent</SelectItem>
                    <SelectItem value="Treatment">Treatment</SelectItem>
                    <SelectItem value="Insurance">Insurance</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>{tCommon('description') || 'Description'}</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={tCommon('description') || 'Form description...'}
                rows={2}
              />
            </div>

            {/* Field Types */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('addField')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {fieldTypes.map(type => (
                    <Button
                      key={type.value}
                      variant="outline"
                      onClick={() => addField(type.value as FormField['type'])}
                      className="h-auto py-3 flex-col"
                    >
                      <Plus className="h-4 w-4 mb-1" />
                      <span className="text-xs">{type.label}</span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Fields List */}
            {fields.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t('title')} ({fields.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className={`p-4 border rounded-lg ${
                        selectedField?.id === field.id ? 'border-purple-500 bg-purple-50' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2 flex-1">
                          <GripVertical className="h-5 w-5 text-gray-400" />
                          <Badge variant="outline">#{index + 1}</Badge>
                          <div>
                            <div className="font-semibold">{field.label}</div>
                            <div className="text-xs text-gray-500">
                              {field.type} {field.required && '(Required)'}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedField(field);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeField(field.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Field Editor */}
            {selectedField && (
              <Card>
                <CardHeader>
                  <CardTitle>Edit Field: {selectedField.label}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Field Label</Label>
                    <Input
                      value={selectedField.label}
                      onChange={(e) =>
                        updateField(selectedField.id, { label: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Placeholder</Label>
                    <Input
                      value={selectedField.placeholder || ''}
                      onChange={(e) =>
                        updateField(selectedField.id, { placeholder: e.target.value })
                      }
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedField.required}
                      onChange={(e) =>
                        updateField(selectedField.id, { required: e.target.checked })
                      }
                    />
                    <Label>Required field</Label>
                  </div>
                  {(selectedField.type === 'radio' || selectedField.type === 'select') && (
                    <div>
                      <Label>Options (one per line)</Label>
                      <Textarea
                        value={selectedField.options?.join('\n') || ''}
                        onChange={(e) =>
                          updateField(selectedField.id, {
                            options: e.target.value.split('\n').filter(Boolean),
                          })
                        }
                        rows={4}
                        placeholder="Option 1&#10;Option 2&#10;Option 3"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{formName || 'Form Preview'}</CardTitle>
                {description && <CardDescription>{description}</CardDescription>}
              </CardHeader>
              <CardContent className="space-y-4">
                {fields.map(field => (
                  <div key={field.id}>
                    <Label>
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </Label>
                    {field.type === 'text' && (
                      <Input placeholder={field.placeholder} disabled />
                    )}
                    {field.type === 'textarea' && (
                      <Textarea placeholder={field.placeholder} rows={3} disabled />
                    )}
                    {field.type === 'number' && (
                      <Input type="number" placeholder={field.placeholder} disabled />
                    )}
                    {field.type === 'date' && (
                      <Input type="date" disabled />
                    )}
                    {field.type === 'checkbox' && (
                      <div className="flex items-center gap-2">
                        <input type="checkbox" disabled />
                        <Label>{field.label}</Label>
                      </div>
                    )}
                    {(field.type === 'radio' || field.type === 'select') && field.options && (
                      field.type === 'radio' ? (
                        <div className="space-y-2">
                          {field.options.map((opt, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <input type="radio" name={field.id} disabled />
                              <Label>{opt}</Label>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <Select disabled>
                          <SelectTrigger>
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            {field.options.map((opt, idx) => (
                              <SelectItem key={idx} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )
                    )}
                    {field.type === 'file' && (
                      <Input type="file" disabled />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
