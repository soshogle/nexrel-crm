'use client';

import { useState, useEffect } from 'react';
import { FileText, RefreshCw, Edit3, Check, X, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

interface SOAPNote {
  id: string;
  version: number;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  additionalNotes?: string;
  aiModel?: string;
  processingTime?: number;
  isCurrentVersion: boolean;
  editedByUser: boolean;
}

interface SOAPNoteEditorProps {
  sessionId: string;
  soapNote: SOAPNote | null;
  readOnly?: boolean;
  onUpdate?: (note: SOAPNote) => void;
  onGenerate?: () => void;
}

type SectionKey = 'subjective' | 'objective' | 'assessment' | 'plan' | 'additionalNotes';

export function SOAPNoteEditor({
  sessionId,
  soapNote,
  readOnly = false,
  onUpdate,
  onGenerate,
}: SOAPNoteEditorProps) {
  const t = useTranslations('toasts.docpen');
  const tCommon = useTranslations('common');
  const [editingSection, setEditingSection] = useState<SectionKey | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [isRegenerating, setIsRegenerating] = useState<SectionKey | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const sections: { key: SectionKey; title: string; description: string; color: string }[] = [
    {
      key: 'subjective',
      title: 'Subjective',
      description: "Patient's reported symptoms, history, and complaints",
      color: 'bg-blue-500',
    },
    {
      key: 'objective',
      title: 'Objective',
      description: 'Clinical findings, exam results, measurements',
      color: 'bg-green-500',
    },
    {
      key: 'assessment',
      title: 'Assessment',
      description: 'Diagnosis, clinical impression, ICD-10 codes',
      color: 'bg-yellow-500',
    },
    {
      key: 'plan',
      title: 'Plan',
      description: 'Treatment plan, medications, follow-up',
      color: 'bg-purple-500',
    },
    {
      key: 'additionalNotes',
      title: 'Additional Notes',
      description: 'Specialty-specific documentation, charting',
      color: 'bg-gray-500',
    },
  ];

  const handleEdit = (key: SectionKey) => {
    setEditingSection(key);
    setEditedContent(soapNote?.[key] || '');
  };

  const handleSave = async () => {
    if (!editingSection || !soapNote) return;

    try {
      // Here we would save the edited content via API
      // For now, just update the local state
      toast.success(t('sectionUpdated', { section: editingSection }));
      setEditingSection(null);
    } catch (error) {
      toast.error(t('saveFailed'));
    }
  };

  const handleCancel = () => {
    setEditingSection(null);
    setEditedContent('');
  };

  const handleRegenerate = async (key: SectionKey) => {
    if (!soapNote) return;

    setIsRegenerating(key);
    try {
      const response = await fetch('/api/docpen/soap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          section: key,
        }),
      });

      if (!response.ok) throw new Error('Failed to regenerate');

      const result = await response.json();
      onUpdate?.(result.soapNote);
      toast.success(t('sectionRegenerated', { key }));
    } catch (error) {
      toast.error(t('regenerateFailed'));
    } finally {
      setIsRegenerating(null);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/docpen/soap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) throw new Error('Failed to generate');

      const result = await response.json();
      onUpdate?.(result.soapNote);
      toast.success(t('soapNoteGenerated'));
      onGenerate?.();
    } catch (error) {
      toast.error(t('soapNoteGenerationFailed'));
    } finally {
      setIsGenerating(false);
    }
  };

  if (!soapNote) {
    return (
      <Card className="border-2 border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No SOAP Note Yet</h3>
          <p className="text-muted-foreground text-center mb-4">
            Complete the recording and generate a SOAP note from the transcription.
          </p>
          <Button onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate SOAP Note
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            SOAP Note
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Version {soapNote.version}</Badge>
            {soapNote.editedByUser && (
              <Badge variant="secondary">Edited</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" defaultValue={['subjective', 'objective', 'assessment', 'plan']}>
          {sections.map(({ key, title, description, color }) => (
            <AccordionItem key={key} value={key}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${color}`} />
                  <span className="font-semibold">{title}</span>
                  {!soapNote[key] && (
                    <Badge variant="outline" className="text-xs">Empty</Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="pl-5">
                  <p className="text-xs text-muted-foreground mb-3">{description}</p>
                  
                  {editingSection === key ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        rows={8}
                        className="font-mono text-sm"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSave}>
                          <Check className="h-4 w-4 mr-1" /> {tCommon('save')}
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancel}>
                          <X className="h-4 w-4 mr-1" /> {tCommon('cancel')}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="bg-muted/50 rounded-lg p-4 whitespace-pre-wrap text-sm">
                        {soapNote[key] || (
                          <span className="text-muted-foreground italic">No content</span>
                        )}
                      </div>
                      {!readOnly && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(key)}
                          >
                            <Edit3 className="h-4 w-4 mr-1" /> Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRegenerate(key)}
                            disabled={isRegenerating === key}
                          >
                            {isRegenerating === key ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4 mr-1" />
                            )}
                            Regenerate
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {soapNote.processingTime && (
          <p className="text-xs text-muted-foreground mt-4">
            Generated in {(soapNote.processingTime / 1000).toFixed(2)}s
          </p>
        )}
      </CardContent>
    </Card>
  );
}
