
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { TrendingUp, TrendingDown, Shield, AlertTriangle, RefreshCw } from 'lucide-react';

interface CreditScore {
  id: string;
  score: number;
  riskLevel: string;
  creditLimit: number;
  availableCredit: number;
  lastUpdated: string;
}

export function CreditScoreCard() {
  const [creditScore, setCreditScore] = useState<CreditScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchCreditScore();
  }, []);

  const fetchCreditScore = async () => {
    try {
      const response = await fetch('/api/credit-scoring/score');
      if (response.ok) {
        const data = await response.json();
        setCreditScore(data.creditScore);
      }
    } catch (error) {
      console.error('Failed to fetch credit score:', error);
      toast.error('Failed to load credit score');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const response = await fetch('/api/credit-scoring/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (response.ok) {
        toast.success('Credit score updated');
        fetchCreditScore();
      } else {
        toast.error('Failed to refresh credit score');
      }
    } catch (error) {
      console.error('Error refreshing score:', error);
      toast.error('Failed to refresh credit score');
    } finally {
      setRefreshing(false);
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'LOW':
        return 'bg-green-500';
      case 'MEDIUM':
        return 'bg-yellow-500';
      case 'HIGH':
        return 'bg-orange-500';
      case 'CRITICAL':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getRiskBadgeVariant = (risk: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (risk) {
      case 'LOW':
        return 'default';
      case 'MEDIUM':
        return 'secondary';
      case 'HIGH':
      case 'CRITICAL':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 750) return 'text-green-600';
    if (score >= 650) return 'text-yellow-600';
    if (score >= 550) return 'text-orange-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">Loading credit score...</div>
        </CardContent>
      </Card>
    );
  }

  if (!creditScore) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            AI Trust Score
          </CardTitle>
          <CardDescription>No credit score available</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-muted-foreground mb-4">Your credit score has not been calculated yet.</p>
            <Button onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Calculate Score
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const creditUtilization = ((creditScore.creditLimit - creditScore.availableCredit) / creditScore.creditLimit) * 100;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              AI Trust Score
            </CardTitle>
            <CardDescription>
              Last updated: {new Date(creditScore.lastUpdated).toLocaleDateString()}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Credit Score */}
        <div className="text-center">
          <div className={`text-6xl font-bold ${getScoreColor(creditScore.score)}`}>
            {creditScore.score}
          </div>
          <p className="text-muted-foreground mt-2">Credit Score</p>
          <Badge variant={getRiskBadgeVariant(creditScore.riskLevel)} className="mt-2">
            {creditScore.riskLevel} RISK
          </Badge>
        </div>

        {/* Score Visualization */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Poor (300)</span>
            <span>Excellent (850)</span>
          </div>
          <Progress value={(creditScore.score / 850) * 100} className="h-3" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>300</span>
            <span>500</span>
            <span>650</span>
            <span>750</span>
            <span>850</span>
          </div>
        </div>

        {/* Credit Limit */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Credit Limit</p>
            <p className="text-2xl font-bold">
              ${creditScore.creditLimit.toLocaleString()}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Available Credit</p>
            <p className="text-2xl font-bold text-green-600">
              ${creditScore.availableCredit.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Credit Utilization */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Credit Utilization</span>
            <span className="font-medium">{creditUtilization.toFixed(1)}%</span>
          </div>
          <Progress value={creditUtilization} className="h-2" />
          {creditUtilization > 30 && (
            <div className="flex items-center gap-2 text-sm text-orange-600">
              <AlertTriangle className="h-4 w-4" />
              <span>High utilization may affect your score</span>
            </div>
          )}
        </div>

        {/* Risk Factors */}
        <div className="rounded-lg border p-4 space-y-2">
          <h4 className="font-semibold text-sm">Risk Assessment</h4>
          <div className="space-y-2">
            {creditScore.score >= 700 && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <TrendingUp className="h-4 w-4" />
                <span>Excellent payment history</span>
              </div>
            )}
            {creditScore.score < 600 && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <TrendingDown className="h-4 w-4" />
                <span>Improve payment consistency</span>
              </div>
            )}
            {creditUtilization > 50 && (
              <div className="flex items-center gap-2 text-sm text-orange-600">
                <AlertTriangle className="h-4 w-4" />
                <span>Reduce credit utilization below 30%</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
