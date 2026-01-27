'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Brain, Loader2, TrendingUp } from 'lucide-react';
import { toast } from 'react-hot-toast';
import CallAnalysisCard from './CallAnalysisCard';
import type { ConversationAnalysis } from '@/lib/conversation-intelligence';

interface CallAnalysisButtonProps {
  callLogId: string;
  existingAnalysis?: ConversationAnalysis;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showLabel?: boolean;
}

export default function CallAnalysisButton({
  callLogId,
  existingAnalysis,
  variant = 'outline',
  size = 'sm',
  showLabel = true,
}: CallAnalysisButtonProps) {
  const [analysis, setAnalysis] = useState<ConversationAnalysis | null>(existingAnalysis || null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [open, setOpen] = useState(false);

  const handleAnalyze = async () => {
    if (analysis) {
      setOpen(true);
      return;
    }

    try {
      setIsAnalyzing(true);
      const response = await fetch('/api/conversations/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callLogId }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze conversation');
      }

      const data = await response.json();
      setAnalysis(data.analysis);
      setOpen(true);
      toast.success('Call analyzed successfully!');
    } catch (error) {
      console.error('Error analyzing call:', error);
      toast.error('Failed to analyze call');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          onClick={handleAnalyze}
          disabled={isAnalyzing}
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : analysis ? (
            <>
              <TrendingUp className="h-4 w-4 mr-2" />
              {showLabel && 'View Analysis'}
            </>
          ) : (
            <>
              <Brain className="h-4 w-4 mr-2" />
              {showLabel && 'Analyze Call'}
            </>
          )}
        </Button>
      </DialogTrigger>
      {analysis && (
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Call Analysis</DialogTitle>
            <DialogDescription>
              AI-powered insights from this conversation
            </DialogDescription>
          </DialogHeader>
          <CallAnalysisCard analysis={analysis} onClose={() => setOpen(false)} />
        </DialogContent>
      )}
    </Dialog>
  );
}
