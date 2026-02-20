/**
 * Unified AI Brain Dashboard Page
 * Voice Assistant Mode + Analytical Dashboard Mode
 * Revolutionary business intelligence with voice and analytical capabilities
 */

'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Brain, BarChart3, Mic, RefreshCw, Loader2, FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import type { ComprehensiveBrainData } from '@/lib/ai-brain-enhanced-service';
import { CrmVisualizationPanel } from '@/components/business-ai/crm-visualization-panel';
import { VoiceAssistantTab } from '@/components/business-ai/voice-assistant-tab';
import { AnalyticalDashboardTab } from '@/components/business-ai/analytical-dashboard-tab';

interface GeneralInsight {
  id: string;
  type: 'opportunity' | 'risk' | 'trend' | 'action' | 'prediction';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  confidence: number;
  actionable: boolean;
  suggestedActions?: string[];
  affectedEntities?: { leads?: number; deals?: number; tasks?: number };
  metrics?: { current: number; target: number; unit: string };
  timestamp: string;
}

interface PredictiveAnalytics {
  nextWeekForecast: { newLeads: { predicted: number; confidence: number }; dealConversions: { predicted: number; confidence: number }; revenue: { predicted: number; confidence: number; currency: string } };
  nextMonthForecast: { newLeads: { predicted: number; confidence: number }; dealConversions: { predicted: number; confidence: number }; revenue: { predicted: number; confidence: number; currency: string } };
  growthTrend: 'accelerating' | 'steady' | 'declining' | 'volatile';
  seasonalPatterns: string[];
}

interface WorkflowRecommendation {
  id: string;
  name: string;
  description: string;
  trigger: string;
  actions: string[];
  expectedImpact: string;
  automatable: boolean;
  priority: 'high' | 'medium' | 'low';
}

function BusinessAIPageContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [mode, setMode] = useState<'voice' | 'dashboard' | 'reports'>(() => {
    const modeParam = searchParams?.get('mode');
    if (modeParam === 'reports') return 'reports';
    return modeParam === 'dashboard' ? 'dashboard' : 'voice';
  });
  
  // Voice Assistant Mode State
  const [healthScore, setHealthScore] = useState<any>(null);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [crmAgentId, setCrmAgentId] = useState<string | null>(null);
  const [agentLoading, setAgentLoading] = useState(true);
  
  // Visualization state for voice agent queries
  const [crmStatistics, setCrmStatistics] = useState<any>(null);
  const [showVisualizations, setShowVisualizations] = useState(false);
  const [conversationMessages, setConversationMessages] = useState<any[]>([]);
  
  useEffect(() => {
    if (crmStatistics) {
      console.log('📊 [AI Brain Page] CRM Statistics updated:', crmStatistics);
      console.log('📊 [AI Brain Page] Show visualizations:', showVisualizations);
    }
  }, [crmStatistics, showVisualizations]);
  
  useEffect(() => {
    const handleVisualizationUpdate = (event: CustomEvent) => {
      console.log('📊 [AI Brain Page] Received visualization update:', event.detail);
      console.log('📊 [AI Brain Page] Statistics data:', event.detail?.statistics);
      if (event.detail?.statistics) {
        console.log('✅ [AI Brain Page] Setting statistics and showing visualizations');
        setCrmStatistics(event.detail.statistics);
        setShowVisualizations(true);
        setTimeout(() => {
          const visualizationElement = document.querySelector('[data-visualization-section]');
          if (visualizationElement) {
            visualizationElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      } else {
        console.warn('⚠️ [AI Brain Page] Event received but no statistics in detail:', event.detail);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('ai-brain-visualization-update', handleVisualizationUpdate as EventListener);
      return () => {
        window.removeEventListener('ai-brain-visualization-update', handleVisualizationUpdate as EventListener);
      };
    }
  }, []);
  
  // Analytical Dashboard Mode State
  const [comprehensiveData, setComprehensiveData] = useState<ComprehensiveBrainData | null>(null);
  const [detailedInsights, setDetailedInsights] = useState<GeneralInsight[]>([]);
  const [enhancedPredictions, setEnhancedPredictions] = useState<PredictiveAnalytics | null>(null);
  const [workflowRecommendations, setWorkflowRecommendations] = useState<WorkflowRecommendation[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams?.get('mode') === 'reports') {
      router.push('/dashboard/reports');
      return;
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (session) {
      if (mode === 'voice') {
        loadBusinessData();
        fetch('/api/crm-voice-agent/functions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ function_name: 'get_statistics', parameters: {} }),
        })
          .then((r) => r.ok ? r.json() : null)
          .then((data) => {
            if (data?.success && data?.statistics) {
              setCrmStatistics(data.statistics);
              setShowVisualizations(true);
            }
          })
          .catch(() => {});
        setAgentLoading(false);
      } else {
        loadAnalyticalDashboardData();
      }
    }
  }, [session, mode]);

  const loadBusinessData = async () => {
    try {
      const response = await fetch('/api/business-ai/health');
      if (response.ok) {
        const data = await response.json();
        setHealthScore(data.healthScore);
        setPredictions(data.predictions || []);
        setInsights(data.insights || []);
      }
    } catch (error) {
      console.error('Error loading business data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalyticalDashboardData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [brainRes, insightsRes, predictionsRes, workflowRes] = await Promise.allSettled([
        fetch('/api/business-ai/comprehensive'),
        fetch('/api/business-ai/insights'),
        fetch('/api/business-ai/predictions'),
        fetch('/api/business-ai/workflow-recommendations'),
      ]);

      if (brainRes.status === 'fulfilled' && brainRes.value.ok) {
        const data = await brainRes.value.json();
        setComprehensiveData(data);
      }
      if (insightsRes.status === 'fulfilled' && insightsRes.value.ok) {
        const data = await insightsRes.value.json();
        setDetailedInsights(data.insights || []);
      }
      if (predictionsRes.status === 'fulfilled' && predictionsRes.value.ok) {
        const data = await predictionsRes.value.json();
        setEnhancedPredictions(data);
      }
      if (workflowRes.status === 'fulfilled' && workflowRes.value.ok) {
        const data = await workflowRes.value.json();
        setWorkflowRecommendations(data.recommendations || []);
      }
    } catch (error) {
      console.error('Error loading analytical dashboard data:', error);
      toast.error('Failed to load analytical data');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (mode === 'dashboard') {
      const interval = setInterval(() => {
        loadAnalyticalDashboardData();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [mode, loadAnalyticalDashboardData]);

  if (loading && !healthScore && !comprehensiveData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading AI Brain...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50/50 via-white to-pink-50/50 relative overflow-hidden">
      {/* Animated background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-400/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-3 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 bg-clip-text text-transparent drop-shadow-sm">
              <Brain className="h-10 w-10 text-purple-600 animate-pulse" />
              AI Brain Intelligence
            </h1>
            <p className="text-gray-600 mt-2 text-lg">
              {mode === 'voice' 
                ? 'Your revolutionary business brain - Ask anything, get instant insights'
                : 'Comprehensive analytical dashboard - Deep insights and predictions'
              }
            </p>
          </div>
          <div className="flex items-center gap-3">
            {mode === 'dashboard' && (
              <Button onClick={loadAnalyticalDashboardData} disabled={isRefreshing} variant="outline" size="sm" className="bg-white/80 backdrop-blur-sm border-purple-200">
                {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Refresh
              </Button>
            )}
          </div>
        </div>

        {/* CRM Statistics Visualizations */}
        {showVisualizations && crmStatistics && (
          <CrmVisualizationPanel
            crmStatistics={crmStatistics}
            onClose={() => { setShowVisualizations(false); setCrmStatistics(null); }}
          />
        )}

        {/* Mode Tabs */}
        <Tabs value={mode} onValueChange={(value) => {
          if (value === 'reports') { router.push('/dashboard/reports'); return; }
          setMode(value as 'voice' | 'dashboard');
        }} className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-3 bg-white/80 backdrop-blur-sm border-purple-200">
            <TabsTrigger value="voice" className="gap-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <Mic className="h-4 w-4" /> Forecasts
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="gap-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <BarChart3 className="h-4 w-4" /> Analytical Dashboard
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <FileText className="h-4 w-4" /> Reports
            </TabsTrigger>
          </TabsList>

          <TabsContent value="voice" className="space-y-6 mt-6">
            <VoiceAssistantTab
              healthScore={healthScore}
              predictions={predictions}
              insights={insights}
            />
          </TabsContent>

          <TabsContent value="dashboard" className="space-y-6 mt-6">
            <AnalyticalDashboardTab
              comprehensiveData={comprehensiveData}
              detailedInsights={detailedInsights}
              enhancedPredictions={enhancedPredictions}
              workflowRecommendations={workflowRecommendations}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default function BusinessAIPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600" />
        </div>
      }
    >
      <BusinessAIPageContent />
    </Suspense>
  );
}
