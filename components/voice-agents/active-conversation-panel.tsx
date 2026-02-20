'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Mic, MicOff, PhoneOff, Volume2, FileText, Clock, CheckCircle2, Activity,
} from 'lucide-react';

interface TranscriptMessage {
  role: 'agent' | 'user';
  message: string;
  timestamp: number;
}

interface KnowledgeBaseReference {
  documentName: string;
  relevance: number;
}

interface ActiveConversationPanelProps {
  isSpeaking: boolean;
  isListening: boolean;
  duration: number;
  progressPercentage: number;
  transcript: TranscriptMessage[];
  knowledgeBaseRefs: KnowledgeBaseReference[];
  onEndConversation: () => void;
  formatTime: (seconds: number) => string;
}

export function ActiveConversationPanel({
  isSpeaking,
  isListening,
  duration,
  progressPercentage,
  transcript,
  knowledgeBaseRefs,
  onEndConversation,
  formatTime,
}: ActiveConversationPanelProps) {
  return (
    <>
      {/* Status Bar */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-300 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                  isSpeaking ? 'bg-green-100 animate-pulse' :
                  isListening ? 'bg-purple-100' :
                  'bg-gray-200'
                }`}>
                  {isSpeaking ? (
                    <Volume2 className="h-8 w-8 text-green-600" />
                  ) : isListening ? (
                    <Mic className="h-8 w-8 text-purple-600 animate-pulse" />
                  ) : (
                    <MicOff className="h-8 w-8 text-gray-500" />
                  )}
                </div>
                {(isSpeaking || isListening) && (
                  <div className="absolute -top-1 -right-1">
                    <Activity className="h-6 w-6 text-red-500 animate-pulse" />
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-100 text-green-700 border-green-300">
                    <CheckCircle2 className="mr-1 h-3 w-3" /> Connected
                  </Badge>
                  {isSpeaking && (
                    <Badge className="bg-green-100 text-green-700 border-green-300">Agent Speaking</Badge>
                  )}
                  {isListening && !isSpeaking && (
                    <Badge className="bg-purple-100 text-purple-700 border-purple-300">Listening</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 text-sm text-gray-700">
                  <Clock className="h-4 w-4" />
                  {formatTime(duration)} / 10:00
                </div>
              </div>
            </div>

            <Button variant="destructive" size="lg" onClick={onEndConversation}>
              <PhoneOff className="mr-2 h-5 w-5" /> End Call
            </Button>
          </div>
          <Progress value={progressPercentage} className="mt-4 h-2" />
        </CardContent>
      </Card>

      {/* Transcript */}
      <Card className="bg-white border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <FileText className="h-5 w-5 text-purple-600" /> Live Transcript
          </CardTitle>
          <CardDescription className="text-gray-600">Real-time conversation transcript</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {transcript.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Transcript will appear here as you speak...</p>
            ) : (
              transcript.map((msg, idx) => (
                <div key={idx} className={`p-3 rounded-lg ${msg.role === 'agent' ? 'bg-purple-50 border border-purple-200' : 'bg-blue-50 border border-blue-200'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className={msg.role === 'agent' ? 'bg-purple-100 text-purple-700 border-purple-300' : 'bg-blue-100 text-blue-700 border-blue-300'}>
                      {msg.role === 'agent' ? 'Agent' : 'You'}
                    </Badge>
                    <span className="text-xs text-gray-500">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-gray-900">{msg.message}</p>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Knowledge Base References */}
      {knowledgeBaseRefs.length > 0 && (
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <FileText className="h-5 w-5 text-green-600" /> Knowledge Base Documents Referenced
            </CardTitle>
            <CardDescription className="text-gray-600">Documents the agent used to answer your questions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {knowledgeBaseRefs.map((ref, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="text-gray-900">{ref.documentName}</span>
                  <Badge className="bg-green-100 text-green-700 border-green-300">{Math.round(ref.relevance * 100)}% relevant</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
