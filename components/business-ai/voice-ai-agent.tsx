/**
 * Revolutionary Business AI Voice Agent Component
 * Animated, intelligent business intelligence assistant
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX,
  Brain,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
  Minimize2,
  Maximize2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChartVisualization } from './chart-visualization';

interface VoiceAIAgentProps {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center';
  onQuery?: (query: string) => void;
  onResponse?: (response: any) => void;
}

type AgentState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'displaying';

export function VoiceAIAgent({ 
  position = 'bottom-right',
  onQuery,
  onResponse,
}: VoiceAIAgentProps) {
  const [state, setState] = useState<AgentState>('idle');
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [healthScore, setHealthScore] = useState<number | null>(null);
  const [currentResponse, setCurrentResponse] = useState<string>('');
  const [visualization, setVisualization] = useState<any>(null);
  const [isListening, setIsListening] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        handleQuery(transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setState('idle');
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        if (state === 'listening') {
          setState('thinking');
        }
      };
    }

    // Load initial health score
    loadHealthScore();

    // Listen for custom query events
    const handleCustomQuery = (event: CustomEvent) => {
      if (event.detail?.query) {
        handleQuery(event.detail.query);
      }
    };

    window.addEventListener('business-ai-query', handleCustomQuery as EventListener);

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      window.removeEventListener('business-ai-query', handleCustomQuery as EventListener);
    };
  }, []);

  const loadHealthScore = async () => {
    try {
      const response = await fetch('/api/business-ai/health');
      if (response.ok) {
        const data = await response.json();
        setHealthScore(data.healthScore?.overall || null);
      }
    } catch (error) {
      console.error('Failed to load health score:', error);
    }
  };

  const handleQuery = async (query: string) => {
    setState('thinking');
    setCurrentResponse('');
    setVisualization(null);

    if (onQuery) {
      onQuery(query);
    }

    try {
      const response = await fetch('/api/business-ai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentResponse(data.response);
        setVisualization(data.visualization);
        
        if (onResponse) {
          onResponse(data);
        }

        // Speak response if not muted
        if (!isMuted && data.response) {
          await speakResponse(data.response);
        } else {
          setState('displaying');
        }
      }
    } catch (error) {
      console.error('Query error:', error);
      setState('idle');
    }
  };

  const speakResponse = async (text: string) => {
    setState('speaking');
    
    try {
      // Try ElevenLabs first for better quality
      try {
        const response = await fetch('/api/business-ai/voice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.audioUrl) {
            const audio = new Audio(data.audioUrl);
            audio.onended = () => {
              setState('displaying');
            };
            audio.onerror = () => {
              // Fallback to Web Speech API
              fallbackTTS(text);
            };
            audio.play();
            return;
          }
        }
      } catch (error) {
        console.log('ElevenLabs TTS not available, using fallback');
      }

      // Fallback to Web Speech API
      fallbackTTS(text);
    } catch (error) {
      console.error('TTS error:', error);
      setState('displaying');
    }
  };

  const fallbackTTS = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;

      utterance.onend = () => {
        setState('displaying');
      };

      utterance.onerror = () => {
        setState('displaying');
      };

      window.speechSynthesis.speak(utterance);
    } else {
      setState('displaying');
    }
  };

  const startListening = () => {
    if (recognitionRef.current && state === 'idle') {
      setIsListening(true);
      setState('listening');
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      setState('idle');
    }
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'top-right':
        return 'top-4 right-4';
      case 'top-left':
        return 'top-4 left-4';
      case 'center':
        return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
      default:
        return 'bottom-4 right-4';
    }
  };

  const getHealthColor = (score: number | null) => {
    if (score === null) return 'bg-gray-500';
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getHealthEmoji = (score: number | null) => {
    if (score === null) return '🤖';
    if (score >= 80) return '🟢';
    if (score >= 60) return '🟡';
    return '🔴';
  };

  if (isMinimized) {
    return (
      <div className={cn('fixed z-50', getPositionClasses())}>
        <Button
          onClick={() => setIsMinimized(false)}
          className="rounded-full w-16 h-16 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 shadow-lg"
          size="icon"
        >
          <Brain className="h-6 w-6 text-white" />
          {healthScore !== null && (
            <div className={cn(
              'absolute -top-1 -right-1 w-4 h-4 rounded-full',
              getHealthColor(healthScore)
            )} />
          )}
        </Button>
      </div>
    );
  }

  return (
    <Card className={cn(
      'fixed z-50 w-96 shadow-2xl border-2 transition-all duration-300',
      getPositionClasses(),
      state === 'displaying' && visualization ? 'w-[600px]' : 'w-96',
      'bg-white/95 backdrop-blur-sm'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-purple-600 to-purple-500">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Brain className="h-6 w-6 text-white animate-pulse" />
            {healthScore !== null && (
              <div className={cn(
                'absolute -top-1 -right-1 w-3 h-3 rounded-full',
                getHealthColor(healthScore)
              )} />
            )}
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">AI Brain</h3>
            {healthScore !== null && (
              <p className="text-white/80 text-xs">
                Health: {healthScore}/100 {getHealthEmoji(healthScore)}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20"
            onClick={() => setIsMuted(!isMuted)}
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20"
            onClick={() => setIsMinimized(true)}
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
        {/* State indicator */}
        {state === 'idle' && (
          <div className="text-center py-8">
            <div className="mb-4">
              <Brain className="h-16 w-16 mx-auto text-purple-500 animate-pulse" />
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Ask me anything about your business
            </p>
            <Button
              onClick={startListening}
              className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white rounded-full"
              size="lg"
            >
              <Mic className="h-5 w-5 mr-2" />
              Start Listening
            </Button>
          </div>
        )}

        {state === 'listening' && (
          <div className="text-center py-8">
            <div className="mb-4 relative">
              <Mic className="h-16 w-16 mx-auto text-red-500 animate-pulse" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 border-4 border-red-500 rounded-full animate-ping opacity-75" />
              </div>
            </div>
            <p className="text-gray-600 text-sm animate-pulse">
              Listening...
            </p>
            <Button
              onClick={stopListening}
              variant="outline"
              className="mt-4"
              size="sm"
            >
              Stop
            </Button>
          </div>
        )}

        {state === 'thinking' && (
          <div className="text-center py-8">
            <Loader2 className="h-16 w-16 mx-auto text-purple-500 animate-spin" />
            <p className="text-gray-600 text-sm mt-4">
              Analyzing your business data...
            </p>
          </div>
        )}

        {state === 'speaking' && (
          <div className="text-center py-8">
            <Volume2 className="h-16 w-16 mx-auto text-purple-500 animate-pulse" />
            <p className="text-gray-600 text-sm mt-4">
              Speaking...
            </p>
          </div>
        )}

        {state === 'displaying' && currentResponse && (
          <div className="space-y-4">
            <div className="bg-purple-50 rounded-lg p-4">
              <p className="text-gray-800 text-sm leading-relaxed">
                {currentResponse}
              </p>
            </div>

            {visualization && (
              <div className="border rounded-lg p-4">
                {visualization.type === 'score' && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm">Business Health Score</h4>
                    <div className="flex items-center gap-4">
                      <div className="text-4xl font-bold text-purple-600">
                        {visualization.value}
                      </div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full transition-all duration-500',
                              visualization.value >= 80 ? 'bg-green-500' :
                              visualization.value >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                            )}
                            style={{ width: `${visualization.value}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    {visualization.breakdown && (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>Revenue: {visualization.breakdown.revenue}</div>
                        <div>Pipeline: {visualization.breakdown.pipeline}</div>
                        <div>Customers: {visualization.breakdown.customers}</div>
                        <div>Operations: {visualization.breakdown.operations}</div>
                      </div>
                    )}
                  </div>
                )}

                {visualization.type === 'chart' && visualization.data && (
                  <ChartVisualization
                    type={visualization.chartType || 'line'}
                    data={visualization.data}
                    title={visualization.data.datasets[0]?.label || 'Chart'}
                    current={visualization.current}
                    growth={visualization.growth}
                  />
                )}
              </div>
            )}

            <Button
              onClick={startListening}
              className="w-full bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white"
              size="sm"
            >
              <Mic className="h-4 w-4 mr-2" />
              Ask Another Question
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
