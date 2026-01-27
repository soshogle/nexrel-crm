'use client';

import { useState, useEffect } from 'react';
import {
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  ListTodo,
  MessageSquare,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Suggestion {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: 'task' | 'follow_up' | 'deal' | 'insight' | 'warning';
  actionable: boolean;
  action?: {
    type: string;
    data?: any;
  };
}

interface AIInsightsPanelProps {
  entityType?: string;
  entityId?: string;
  className?: string;
}

export function AIInsightsPanel({
  entityType,
  entityId,
  className,
}: AIInsightsPanelProps) {
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  useEffect(() => {
    loadSuggestions();
  }, [entityType, entityId]);

  const loadSuggestions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (entityType) params.set('entityType', entityType);
      if (entityId) params.set('entityId', entityId);

      const response = await fetch(`/api/ai/suggestions?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to load suggestions');

      const data = await response.json();
      setSuggestions(data.suggestions || []);
    } catch (error) {
      console.error('Error loading suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'task':
        return <ListTodo className="h-4 w-4" />;
      case 'follow_up':
        return <MessageSquare className="h-4 w-4" />;
      case 'deal':
        return <TrendingUp className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Lightbulb className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            AI Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (suggestions.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            AI Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-50 text-green-600" />
            <p>All good! No immediate actions needed.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5" />
          AI Insights
          <Badge variant="secondary" className="ml-auto">
            {suggestions.length} suggestions
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {suggestions.map((suggestion) => (
          <SuggestionCard key={suggestion.id} suggestion={suggestion} />
        ))}
      </CardContent>
    </Card>
  );
}

function SuggestionCard({ suggestion }: { suggestion: Suggestion }) {
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'task':
        return <ListTodo className="h-4 w-4" />;
      case 'follow_up':
        return <MessageSquare className="h-4 w-4" />;
      case 'deal':
        return <TrendingUp className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Lightbulb className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div
      className={cn(
        'p-3 rounded-lg border transition-colors',
        getPriorityColor(suggestion.priority)
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex-shrink-0">{getCategoryIcon(suggestion.category)}</div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-semibold text-sm">{suggestion.title}</h4>
            {suggestion.priority === 'high' && (
              <Badge variant="destructive" className="text-xs shrink-0">
                High Priority
              </Badge>
            )}
          </div>
          <p className="text-xs opacity-90">{suggestion.description}</p>
          {suggestion.actionable && suggestion.action && (
            <Button
              size="sm"
              variant="outline"
              className="mt-2 h-7 text-xs bg-white/50 hover:bg-white"
              onClick={() => {
                // Handle action - this would route to the appropriate page or open a modal
                console.log('Action:', suggestion.action);
              }}
            >
              Take Action
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
