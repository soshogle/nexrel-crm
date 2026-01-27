
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  Plus, 
  RefreshCw, 
  Lightbulb,
  TrendingUp,
  Loader2,
  Check,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

interface AISuggestion {
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  category: string;
  dueDate?: string;
  estimatedHours?: number;
  tags?: string[];
  confidence: number;
  reasoning: string;
}

interface AISuggestionsPanelProps {
  leadId?: string;
  dealId?: string;
  contactId?: string;
  eventType?: string;
  onTaskCreated?: () => void;
}

export default function AISuggestionsPanel({
  leadId,
  dealId,
  contactId,
  eventType,
  onTaskCreated,
}: AISuggestionsPanelProps) {
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState<Set<number>>(new Set());
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (leadId || dealId || contactId || eventType) {
      fetchSuggestions();
    }
  }, [leadId, dealId, contactId, eventType]);

  const fetchSuggestions = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/tasks/ai-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          dealId,
          contactId,
          eventType,
        }),
      });

      if (!response.ok) throw new Error('Failed to fetch suggestions');

      const data = await response.json();
      setSuggestions(data.suggestions || []);
    } catch (error: any) {
      console.error('Error fetching suggestions:', error);
      toast.error('Failed to load AI suggestions');
    } finally {
      setIsLoading(false);
    }
  };

  const createTaskFromSuggestion = async (suggestion: AISuggestion, index: number) => {
    if (isCreating.has(index)) return;

    setIsCreating(new Set(isCreating).add(index));

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: suggestion.title,
          description: suggestion.description,
          priority: suggestion.priority,
          category: suggestion.category || null,
          dueDate: suggestion.dueDate,
          estimatedHours: suggestion.estimatedHours,
          tags: suggestion.tags || [],
          leadId: leadId || null,
          dealId: dealId || null,
          aiSuggested: true,
          aiContext: {
            confidence: suggestion.confidence,
            reasoning: suggestion.reasoning,
          },
        }),
      });

      if (!response.ok) throw new Error('Failed to create task');

      toast.success('Task created from AI suggestion');
      
      // Remove suggestion from list
      setSuggestions(suggestions.filter((_, i) => i !== index));
      
      if (onTaskCreated) {
        onTaskCreated();
      }
    } catch (error: any) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
    } finally {
      const newSet = new Set(isCreating);
      newSet.delete(index);
      setIsCreating(newSet);
    }
  };

  const dismissSuggestion = (index: number) => {
    setDismissed(new Set(dismissed).add(index));
    toast.info('Suggestion dismissed');
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'HIGH': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'MEDIUM': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'LOW': return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-500';
    if (confidence >= 75) return 'text-blue-500';
    if (confidence >= 60) return 'text-yellow-500';
    return 'text-gray-500';
  };

  const visibleSuggestions = suggestions.filter((_, index) => !dismissed.has(index));

  if (isLoading) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </CardContent>
      </Card>
    );
  }

  if (visibleSuggestions.length === 0) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            <CardTitle className="text-white">AI Task Suggestions</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Lightbulb className="h-12 w-12 mx-auto text-gray-600 mb-4" />
            <p className="text-gray-400">No AI suggestions available at the moment</p>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchSuggestions}
              className="mt-4 border-gray-700 text-gray-400 hover:text-white"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Suggestions
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Sparkles className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                AI Task Suggestions
                <Badge variant="outline" className="border-purple-500/20 text-purple-400">
                  {visibleSuggestions.length}
                </Badge>
              </CardTitle>
              <CardDescription className="text-gray-400">
                Intelligent recommendations based on your activity
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchSuggestions}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {visibleSuggestions.map((suggestion, index) => (
            <div
              key={index}
              className="p-4 bg-gray-800/50 border border-gray-700 hover:border-purple-500/50 rounded-lg transition-all"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={getPriorityColor(suggestion.priority)}>
                      {suggestion.priority}
                    </Badge>
                    {suggestion.category && (
                      <Badge variant="outline" className="border-gray-700 text-gray-400">
                        {suggestion.category}
                      </Badge>
                    )}
                    <div className="flex items-center gap-1 text-xs">
                      <TrendingUp className={`h-3 w-3 ${getConfidenceColor(suggestion.confidence)}`} />
                      <span className={getConfidenceColor(suggestion.confidence)}>
                        {suggestion.confidence}% confidence
                      </span>
                    </div>
                  </div>
                  <h4 className="font-medium text-white mb-1">{suggestion.title}</h4>
                  <p className="text-sm text-gray-400 line-clamp-2">{suggestion.description}</p>
                  
                  {suggestion.tags && suggestion.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {suggestion.tags.map((tag, tagIndex) => (
                        <span
                          key={tagIndex}
                          className="text-xs px-2 py-0.5 bg-gray-700/50 text-gray-300 rounded"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                    {suggestion.estimatedHours && (
                      <span>⏱️ {suggestion.estimatedHours}h</span>
                    )}
                    {suggestion.dueDate && (
                      <span>
                        📅 {new Date(suggestion.dueDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  <div className="mt-2 p-2 bg-purple-500/5 border border-purple-500/10 rounded text-xs text-gray-400">
                    <span className="font-medium text-purple-400">AI Insight:</span> {suggestion.reasoning}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => createTaskFromSuggestion(suggestion, index)}
                    disabled={isCreating.has(index)}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  >
                    {isCreating.has(index) ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-1" />
                        Create
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => dismissSuggestion(index)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {visibleSuggestions.length > 2 && (
          <div className="mt-4 p-3 bg-blue-500/5 border border-blue-500/10 rounded text-sm text-center">
            <span className="text-blue-400 font-medium">💡 Pro Tip:</span>
            <span className="text-gray-400 ml-2">
              Review all suggestions and create the most relevant tasks to stay organized
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
