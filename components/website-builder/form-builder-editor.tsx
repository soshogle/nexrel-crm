'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, GripVertical, ChevronRight } from 'lucide-react';
import type { FormConfig, FormField } from '@/lib/website-builder/types';

interface FormBuilderEditorProps {
  config: FormConfig;
  onChange: (config: FormConfig) => void;
}

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'select', label: 'Dropdown' },
  { value: 'radio', label: 'Radio' },
  { value: 'checkbox', label: 'Checkbox' },
];

const CONDITIONAL_OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'notEmpty', label: 'Not empty' },
  { value: 'contains', label: 'Contains' },
];

export function FormBuilderEditor({ config, onChange }: FormBuilderEditorProps) {
  const [editingField, setEditingField] = useState<string | null>(null);

  const updateFields = (fields: FormField[]) => {
    onChange({ ...config, fields });
  };

  const addField = () => {
    const id = `field_${Date.now()}`;
    const newField: FormField = {
      name: id,
      type: 'text',
      label: 'New Field',
      required: false,
    };
    updateFields([...config.fields, newField]);
    setEditingField(id);
  };

  const removeField = (name: string) => {
    updateFields(config.fields.filter((f) => f.name !== name));
    setEditingField(null);
  };

  const updateField = (name: string, updates: Partial<FormField>) => {
    updateFields(
      config.fields.map((f) =>
        f.name === name ? { ...f, ...updates } : f
      )
    );
  };

  const addStep = () => {
    const stepId = `step_${Date.now()}`;
    const steps = config.steps || [];
    onChange({
      ...config,
      steps: [...steps, { id: stepId, title: 'New Step', fieldIds: [] }],
    });
  };

  const updateStep = (stepId: string, updates: { title?: string; fieldIds?: string[] }) => {
    const steps = (config.steps || []).map((s) =>
      s.id === stepId ? { ...s, ...updates } : s
    );
    onChange({ ...config, steps: steps as FormConfig['steps'] });
  };

  const toggleMultiStep = () => {
    if (config.steps && config.steps.length > 0) {
      onChange({ ...config, steps: undefined });
    } else {
      onChange({
        ...config,
        steps: config.fields.length > 0
          ? [{ id: 'step1', title: 'Step 1', fieldIds: config.fields.map((f) => f.name) }]
          : [{ id: 'step1', title: 'Step 1', fieldIds: [] }],
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Multi-step form</Label>
        <Switch
          checked={!!config.steps?.length}
          onCheckedChange={toggleMultiStep}
        />
      </div>

      {config.steps && config.steps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Steps</CardTitle>
            <Button size="sm" variant="outline" onClick={addStep}>
              <Plus className="h-4 w-4 mr-1" />
              Add Step
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {config.steps.map((step, idx) => (
              <div key={step.id} className="flex items-center gap-2 p-2 rounded border">
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <Input
                  value={step.title}
                  onChange={(e) => updateStep(step.id, { title: e.target.value })}
                  placeholder="Step title"
                  className="flex-1"
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Fields</CardTitle>
          <Button size="sm" variant="outline" onClick={addField}>
            <Plus className="h-4 w-4 mr-1" />
            Add Field
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {config.fields.map((field) => (
            <div
              key={field.name}
              className="border rounded-lg p-3 space-y-2"
            >
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <Input
                  value={field.label || ''}
                  onChange={(e) => updateField(field.name, { label: e.target.value })}
                  placeholder="Label"
                />
                <Input
                  value={field.name}
                  onChange={(e) => updateField(field.name, { name: e.target.value })}
                  placeholder="Field name"
                  className="font-mono text-sm"
                />
                <Select
                  value={field.type}
                  onValueChange={(v) => updateField(field.name, { type: v })}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-1">
                  <Switch
                    checked={!!field.required}
                    onCheckedChange={(c) => updateField(field.name, { required: c })}
                  />
                  <span className="text-xs">Required</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => removeField(field.name)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {editingField === field.name && (
                <div className="pl-6 space-y-2 border-l-2 border-muted">
                  <Label className="text-xs">Conditional display</Label>
                  <div className="flex gap-2 flex-wrap">
                    <Input
                      value={field.conditional?.field || ''}
                      onChange={(e) =>
                        updateField(field.name, {
                          conditional: {
                            ...field.conditional,
                            field: e.target.value,
                            operator: field.conditional?.operator || 'equals',
                            value: field.conditional?.value || '',
                          } as any,
                        })
                      }
                      placeholder="Show when field"
                      className="max-w-[140px]"
                    />
                    <Select
                      value={field.conditional?.operator || 'equals'}
                      onValueChange={(v: 'equals' | 'notEmpty' | 'contains') =>
                        updateField(field.name, {
                          conditional: {
                            ...field.conditional,
                            field: field.conditional?.field || '',
                            operator: v,
                            value: field.conditional?.value || '',
                          } as any,
                        })
                      }
                    >
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONDITIONAL_OPERATORS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={field.conditional?.value || ''}
                      onChange={(e) =>
                        updateField(field.name, {
                          conditional: {
                            ...field.conditional,
                            field: field.conditional?.field || '',
                            operator: field.conditional?.operator || 'equals',
                            value: e.target.value,
                          } as any,
                        })
                      }
                      placeholder="Value"
                      className="max-w-[100px]"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        updateField(field.name, { conditional: undefined });
                        setEditingField(null);
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                  {config.steps?.length && (
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">Step</Label>
                      <Select
                        value={String(field.step ?? '')}
                        onValueChange={(v) => updateField(field.name, { step: v ? parseInt(v, 10) : undefined })}
                      >
                        <SelectTrigger className="w-[100px]">
                          <SelectValue placeholder="Any" />
                        </SelectTrigger>
                        <SelectContent>
                          {config.steps.map((s, i) => (
                            <SelectItem key={s.id} value={String(i + 1)}>
                              {s.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="text-xs"
                onClick={() => setEditingField(editingField === field.name ? null : field.name)}
              >
                {editingField === field.name ? 'Hide options' : 'Conditional / Step'}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
