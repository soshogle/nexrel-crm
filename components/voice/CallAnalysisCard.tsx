'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MessageSquare, TrendingUp, Target, Lightbulb, CheckCircle } from 'lucide-react';
import type { ConversationAnalysis } from '@/lib/conversation-intelligence';

interface CallAnalysisCardProps {
  analysis: ConversationAnalysis;
  onClose?: () => void;
}

export default function CallAnalysisCard({ analysis, onClose }: CallAnalysisCardProps) {
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'text-green-600 bg-green-50';
      case 'negative':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getOutcomeColor = (outcome: string) => {
    const colors: Record<string, string> = {
      sale: 'bg-green-100 text-green-800',
      follow_up: 'bg-blue-100 text-blue-800',
      callback_scheduled: 'bg-purple-100 text-purple-800',
      objection: 'bg-yellow-100 text-yellow-800',
      no_interest: 'bg-red-100 text-red-800',
      information_provided: 'bg-gray-100 text-gray-800',
    };
    return colors[outcome] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-4">
      {/* Overall Sentiment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Conversation Sentiment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Badge className={getSentimentColor(analysis.sentiment.overall)} variant="outline">
              {analysis.sentiment.overall.toUpperCase()}
            </Badge>
            <span className="text-2xl font-bold">
              {(analysis.sentiment.score * 100).toFixed(0)}%
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground mb-1">Customer Sentiment</p>
              <Badge variant="secondary">{analysis.sentiment.customer_sentiment}</Badge>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Agent Sentiment</p>
              <Badge variant="secondary">{analysis.sentiment.agent_sentiment}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Call Outcome */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Call Outcome
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <Badge className={getOutcomeColor(analysis.callOutcome.outcome)}>
              {analysis.callOutcome.outcome.replace('_', ' ').toUpperCase()}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {(analysis.callOutcome.confidence * 100).toFixed(0)}% confidence
            </span>
          </div>
          <p className="text-sm">{analysis.callOutcome.notes}</p>
        </CardContent>
      </Card>

      {/* Quality Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Quality Score: {analysis.quality.score}%
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Clarity</span>
                <span>{analysis.quality.metrics.clarity}%</span>
              </div>
              <Progress value={analysis.quality.metrics.clarity} />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Professionalism</span>
                <span>{analysis.quality.metrics.professionalism}%</span>
              </div>
              <Progress value={analysis.quality.metrics.professionalism} />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Engagement</span>
                <span>{analysis.quality.metrics.engagement}%</span>
              </div>
              <Progress value={analysis.quality.metrics.engagement} />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Resolution</span>
                <span>{analysis.quality.metrics.resolution}%</span>
              </div>
              <Progress value={analysis.quality.metrics.resolution} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lead Scoring Impact */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Lead Scoring Impact
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Score Adjustment</span>
            <Badge
              variant={analysis.leadScoringImpact.scoreAdjustment > 0 ? 'default' : 'destructive'}
            >
              {analysis.leadScoringImpact.scoreAdjustment > 0 ? '+' : ''}
              {analysis.leadScoringImpact.scoreAdjustment}
            </Badge>
          </div>
          <p className="text-sm">{analysis.leadScoringImpact.reason}</p>
        </CardContent>
      </Card>

      {/* Key Phrases */}
      {analysis.keyPhrases.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Key Phrases
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {analysis.keyPhrases.map((phrase, index) => (
                <Badge key={index} variant="outline">
                  {phrase}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insights */}
      {analysis.insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analysis.insights.map((insight, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Next Actions */}
      {analysis.nextActions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Recommended Next Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analysis.nextActions.map((action, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <Badge variant="secondary" className="mt-0.5">{index + 1}</Badge>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
