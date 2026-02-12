'use client';

import { useState } from 'react';
import { Hash, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface CodeSuggestion {
  code: string;
  description: string;
  section?: string;
}

interface CodeSuggestionsProps {
  noteText: string;
  profession?: string;
}

export function CodeSuggestions({ noteText, profession }: CodeSuggestionsProps) {
  const [loading, setLoading] = useState(false);
  const [codes, setCodes] = useState<CodeSuggestion[]>([]);
  const [type, setType] = useState<'icd10' | 'cdt'>('icd10');

  const fetchSuggestions = async () => {
    if (!noteText.trim()) {
      toast.error('Add note content first to suggest codes');
      return;
    }
    setLoading(true);
    setCodes([]);
    try {
      const res = await fetch('/api/docpen/codes/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          noteText: noteText.substring(0, 4000),
          profession: profession || 'GENERAL_PRACTICE',
        }),
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setCodes(data.codes || []);
      setType(data.type || 'icd10');
      if (!data.codes?.length) toast.info('No codes suggested');
    } catch {
      toast.error('Failed to suggest codes');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = (c: CodeSuggestion) => {
    const text = `${c.code} - ${c.description}`;
    navigator.clipboard.writeText(text);
    toast.success(`Copied: ${c.code}`);
  };

  if (codes.length === 0 && !loading) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={fetchSuggestions}
        disabled={!noteText.trim()}
        className="text-xs"
      >
        <Sparkles className="h-3 w-3 mr-1" />
        Suggest {profession && ['DENTIST', 'ORTHODONTIC'].includes(profession) ? 'CDT' : 'ICD-10'} codes
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <>
            <Hash className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              Suggested {type === 'cdt' ? 'CDT' : 'ICD-10'} codes
            </span>
            <Button variant="ghost" size="sm" onClick={fetchSuggestions} className="text-xs h-6">
              Refresh
            </Button>
          </>
        )}
      </div>
      {!loading && codes.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {codes.map((c) => (
            <Badge
              key={c.code}
              variant="secondary"
              className="cursor-pointer hover:bg-primary/20 text-xs font-mono"
              onClick={() => copyCode(c)}
            >
              {c.code}
              {c.description && (
                <span className="ml-1 opacity-80 font-normal truncate max-w-[120px]">
                  {c.description}
                </span>
              )}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
